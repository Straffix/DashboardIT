const http = require('http')
const fs = require('fs')
const path = require('path')

const host = '127.0.0.1'
const port = Number(process.env.PORT || 4173)
const rootDir = path.resolve(__dirname, '..')

const mimeTypes = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.jpeg': 'image/jpeg',
	'.jpg': 'image/jpeg',
	'.js': 'application/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
	'.webmanifest': 'application/manifest+json; charset=utf-8',
}

const resolveRequestPath = requestUrl => {
	const requestPath = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname)
	const safePath = path
		.normalize(requestPath)
		.replace(/^[/\\]+/, '')
		.replace(/^(\.\.[/\\])+/, '')
	const fullPath = path.join(rootDir, safePath)
	return fullPath.startsWith(rootDir) ? fullPath : rootDir
}

const sendFile = (response, filePath) => {
	fs.readFile(filePath, (error, fileBuffer) => {
		if (error) {
			response.writeHead(error.code === 'ENOENT' ? 404 : 500, {
				'Content-Type': 'text/plain; charset=utf-8',
			})
			response.end(error.code === 'ENOENT' ? '404 Not Found' : '500 Internal Server Error')
			return
		}

		const extension = path.extname(filePath).toLowerCase()
		response.writeHead(200, {
			'Cache-Control': 'no-cache',
			'Content-Type': mimeTypes[extension] || 'application/octet-stream',
		})
		response.end(fileBuffer)
	})
}

const server = http.createServer((request, response) => {
	let targetPath = resolveRequestPath(request.url || '/')

	fs.stat(targetPath, (error, stats) => {
		if (!error && stats.isDirectory()) {
			targetPath = path.join(targetPath, 'index.html')
		}

		sendFile(response, targetPath)
	})
})

server.listen(port, host, () => {
	console.log(`DashboardIT local server: http://${host}:${port}`)
})
