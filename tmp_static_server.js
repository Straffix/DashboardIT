const http = require('http')
const fs = require('fs')
const path = require('path')

const root = process.cwd()
const port = Number(process.env.PORT || 4173)

const mimeTypes = {
	'.css': 'text/css; charset=utf-8',
	'.gif': 'image/gif',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.jpeg': 'image/jpeg',
	'.jpg': 'image/jpeg',
	'.js': 'application/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.ttf': 'font/ttf',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
}

const normalizeRequestPath = requestUrl => {
	const rawPath = decodeURIComponent(String(requestUrl || '/').split('?')[0] || '/')
	if (rawPath === '/') return path.join(root, 'tmp_hires_animation_check.html')
	return path.join(root, rawPath.replace(/^\/+/, ''))
}

const server = http.createServer((request, response) => {
	const requestedPath = normalizeRequestPath(request.url)
	if (!requestedPath.startsWith(root)) {
		response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
		response.end('Forbidden')
		return
	}

	fs.stat(requestedPath, (statError, stats) => {
		if (statError || !stats.isFile()) {
			response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
			response.end('Not found')
			return
		}

		const extension = path.extname(requestedPath).toLowerCase()
		response.writeHead(200, {
			'Cache-Control': 'no-store',
			'Content-Type': mimeTypes[extension] || 'application/octet-stream',
		})

		fs.createReadStream(requestedPath).pipe(response)
	})
})

server.listen(port, '127.0.0.1', () => {
	process.stdout.write(`LISTENING:${port}`)
})
