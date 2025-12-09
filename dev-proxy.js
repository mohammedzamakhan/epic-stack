const https = require('https')
const fs = require('fs')
const httpProxy = require('http-proxy')

const sslOptions = {
	key: fs.readFileSync('./other/ssl/_wildcard.domain.me+2-key.pem'),
	cert: fs.readFileSync('./other/ssl/_wildcard.domain.me+2.pem'),
}

const proxy = httpProxy.createProxyServer({
	ws: true,
	xfwd: true,
})

const domain = 'epic-stack.me'

const targets = {
	[`${domain}:2999`]: 'http://localhost:3002',
	[`app.${domain}:2999`]: 'http://localhost:3001',
	[`studio.${domain}:2999`]: 'http://localhost:3003',
	[`docs.${domain}:2999`]: 'http://localhost:3004',
	[`admin.${domain}:2999`]: 'http://localhost:3005',
	[`cms.${domain}:2999`]: 'http://localhost:3006',
	[`api.${domain}:2999`]: 'http://localhost:3007',
}

const server = https.createServer(sslOptions, (req, res) => {
	const host = req.headers.host
	const target = targets[host]

	if (target) {
		req.headers['x-forwarded-proto'] = 'https'
		req.headers['x-forwarded-host'] = host
		proxy.web(req, res, { target }, (err) => {
			console.error('Proxy error:', err)
			res.writeHead(500, { 'Content-Type': 'text/plain' })
			res.end('Proxy error')
		})
	} else {
		res.writeHead(404, { 'Content-Type': 'text/plain' })
		res.end('Not Found')
	}
})

server.on('upgrade', function (req, socket, head) {
	const host = req.headers.host
	const target = targets[host]
	if (target) {
		proxy.ws(req, socket, head, { target })
	} else {
		socket.destroy()
	}
})

const port = 2999
server.listen(port, '127.0.0.1', () => {
	console.log(`HTTPS Reverse proxy listening on port ${port}`)
})
