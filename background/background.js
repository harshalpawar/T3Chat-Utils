// Enable the side panel by default
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle extension icon click and keyboard shortcut
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
