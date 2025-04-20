// iframe-injector.js
(() => {
  // Only run inside iframe (extension sidebar); skip top-level tabs
  if (window.self === window.top) {
    console.log(
      "[T3Chat Context] Not in sidebar iframe, skipping content script."
    );
    return;
  }
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

      if (!btn) {
        log("Button not found when trying to reset state", true);
        return;
      }

      // Handle error case
      if (message.error || !message.html) {
        log(
          `Error receiving HTML: ${message.error || "No HTML received"}`,
          true
        );
        btn.className = defaultClassName;
        btn.innerHTML = defaultContent;
        return;
      }

      log(
        `Received HTML (${message.html.length} bytes), converting to Markdown...`
      );

      try {
        // Convert the HTML to Markdown using Turndown
        const markdown = convertHtmlToMarkdown(message.html);
        log(
          `Converted to Markdown (${markdown.length} bytes), simulating drop...`
        );

        // Simulate the drop with the Markdown content and page title
        simulateDropWithMarkdown(markdown, message.title);

        // Reset button to default state
        btn.className = defaultClassName;
        btn.innerHTML = defaultContent;
      } catch (error) {
        log(`Error processing content: ${error.message}`, true);
        btn.className = defaultClassName;
        btn.innerHTML = defaultContent;
      }
    });

    // Handle disconnection
    port.onDisconnect.addListener(() => {
      log("Connection to background lost, will reconnect when needed");
      port = null;
    });
  }

  // Default button styling and content (moved to top-level constants)
  const defaultClassName =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 disabled:cursor-not-allowed font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] shadow border-reflect button-reflect h-9 w-full relative rounded-lg p-2 text-white mt-2";

  const defaultContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link !size-5">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
    <span class="px-1">Grab Context</span>
  `;

  // Convert HTML to Markdown using Turndown
  function convertHtmlToMarkdown(html) {
    log("Converting HTML to Markdown with Turndown...");
    try {
      // Create a temporary DOM document to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Extract only the main content using common selectors
      // Try different selectors that are commonly used for main content
      const mainSelectors = [
        "main",
        "article",
        "#content",
        ".content",
        "#main",
        ".main",
        ".post",
        ".article",
        '[role="main"]',
        ".main-content",
        "#article-content",
        ".entry-content",
      ];

      let mainContent = null;

      // Try to find the main content element
      for (const selector of mainSelectors) {
        const element = doc.querySelector(selector);
        if (element && element.textContent.trim().length > 500) {
          // Found a substantial content element
          mainContent = element;
          log(`Found main content using selector: ${selector}`);
          break;
        }
      }

      // If no suitable main content element found, try to use the <body> but remove scripts and navigation
      if (!mainContent) {
        log(
          "No specific main content element found, cleaning the body instead"
        );
        mainContent = doc.body.cloneNode(true);

        // Remove common non-content elements
        const elementsToRemove = [
          "script",
          "style",
          "nav",
          "header",
          "footer",
          "aside",
          "iframe",
          ".sidebar",
          "#sidebar",
          ".navigation",
          ".ad",
          ".ads",
          ".advert",
          ".cookie",
          ".popup",
          ".menu",
          ".nav",
          "noscript",
          "meta",
        ];

        elementsToRemove.forEach((selector) => {
          const elements = mainContent.querySelectorAll(selector);
          for (const element of elements) {
            element.remove();
          }
        });
      }

      // Create a turndown service instance
      const turndownService = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        bulletListMarker: "-",
        hr: "---",
      });

      // Customize turndown rules
      turndownService.addRule("fencedCodeBlock", {
        filter: function (node, options) {
          return (
            node.nodeName === "PRE" &&
            node.firstChild &&
            node.firstChild.nodeName === "CODE"
          );
        },
        replacement: function (content, node, options) {
          const language = node.firstChild.getAttribute("class") || "";
          const languageMatch = language.match(/language-(\w+)/);
          const languageStr = languageMatch ? languageMatch[1] : "";
          return (
            "\n\n```" +
            languageStr +
            "\n" +
            node.firstChild.textContent +
            "\n```\n\n"
          );
        },
      });

      // Clean up large inline scripts and styles that might have been missed
      if (mainContent.innerHTML) {
        mainContent.innerHTML = mainContent.innerHTML.replace(
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          ""
        );
      }

      // Get the HTML content from our cleaned element
      const contentToConvert = mainContent ? mainContent.innerHTML : html;

      // Convert HTML to Markdown
      const markdown = turndownService.turndown(contentToConvert);

      // Further clean the markdown of any remaining junk
      const cleanMarkdown = markdown
        .replace(/\n{3,}/g, "\n\n") // Remove excessive newlines
        .replace(/^javascript:.*$/gm, "") // Remove any javascript: lines
        .replace(/if\s*\(\s*typeof\s+ga.*\)\s*\{.*\}/gs, "") // Remove Google Analytics code
        .replace(/ga\('create'.*\);/g, "") // Remove GA calls
        .trim();

      log("HTML successfully converted to Markdown");
      console.log(cleanMarkdown);
      return cleanMarkdown;
    } catch (error) {
      log(`Error converting HTML to Markdown: ${error.message}`, true);
      throw error;
    }
  }

  // 1) Inject the button once per frame
  function injectButton() {
    // Check if the button already exists
    if (document.getElementById("grab-context-btn")) return;

    // Create a container for the second row
    const container = document.createElement("div");
    container.className = "w-full flex flex-col";

    const btn = document.createElement("button");
    btn.id = "grab-context-btn";
    btn.type = "button"; // Prevent form submission
    btn.setAttribute("aria-label", "Grab page context");
    btn.className = defaultClassName;
    btn.innerHTML = defaultContent;

    // Add click handler
    btn.addEventListener("click", (e) => {
      // Prevent event bubbling
      e.preventDefault();
      e.stopPropagation();

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

      // Update button state while processing
      btn.className = defaultClassName
        .replace("bg-[#2563eb]", "bg-[#9ca3af]")
        .replace("hover:bg-[#1d4ed8]", "")
        .replace("active:bg-[#1e40af]", "");
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 animate-spin !size-5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        <span class="px-1">Processing...</span>
      `;

      log("Requesting page HTML from background script...");
      port.postMessage({ type: "GET_ACTIVE_PAGE_HTML" });

      // Reset button after 5 seconds if no response
      setTimeout(() => {
        if (isSending) {
          isSending = false;
          btn.className = defaultClassName;
          btn.innerHTML = defaultContent;
          log("Request timed out, reset button");
        }
      }, 5000);
    });

    // Find the message actions div and inject our button
    const actionsDiv = document.querySelector(
      'div[aria-label="Message actions"]'
    );
    if (actionsDiv) {
      // Modify the existing actions div to be a column layout
      actionsDiv.className = actionsDiv.className + " flex-col";

      // Create a container for the original buttons
      const originalButtonsRow = document.createElement("div");
      originalButtonsRow.className = "flex items-center justify-center gap-2";

      // Move existing buttons to the top row
      while (actionsDiv.firstChild) {
        originalButtonsRow.appendChild(actionsDiv.firstChild);
      }

      // Add both rows to the actions div
      actionsDiv.appendChild(originalButtonsRow);
      actionsDiv.appendChild(btn);

      log("Button injected into message actions as second row");
    } else {
      log("Could not find message actions div", true);
    }
  }

  // Create a File with Markdown and dispatch drag/drop events
  function simulateDropWithMarkdown(markdown, title) {
    log("Creating File object with Markdown...");
    const blob = new Blob([markdown], { type: "text/markdown" });

    // Clean the title and ensure it ends with .md
    const cleanTitle =
      (title || "page")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric chars with hyphens
        .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
        .substring(0, 50) + // Limit length
      ".md";

    const file = new File([blob], cleanTitle, { type: "text/markdown" });

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
      // Handle blank paths and normalize the current path
      let currentPath = window.location.pathname;
      if (!currentPath || currentPath === "blank" || currentPath === "/blank") {
        // If we're in the iframe initial load, try to get the parent URL
        try {
          currentPath = new URL(document.referrer).pathname;
          log(`Using referrer path instead: ${currentPath}`);
        } catch (e) {
          log("Could not get referrer path", true);
          currentPath = "/";
        }
      }
      log(`Checking path for injection: ${currentPath}`);

      // Match /chat, /chat/, or /chat/<anything>
      if (
        currentPath === "/chat" ||
        currentPath === "/chat/" ||
        currentPath.match(/^\/chat\/.+/)
      ) {
        log("Chat path detected, injecting button...");
        injectButton();
      } else {
        log("Not a chat path, skipping button injection");
        const btn = document.getElementById("grab-context-btn");
        if (btn) {
          btn.remove();
          log("Removed existing button");
        }
      }
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
  }

  // Listen for DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    log("DOMContentLoaded fired, trying to inject button");
    tryInject();
  });

  // Set up a mutation observer to watch for SPA navigation changes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Handle blank paths and normalize the current path
      let currentPath = window.location.pathname;
      if (!currentPath || currentPath === "blank" || currentPath === "/blank") {
        try {
          currentPath = new URL(document.referrer).pathname;
          log(`Using referrer path instead: ${currentPath}`);
        } catch (e) {
          log("Could not get referrer path", true);
          currentPath = "/";
        }
      }
      log(`Detected DOM change, current path: ${currentPath}`);

      // Match /chat, /chat/, or /chat/<anything>
      if (
        currentPath === "/chat" ||
        currentPath === "/chat/" ||
        currentPath.match(/^\/chat\/.+/)
      ) {
        if (!document.getElementById("grab-context-btn")) {
          log("Chat route detected, injecting button");
          tryInject();
        }
      } else {
        const btn = document.getElementById("grab-context-btn");
        if (btn) {
          log("Non-chat route detected, removing button");
          btn.remove();
        }
      }
    }
  });

  // Start observing with a configuration that watches for subtle SPA changes
  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href", "src"],
  });

  // Also watch for URL changes using the History API
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function () {
    originalPushState.apply(this, arguments);
    log("pushState detected, checking route");
    tryInject();
  };

  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    log("replaceState detected, checking route");
    tryInject();
  };

  window.addEventListener("popstate", () => {
    log("popstate detected, checking route");
    tryInject();
  });

  // Clear any existing intervals
  const existingInterval = window.injectionInterval;
  if (existingInterval) {
    clearInterval(existingInterval);
  }

  // Set up a short interval for initial injection
  window.injectionInterval = setInterval(() => {
    if (document.getElementById("grab-context-btn")) {
      log("Button already injected, clearing interval");
      clearInterval(window.injectionInterval);
    } else {
      log("Button not yet injected, retrying...");
      tryInject();
    }
  }, 1000);

  // Clear interval after 5 seconds
  setTimeout(() => {
    if (window.injectionInterval) {
      clearInterval(window.injectionInterval);
      log("Injection attempts stopped after timeout");
    }
  }, 5000);

  log("Content script initialized with enhanced route detection");
})();
