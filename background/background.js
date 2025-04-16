// Enable the side panel by default
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Listen for messages from content scripts and sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "GET_PAGE_CONTENT":
      handleGetPageContent(sender.tab.id, sendResponse);
      return true;
    case "GET_YOUTUBE_TRANSCRIPT":
      handleGetYoutubeTranscript(sender.tab.id, sendResponse);
      return true;
  }
});

async function handleGetPageContent(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return {
          url: window.location.href,
          title: document.title,
          content: document.body.innerText,
        };
      },
    });
    return result;
  } catch (error) {
    console.error("Error getting page content:", error);
    return null;
  }
}

async function handleGetYoutubeTranscript(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/youtube-transcript.js"],
    });
    return result;
  } catch (error) {
    console.error("Error getting YouTube transcript:", error);
    return null;
  }
}
