chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    const domain = url.hostname;

    chrome.storage.local.get([domain], (result) => {
      if (result[domain]) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['src/content/index.js'],
        });
      }
    });
  }
});
