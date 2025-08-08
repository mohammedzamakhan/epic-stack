import { useState, useEffect } from 'react'
import contentScript from './content?script'

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

  return (
    <div className="w-64 p-4">
      <h1 className="text-lg font-bold text-center mb-4">Inject Script</h1>
      {hasPermission ? (
        <p className="text-center">
          Permission already granted for: <br />
          <span className="font-semibold">{url}</span>
        </p>
      ) : (
        <>
          <p className="text-center mb-4">
            Allow injecting script on: <br />
            <span className="font-semibold">{url}</span>
          </p>
          <button
            onClick={handleAllow}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Allow
          </button>
        </>
      )}
    </div>
  )
}

export default App
