import { useState, useEffect } from 'react'
import browser from 'webextension-polyfill'
import { Button } from './components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from './components/ui/card'
import contentScript from './content/index.tsx?script'

function App() {
	const [url, setUrl] = useState('')
	const [tabId, setTabId] = useState<number | null>(null)
	const [hasPermission, setHasPermission] = useState(false)

	useEffect(() => {
		const init = async () => {
			try {
				const tabs = await browser.tabs.query({
					active: true,
					currentWindow: true,
				})
				if (tabs[0] && tabs[0].id && tabs[0].url) {
					setTabId(tabs[0].id)
					const url = new URL(tabs[0].url)
					if (url.protocol === 'http:' || url.protocol === 'https:') {
						const hostname = url.hostname
						setUrl(hostname)
						const result = await browser.storage.local.get([hostname])
						if (result[hostname]) {
							setHasPermission(true)
						}
					} else {
						setUrl('This page is not supported.')
					}
				}
			} catch (error) {
				console.error(error)
				setUrl('Invalid URL.')
			}
		}
		void init()
	}, [])

	const handleAllow = async () => {
		if (!tabId || !url) return

		await browser.storage.local.set({ [url]: true })
		console.log(`Permission granted for ${url}`)
		await browser.scripting.executeScript({
			target: { tabId: tabId },
			files: [
				contentScript.startsWith('/') ? contentScript.slice(1) : contentScript,
			],
		})
		window.close()
	}

	const handleDisable = async () => {
		if (!url) return

		await browser.storage.local.remove([url])
		console.log(`Permission removed for ${url}`)
		setHasPermission(false)
	}

	return (
		<Card className="w-80 border-none shadow-none">
			<CardHeader>
				<CardTitle>Epic SaaS Extension</CardTitle>
				<CardDescription>Inject scripts with ease.</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground text-center text-sm">
					{hasPermission
						? 'Permission has been granted for:'
						: 'Grant permission to inject script on:'}
					<br />
					<span className="text-foreground font-semibold">{url}</span>
				</p>
			</CardContent>
			<CardFooter>
				{hasPermission ? (
					<Button
						variant="destructive"
						className="w-full"
						onClick={handleDisable}
					>
						Disable
					</Button>
				) : (
					<Button className="w-full" onClick={handleAllow}>
						Allow
					</Button>
				)}
			</CardFooter>
		</Card>
	)
}

export default App
