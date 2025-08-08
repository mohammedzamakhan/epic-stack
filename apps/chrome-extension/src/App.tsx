import { useState, useEffect } from 'react';

function App() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].url) {
        const url = new URL(tabs[0].url);
        setUrl(url.hostname);
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
