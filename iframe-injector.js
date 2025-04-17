// iframe-injector.js
(() => {
  let isSending = false;
  let lastMessageTime = 0;
  const THROTTLE_TIME = 2000; // 2 seconds between requests
  let port = null;

  // Debug utility
  function log(message, isError = false) {
    const prefix = "[T3Chat Context]";
    if (isError) {
      console.error(`${prefix} ${message}`);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  // Connect to the background script
  function connectToBackground() {
    if (port) {
      try {
        port.disconnect();
      } catch (e) {
        // Ignore disconnection errors
      }
    }

    // Create a new connection
    port = chrome.runtime.connect({ name: "t3chat-context" });
    log("Connected to background script");

    // Set up message handler
    port.onMessage.addListener((message) => {
      if (message.type !== "HERE_IS_THE_HTML") return;

      // Reset button state
      isSending = false;
      const btn = document.getElementById("grab-context-btn");

      // Handle error case
      if (message.error || !message.html) {
        log(
          `Error receiving HTML: ${message.error || "No HTML received"}`,
          true
        );
        if (btn) {
          btn.style.background = "#ef4444"; // Red for error
          btn.textContent = "Error!";
          setTimeout(() => {
            btn.style.background = "#2563eb";
            btn.textContent = "Grab Page Context";
          }, 1500);
        }
        return;
      }

      log(`Received HTML (${message.html.length} bytes), simulating drop...`);

      try {
        // Simulate the drop with the HTML content
        simulateDropWithHtml(message.html);

        // Visual feedback
        if (btn) {
          btn.style.background = "#22c55e"; // Green for success
          btn.textContent = "Success!";
          setTimeout(() => {
            btn.style.background = "#2563eb";
            btn.textContent = "Grab Page Context";
          }, 1500);
        }
      } catch (error) {
        log(`Error simulating drop: ${error.message}`, true);

        // Visual feedback for error
        if (btn) {
          btn.style.background = "#ef4444"; // Red for error
          btn.textContent = "Error!";
          setTimeout(() => {
            btn.style.background = "#2563eb";
            btn.textContent = "Grab Page Context";
          }, 1500);
        }
      }
    });

    // Handle disconnection
    port.onDisconnect.addListener(() => {
      log("Connection to background lost, will reconnect when needed");
      port = null;
    });
  }

  // 1) Inject the button once per frame
  function injectButton() {
    // Check if the button already exists
    if (document.getElementById("grab-context-btn")) return;

    const btn = document.createElement("button");
    btn.id = "grab-context-btn";
    btn.textContent = "Grab Page Context";
    Object.assign(btn.style, {
      position: "fixed",
      top: "1rem",
      right: "1rem",
      zIndex: 9999,
      padding: "0.5rem 1rem",
      background: "#2563eb",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      fontWeight: "bold",
      fontSize: "14px",
    });
    document.body.appendChild(btn);

    btn.addEventListener("click", () => {
      const now = Date.now();
      if (isSending || now - lastMessageTime < THROTTLE_TIME) {
        log("Too many requests, please wait...");
        return;
      }

      // Make sure we have a connection
      if (!port) {
        connectToBackground();
      }

      isSending = true;
      lastMessageTime = now;
      btn.style.background = "#9ca3af"; // Grey out button while processing
      btn.textContent = "Processing...";

      log("Requesting page HTML from background script...");
      port.postMessage({ type: "GET_ACTIVE_PAGE_HTML" });
    });
  }

  // 3) Create a File and dispatch drag/drop events
  function simulateDropWithHtml(pageHtml) {
    log("Creating File object...");
    const blob = new Blob([pageHtml], { type: "text/html" });
    const file = new File([blob], "page.html", { type: "text/html" });

    log("Creating DataTransfer object...");
    const dt = new DataTransfer();
    dt.items.add(file);

    log("Simulating drag and drop events...");
    // Common event properties for drag events
    const eventOptions = { dataTransfer: dt, bubbles: true, cancelable: true };

    // Dispatch each event in sequence
    log("Dispatching dragenter event...");
    const dragEnterEvent = new DragEvent("dragenter", eventOptions);
    const dragEnterResult = document.body.dispatchEvent(dragEnterEvent);
    log(`dragenter dispatch result: ${dragEnterResult}`);

    log("Dispatching dragover event...");
    const dragOverEvent = new DragEvent("dragover", eventOptions);
    const dragOverResult = document.body.dispatchEvent(dragOverEvent);
    log(`dragover dispatch result: ${dragOverResult}`);

    log("Dispatching drop event...");
    const dropEvent = new DragEvent("drop", eventOptions);
    const dropResult = document.body.dispatchEvent(dropEvent);
    log(`drop dispatch result: ${dropResult}`);

    log("Drop simulation completed!");
  }

  // Wait for the document to be ready and retry if button can't be injected
  function tryInject() {
    if (document.body) {
      log("Document body found, injecting button...");
      injectButton();
    } else {
      log("Document body not found yet, will retry...");
    }
  }

  // Try to inject immediately if document is ready
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    log(`Document already ${document.readyState}, trying to inject button`);
    tryInject();
  } else {
    log("Document not ready, setting up event listeners");
  }

  // Also listen for DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    log("DOMContentLoaded fired, trying to inject button");
    tryInject();
  });

  // And set an interval for a few seconds to retry
  const injectionInterval = setInterval(() => {
    if (document.getElementById("grab-context-btn")) {
      log("Button already injected, clearing interval");
      clearInterval(injectionInterval);
    } else {
      log("Button not yet injected, retrying...");
      tryInject();
    }
  }, 1000);

  // Clear interval after 10 seconds
  setTimeout(() => {
    clearInterval(injectionInterval);
    log("Injection attempts stopped after timeout");
  }, 10000);

  log("Content script initialized");
})();
