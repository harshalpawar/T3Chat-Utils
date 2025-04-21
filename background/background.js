import logger from "../logger.js";
import { IS_DEV_MODE } from "../config.js";
logger.setDevMode(IS_DEV_MODE);

// Toggle sidebar on icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Toggle sidebar on keyboard shortcut
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-sidebar") {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Store connections from content scripts
const connections = {};

// Listen for connection requests from content scripts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "t3chat-context") return;

  const connectionId = port.sender.frameId || "main";
  connections[connectionId] = port;
  logger.log(`Connection established with frame ${connectionId}`);

  // Clean up when port is disconnected
  port.onDisconnect.addListener(() => {
    delete connections[connectionId];
    logger.log(`Connection with frame ${connectionId} closed`);
  });

  // Listen for messages on this port
  port.onMessage.addListener(async (message) => {
    if (message.type !== "GET_ACTIVE_PAGE_HTML") return;
    logger.log("Received request for page HTML");

    try {
      // Find active tab that is NOT the sidepanel
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const mainTab = tabs.find((t) => !t.url.includes("chrome-extension://"));

      if (!mainTab) {
        logger.log("No active tab found");
        port.postMessage({
          type: "HERE_IS_THE_HTML",
          html: null,
          title: null,
          error: "No active tab found",
        });
        return;
      }

      logger.log(`Found active tab: ${mainTab.url}`);

      // Execute script in the main tab to grab full HTML and title
      const results = await chrome.scripting.executeScript({
        target: { tabId: mainTab.id },
        func: () => ({
          html: document.documentElement.innerHTML,
          title: document.title || "Untitled Page",
        }),
      });

      if (!results || !results[0] || !results[0].result) {
        logger.error("Failed to get HTML from tab");
        port.postMessage({
          type: "HERE_IS_THE_HTML",
          html: null,
          title: null,
          error: "Failed to get HTML",
        });
        return;
      }

      const { html, title } = results[0].result;
      logger.log(
        `Successfully retrieved HTML (${html.length} bytes) with title: ${title}`
      );

      // Send the HTML and title back through the port
      port.postMessage({
        type: "HERE_IS_THE_HTML",
        html: html,
        title: title,
      });
      logger.log("HTML sent back through port");
    } catch (error) {
      logger.error("Error in background script:", error);
      port.postMessage({
        type: "HERE_IS_THE_HTML",
        html: null,
        title: null,
        error: error.message,
      });
    }
  });
});
