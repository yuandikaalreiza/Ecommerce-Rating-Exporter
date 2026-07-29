chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "download_xlsx") return;
  chrome.downloads.download({
    url: message.url,
    filename: message.filename,
    conflictAction: "uniquify",
    saveAs: false
  }, (downloadId) => {
    const error = chrome.runtime.lastError;
    sendResponse(error ? { error: error.message } : { downloadId });
  });
  return true;
});
