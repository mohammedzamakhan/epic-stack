import { useState, useEffect } from 'react';

function App() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            setUrl(url.hostname);
          } else {
            setUrl('This page is not supported.');
          }
        } catch (error) {
          setUrl('Invalid URL.');
        }
      }
    });
  }, []);

  const handleAllow = () => {
    chrome.storage.local.set({ [url]: true }, () => {
      console.log(`Permission granted for ${url}`);
      window.close();
    });
  };

  return (
    <div className="w-64 p-4">
      <h1 className="text-lg font-bold text-center mb-4">Inject Script</h1>
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
    </div>
  );
}

export default App;
