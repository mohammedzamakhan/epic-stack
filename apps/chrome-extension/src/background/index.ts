import contentScript from '../content?script'

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url)
      const domain = url.hostname

      chrome.storage.local.get([domain], (result) => {
        if (result[domain]) {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [contentScript],
          })
        }
      })
    } catch (error) {
      console.error(`Invalid URL: ${tab.url}`)
    }
  }
})
