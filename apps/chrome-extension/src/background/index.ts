import browser from 'webextension-polyfill'
import contentScript from '../content/index.tsx?script'

browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    try {
      const fullTab = await browser.tabs.get(tabId)
      if (!fullTab.url) {
        return
      }

      const url = new URL(fullTab.url)
      const domain = url.hostname

      const result = await browser.storage.local.get([domain])
      if (result[domain]) {
        const scriptPath = contentScript.startsWith('/') ? contentScript.slice(1) : contentScript
        await browser.scripting.executeScript({
          target: { tabId: tabId },
          files: [scriptPath],
        })
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('No tab with id')) {
        // Tab was closed before we could get its details, ignore.
        return
      }
      console.error('Error in background script:', error)
    }
  }
})
