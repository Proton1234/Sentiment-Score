chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "extractText") {
    const text = document.body.innerText.trim();
    sendResponse(text);
  }
  return true; // Required to keep sendResponse channel open
});
