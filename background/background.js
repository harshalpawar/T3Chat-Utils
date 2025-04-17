// Enable the side panel by default
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle extension icon click and keyboard shortcut
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Store connections from content scripts
const connections = {};

// Listen for connection requests from content scripts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "t3chat-context") return;

  const connectionId = port.sender.frameId || "main";
  connections[connectionId] = port;

  console.log(`Connection established with frame ${connectionId}`);

  // Clean up when port is disconnected
  port.onDisconnect.addListener(() => {
    delete connections[connectionId];
    console.log(`Connection with frame ${connectionId} closed`);
  });

  // Listen for messages on this port
  port.onMessage.addListener(async (message) => {
    if (message.type !== "GET_ACTIVE_PAGE_HTML") return;

    console.log("Received request for page HTML");

    try {
      // Find active tab that is NOT the sidepanel
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const mainTab = tabs.find((t) => !t.url.includes("chrome-extension://"));

      if (!mainTab) {
        console.warn("No active tab found");
        port.postMessage({
          type: "HERE_IS_THE_HTML",
          html: null,
          error: "No active tab found",
        });
        return;
      }

      console.log(`Found active tab: ${mainTab.url}`);

      // Execute script in the main tab to grab full HTML
      const results = await chrome.scripting.executeScript({
        target: { tabId: mainTab.id },
        func: () => document.documentElement.outerHTML,
      });

      if (!results || !results[0] || !results[0].result) {
        console.error("Failed to get HTML from tab");
        port.postMessage({
          type: "HERE_IS_THE_HTML",
          html: null,
          error: "Failed to get HTML",
        });
        return;
      }

      const html = results[0].result;
      console.log(`Successfully retrieved HTML (${html.length} bytes)`);

      // Send the HTML back through the port
      port.postMessage({
        type: "HERE_IS_THE_HTML",
        html: html,
      });

      console.log("HTML sent back through port");
    } catch (error) {
      console.error("Error in background script:", error);
      port.postMessage({
        type: "HERE_IS_THE_HTML",
        html: null,
        error: error.message,
      });
    }
  });
});
