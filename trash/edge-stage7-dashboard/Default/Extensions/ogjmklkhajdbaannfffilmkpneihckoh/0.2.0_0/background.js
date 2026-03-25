// Inactivity period in minutes
const inactivityPeriod = 1;
// reconnect period in minutes
const reconnectPeriod = 1;

var port = null;
var should_reconnect = true;
var has_connected = false;

var source_type = null;

function _detect_browser(brand, platform) {
  brand = brand.toLowerCase()
  platform = platform.toLowerCase()

  if (brand.includes('firefox')) {
    return 'FIREFOX'
  }

  if (brand.includes('edg')) {
    return 'EDGE'
  }

  // On Windows, default to chrome
  // brand is 'chrom' to cover both 'chrome' and 'chromium' (for older chrome versions)
  if (platform.includes('win') || brand.includes('chrom')) {
    return 'CHROME'
  }

  return 'SAFARI'
}

// Iterate the brands since we can't trust browser developers to use
// brand[2] for the correct brand
function get_brand() {
  for (info of navigator.userAgentData.brands) {
    const brand = info.brand.toLowerCase()
    if (brand.includes('edg') || brand.includes('firefox')) {
        return brand
    }
  }

  return navigator.userAgentData.brands[2].brand
}

function detect_browser() {
  // If the browser supports Client Hints, use it to detect the browser
  if (navigator.userAgentData?.brands?.length > 2 && navigator.userAgentData?.platform) {
    return _detect_browser(get_brand(), navigator.userAgentData.platform)
  }

  // Otherwise, use the old userAgent
  return _detect_browser(navigator.userAgent, navigator.userAgent)
}

/*
  We use two alarms:
  - inactivityAlarm: to close the port to the native host after a period of inactivity
  - reconnectAlarm: to limit reconnection attempts to the native host after a failure
*/
function handle_alarms(alarm) {
  if (alarm.name === 'inactivityAlarm') {
    if (port != null) {
      port.disconnect();
      port = null;
    }
  }

  if (alarm.name === 'reconnectAlarm') {
    should_reconnect = true;
  }
}

function reset_inactivity_alarm() {
  chrome.alarms.clear('inactivityAlarm');
  chrome.alarms.create('inactivityAlarm', { delayInMinutes: inactivityPeriod });
}

function handle_native_response(response) {
  if ('error' in response) {
    // This most likely means that there was an error in the communiacation between the native host and the agent, and the agent isn't running
    console.log("Native host error: " + response.error);
    port.disconnect();
    handle_disconnect();
  }
  else if ('version' in response) {
    has_connected = true;
  }
}

function handle_disconnect() {
  if ((chrome.runtime.lastError != undefined) && ('message' in chrome.runtime.lastError)) {
    console.log("Connection error: " + chrome.runtime.lastError.message);
  }

  // If the connection failed there's a problem with the native host - try to reconnect
  // If disconnected after a successful connection, would reconnect on the next URL request
  port = null;
  // If the previous connection attempt failed, would wait a {reconnectPeriod} before trying to reconnect
  if (!has_connected) {
    chrome.alarms.create('reconnectAlarm', { delayInMinutes: reconnectPeriod });
    should_reconnect = false;
  }
  has_connected = false;
}

function handle_url_request(details) {
  if (source_type == null) {
    source_type = detect_browser();
  }

  if (port == null && should_reconnect) {
    create_port();
  }

  if (port != null) {
    // When (and if) the protocol changes native_host_protocol_version should be
    // checked here to determine the relevant JSON format to send to the native host.
    // Protocol version can be received from the native host by sending {message: "HELLO"}
    port.postMessage({url: details.url, source: source_type, method: details.method || ""});
    reset_inactivity_alarm();
  }
}

function send_hello() {
  if (port != null) {
    port.postMessage({message: "HELLO"});
  }
}

function create_port() {
  if (port == null) {
    try {
      port = chrome.runtime.connectNative('com.sentinelone.browser.extension.host');
      port.onMessage.addListener(handle_native_response);
      port.onDisconnect.addListener(handle_disconnect);
      // sending hello message to native host to validate the connection
      send_hello();
    }
    catch (e) {
      console.log("Failed to connect to native host: " + e);
      handle_disconnect();
    }
  }
}

chrome.alarms.create('inactivityAlarm', { delayInMinutes: inactivityPeriod });
chrome.alarms.onAlarm.addListener(handle_alarms);

chrome.webRequest.onBeforeRequest.addListener(handle_url_request,
  {urls: ["*://*/*"], types: ["main_frame", "sub_frame"]});
