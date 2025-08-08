import { useState, useEffect } from 'react'
import contentScript from './content?script'
import { Button } from './components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card'

function App() {
  const [url, setUrl] = useState('')
  const [tabId, setTabId] = useState<number | null>(null)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id && tabs[0].url) {
        setTabId(tabs[0].id)
        try {
          const url = new URL(tabs[0].url)
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            const hostname = url.hostname
            setUrl(hostname)
            chrome.storage.local.get([hostname], (result) => {
              if (result[hostname]) {
                setHasPermission(true)
              }
            })
          } else {
            setUrl('This page is not supported.')
          }
        } catch (error) {
          setUrl('Invalid URL.')
        }
      }
    })
  }, [])

  const handleAllow = () => {
    if (!tabId || !url) return

    chrome.storage.local.set({ [url]: true }, () => {
      console.log(`Permission granted for ${url}`)
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: [contentScript],
        },
        () => {
          window.close()
        },
      )
    })
  }

  const handleDisable = () => {
    if (!url) return

    chrome.storage.local.remove([url], () => {
      console.log(`Permission removed for ${url}`)
      setHasPermission(false)
    })
  }

  return (
    <Card className="w-80 border-none shadow-none">
      <CardHeader>
        <CardTitle>Epic SaaS Chrome Extension</CardTitle>
        <CardDescription>Inject scripts with ease.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm text-muted-foreground">
          {hasPermission
            ? 'Permission has been granted for:'
            : 'Grant permission to inject script on:'}
          <br />
          <span className="font-semibold text-foreground">{url}</span>
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
