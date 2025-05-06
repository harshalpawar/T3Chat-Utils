console.log("Background script loading...");

// Toggle sidebar on icon click
console.log("Setting up sidebar behavior...");
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .then(() => console.log("Sidebar behavior set"))
  .catch((err) => console.error("Error setting sidebar behavior:", err));

// Toggle sidebar on keyboard shortcut
console.log("Setting up keyboard shortcut listener...");
chrome.commands.onCommand.addListener((command, tab) => {
  console.log("Command received:", command);
  if (command === "toggle-sidebar") {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Store connections from content scripts
const connections = {};

// Listen for connection requests from content scripts
console.log("Setting up connection listener...");
chrome.runtime.onConnect.addListener((port) => {
  console.log(
    "Connection attempt from port:",
    port.name,
    "sender:",
    port.sender
  );

  if (port.name !== "sidekickchat-context") {
    console.log("Ignoring connection - wrong port name");
    return;
  }

  // Generate a unique connection ID based on timestamp if frameId is not available
  const connectionId = port.sender.frameId ?? Date.now();
  connections[connectionId] = port;
  console.log(`Connection established with ID ${connectionId}`);
  console.log("Current connections:", Object.keys(connections));

  // Clean up when port is disconnected
  port.onDisconnect.addListener(() => {
    delete connections[connectionId];
    console.log(`Connection with ID ${connectionId} closed`);
    console.log("Remaining connections:", Object.keys(connections));
  });

  // Listen for messages on this port
  port.onMessage.addListener(async (message) => {
    console.log("Message received on port:", message);

    if (message.type !== "GET_ACTIVE_PAGE_HTML") {
      console.log("Ignoring message - wrong type");
      return;
    }
    console.log("Processing HTML request");

    try {
      // Find active tab that is NOT the sidepanel
      console.log("Querying for active tabs...");
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      console.log("Found tabs:", tabs);

      const mainTab = tabs.find((t) => !t.url.includes("chrome-extension://"));
      console.log("Filtered main tab:", mainTab);

      if (!mainTab) {
        console.error("No active tab found");
        port.postMessage({
          type: "HERE_IS_THE_HTML",
          html: null,
          title: null,
          error: "No active tab found",
        });
        return;
      }

      console.log(`Attempting to execute script in tab ${mainTab.id}`);

      try {
        // Execute script in the main tab to grab full HTML and title
        const results = await chrome.scripting.executeScript({
          target: { tabId: mainTab.id },
          func: () => {
            console.log("Content script executing in page");
            return {
              html: document.documentElement.innerHTML,
              title: document.title || "Untitled Page",
            };
          },
        });

        console.log("Script execution results:", results);

        if (!results || !results[0] || !results[0].result) {
          throw new Error("No results from script execution");
        }

        const { html, title } = results[0].result;
        console.log(
          `Successfully retrieved HTML (length: ${html.length}) with title: ${title}`
        );

        // Send the HTML and title back through the port
        port.postMessage({
          type: "HERE_IS_THE_HTML",
          html: html,
          title: title,
        });
        console.log("HTML sent back through port");
      } catch (scriptError) {
        console.error("Script execution error:", scriptError);
        port.postMessage({
          type: "HERE_IS_THE_HTML",
          html: null,
          title: null,
          error: `Script execution failed: ${scriptError.message}`,
        });
      }
    } catch (error) {
      console.error("Error in background script:", error);
      port.postMessage({
        type: "HERE_IS_THE_HTML",
        html: null,
        title: null,
        error: error.message,
      });
    }
  });
});

// Debug: Log that setup is complete
console.log("Background script setup complete");
