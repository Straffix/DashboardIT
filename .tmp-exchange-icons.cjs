const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { spawn } = require('node:child_process')
const assert = require('node:assert/strict')

const root = __dirname
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-exchange-icons-'))
const user = { id: 'fixture-user', fullName: 'Test User', login: 'fixture', role: 'user', avatarId: 'amber' }
const accessories = ['mouse', 'vertical-mouse', 'keyboard', 'headset', 'monitor', 'bag', 'backpack', 'pointer', 'printer', 'laptop-pad']
const records = [
  { name: 'ACTIVE FIXTURE', plannedDate: '2026-07-16', oldSn: 'PF010141', newSn: 'PW2291924', status: 'pending', accessories },
  { name: 'DONE FIXTURE', plannedDate: '2026-07-17', oldSn: 'PF010142', newSn: 'PW2291925', status: 'done', accessories },
  { name: 'EMPTY FIXTURE', plannedDate: '2026-07-18', oldSn: '', newSn: '', status: 'pending', accessories: [] },
].map(record => ({ ...record, createdAt: '2026-07-06T10:00:00Z', updatedAt: '2026-07-06T10:00:00Z', createdBy: user, updatedBy: user }))
const seed = `window.DashboardRuntimeConfig = { storageMode: 'local', liveServerBrowserFallback: { resetVersion: '' }, oneTimeAccountCleanup: { version: '' } };
localStorage.clear();
localStorage.setItem('dashboard_users', ${JSON.stringify(JSON.stringify([user]))});
localStorage.setItem('dashboard_user_session', ${JSON.stringify(JSON.stringify({ userId: user.id }))});
localStorage.setItem('wymiana_sprzetu_dane', ${JSON.stringify(JSON.stringify(records))});`
const scripts = ['js/shared/base.js', 'js/shared/runtime-config.js', 'js/core/storage-service.js', 'js/shared/auth.js', 'js/shared/public-api.js', 'js/shared/global-ui.js', 'js/pages/exchanges/index.js']
let html = fs.readFileSync(path.join(root, 'wymiana_sprzetu.html'), 'utf8')
html = html.replace('<head>', `<head><base href="${pathToFileURL(root + path.sep).href}">`)
html = html.replace('<script src="./js/script.js" charset="utf-8"></script>', `<script>${seed}</script>${scripts.map(src => `<script src="${src}"></script>`).join('')}`)
const fixture = path.join(temp, 'fixture.html')
fs.writeFileSync(fixture, html)
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe', `--user-data-dir=${path.join(temp, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] })
let seq = 0
let buffer = ''
const pending = new Map()
const exceptions = []
chrome.stdio[4].on('data', chunk => {
  buffer += chunk.toString()
  let delimiter
  while ((delimiter = buffer.indexOf('\0')) !== -1) {
    const message = JSON.parse(buffer.slice(0, delimiter))
    buffer = buffer.slice(delimiter + 1)
    if (message.id) {
      const handlers = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) handlers?.reject(new Error(JSON.stringify(message.error)))
      else handlers?.resolve(message.result)
    } else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text)
  }
})
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++seq
  pending.set(id, { resolve, reject })
  chrome.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0')
})
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

;(async () => {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const call = (method, params) => send(method, params, sessionId)
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  await call('Runtime.enable')
  await call('Page.enable')
  await call('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false })
  await call('Page.navigate', { url: pathToFileURL(fixture).href })
  for (let i = 0; i < 50; i++) {
    if (await evaluate(`document.querySelectorAll('#table-body > tr').length === 3`)) break
    await pause(100)
  }
  assert.equal(await evaluate(`document.querySelectorAll('#table-body > tr').length`), 3)
  for (const width of [1920, 1366, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 640 })
    for (const theme of ['light', 'dark', 'blush']) {
      await evaluate(`document.body.classList.remove('theme-dark', 'theme-blush'); document.documentElement.classList.remove('theme-dark', 'theme-blush'); if (${JSON.stringify(theme)} !== 'light') document.body.classList.add('theme-' + ${JSON.stringify(theme)});`)
      await pause(380)
      const result = await evaluate(`(() => {
        const rows = [...document.querySelectorAll('#table-body > tr')];
        const issues = [];
        const rgb = value => value.match(/[\\d.]+/g).slice(0,3).map(Number);
        const luminance = color => rgb(color).map(c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4 }).reduce((s,c,i) => s+c*[.2126,.7152,.0722][i],0);
        const contrast = (a,b) => { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05) };
        rows.slice(0,2).forEach((row,rowIndex) => {
          const cell = row.querySelector('td.col-acc'); const bounds = cell.getBoundingClientRect();
          const items = [...cell.querySelectorAll('.exchange-accessory-preview')];
          if (items.length !== 10 || cell.querySelector('.acc-more-badge')) issues.push('Missing accessories '+rowIndex);
          items.forEach(item => {
            const icon = item.querySelector('i'); const label = item.querySelector('small'); const style = getComputedStyle(icon); const box = item.getBoundingClientRect();
            if (!label.textContent.trim()) issues.push('Missing label');
            if (style.backgroundColor !== style.color || parseFloat(style.fontSize) < 24 || style.maskImage === 'none') issues.push('Icon color/size/mask');
            if (box.left < bounds.left || box.right > bounds.right + 1) issues.push('Cell overflow');
            const iconBox = icon.getBoundingClientRect(), labelBox = label.getBoundingClientRect();
            if (labelBox.top < iconBox.bottom || labelBox.bottom > box.bottom + 1) issues.push('Overlapping label');
          });
        });
        if (rows[2].querySelector('td.col-acc').textContent.trim() !== 'brak') issues.push('Empty state');
        const style = getComputedStyle(rows[0].querySelector('.exchange-accessory-preview i'));
        const background = ${JSON.stringify(theme)} === 'dark' ? 'rgb(53,59,66)' : 'rgb(255,255,255)';
        const ratio = contrast(style.color, background);
        if (ratio < 3) issues.push('Low contrast '+ratio);
        return { issues, iconColor: style.color, contrast: Number(ratio.toFixed(2)), columns: getComputedStyle(rows[0].querySelector('.exchange-accessories')).gridTemplateColumns, rowHeight: rows[0].getBoundingClientRect().height, documentOverflow: document.documentElement.scrollWidth > innerWidth };
      })()`)
      assert.deepEqual(result.issues, [], `${width}/${theme}: ${JSON.stringify(result)}`)
      assert.equal(result.documentOverflow, false, `${width}/${theme}: page overflow`)
      console.log(`${width}/${theme}: ${JSON.stringify(result)}`)
      if (width === 1366 && theme === 'light') {
        const screenshot = await call('Page.captureScreenshot', { format: 'png' })
        fs.writeFileSync(path.join(temp, 'preview.png'), Buffer.from(screenshot.data, 'base64'))
      }
    }
  }
  await evaluate(`document.querySelector('[data-action="edit"][data-index="0"]').click()`)
  assert.equal(await evaluate(`document.querySelectorAll('#accessory-picker .accessory-item.active').length`), 10)
  assert.equal(await evaluate(`document.getElementById('exchange-drawer-shell').classList.contains('is-open')`), true)
  assert.deepEqual(exceptions, [])
  console.log('Edit retains all 10 selections; no runtime exceptions.')
  console.log('Preview: ' + path.join(temp, 'preview.png'))
  await send('Browser.close')
})().catch(error => { console.error(error); chrome.kill(); process.exitCode = 1 })
