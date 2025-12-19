const https = require('https')
const http = require('http')
const fs = require('fs')
const httpProxy = require('http-proxy')

const useHttp =
	process.env.PROXY_PROTOCOL === 'http' || process.argv.includes('--http')
const protocol = useHttp ? 'http' : 'https'
const port = 2999

// Function to get domain from brand configuration
function getBrandDomain() {
	try {
		const fs = require('fs')
		const path = require('path')
		const brandConfigPath = path.join(__dirname, 'packages/config/brand.ts')

		if (!fs.existsSync(brandConfigPath)) {
			console.log('⚠️  Brand config not found, using default domain')
			return 'epic-stack.me'
		}

		const brandContent = fs.readFileSync(brandConfigPath, 'utf-8')

		// Extract brand name from the config
		const nameMatch = brandContent.match(/name:\s*'([^']+)'/)
		if (!nameMatch) {
			console.log('⚠️  Could not parse brand name, using default domain')
			return 'epic-stack.me'
		}

		const brandName = nameMatch[1]
		// Convert brand name to domain format (lowercase, replace spaces with hyphens)
		const domainName = brandName.toLowerCase().replace(/\s+/g, '-')
		return `${domainName}.me`
	} catch (error) {
		console.log(`⚠️  Error reading brand config: ${error.message}`)
		return 'epic-stack.me'
	}
}

const domain = getBrandDomain()

// Target mappings
const targets = {
	[`${domain}:${port}`]: 'http://localhost:3002',
	[`app.${domain}:${port}`]: 'http://localhost:3001',
	[`studio.${domain}:${port}`]: 'http://localhost:3003',
	[`docs.${domain}:${port}`]: 'http://localhost:3004',
	[`admin.${domain}:${port}`]: 'http://localhost:3005',
	[`cms.${domain}:${port}`]: 'http://localhost:3006',
	[`api.${domain}:${port}`]: 'http://localhost:3007',
}

const proxy = httpProxy.createProxyServer({
	ws: true,
	xfwd: true,
})

// Request handler
function requestHandler(req, res) {
	const host = req.headers.host
	const target = targets[host]

	if (target) {
		req.headers['x-forwarded-proto'] = protocol
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
}

// WebSocket upgrade handler
function upgradeHandler(req, socket, head) {
	const host = req.headers.host
	const target = targets[host]
	if (target) {
		proxy.ws(req, socket, head, { target })
	} else {
		socket.destroy()
	}
}

// Create server based on protocol
let server
if (useHttp) {
	server = http.createServer(requestHandler)
} else {
	const sslOptions = {
		key: fs.readFileSync('./other/ssl/_wildcard.domain.me+2-key.pem'),
		cert: fs.readFileSync('./other/ssl/_wildcard.domain.me+2.pem'),
	}
	server = https.createServer(sslOptions, requestHandler)
}

server.on('upgrade', upgradeHandler)

server.listen(port, '127.0.0.1', () => {
	console.log(`HTTPS Reverse proxy listening on port ${port}`)
})
