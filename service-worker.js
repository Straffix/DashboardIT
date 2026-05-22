/*
 * Root shim kept intentionally so the service worker can still control the whole app scope.
 * The actual implementation now lives in js/service-worker.js with the rest of the frontend code.
 */
importScripts('./js/service-worker.js')
