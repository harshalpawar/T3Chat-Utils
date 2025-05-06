(() => {
  if (window.self === window.top) {
    return;
  }

  let isSending = false;
  let lastMessageTime = 0;
  const THROTTLE_TIME = 2000;
  let port = null;

  function connectToBackground() {
    if (port) {
      try {
        port.disconnect();
      } catch (e) {
        console.error("[SidekickChat] Error disconnecting port:", e);
      }
    }

    port = chrome.runtime.connect({ name: "sidekickchat-context" });

    port.onMessage.addListener((message) => {
      if (message.type !== "HERE_IS_THE_HTML") return;

      isSending = false;
      const btn = document.getElementById("grab-context-btn");

      if (!btn) {
        console.error(
          "[SidekickChat] Button not found when trying to reset state"
        );
        return;
      }

      if (message.error || !message.html) {
        console.error(
          `[SidekickChat] Error receiving HTML: ${
            message.error || "No HTML received"
          }`
        );
        btn.className = defaultClassName;
        btn.innerHTML = defaultContent;
        return;
      }

      try {
        const markdown = convertHtmlToMarkdown(message.html);

        simulateDropWithMarkdown(markdown, message.title);

        btn.className = defaultClassName;
        btn.innerHTML = defaultContent;
      } catch (error) {
        console.error(
          `[SidekickChat] Error processing content: ${error.message}`
        );
        btn.className = defaultClassName;
        btn.innerHTML = defaultContent;
      }
    });

    port.onDisconnect.addListener(() => {
      console.log(
        "[SidekickChat] Connection to background lost, will reconnect when needed"
      );
      port = null;
    });
  }

  const defaultClassName =
    "p-2 flex h-auto items-center justify-center gap-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800";

  const defaultContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  `;

  function injectButton() {
    if (document.getElementById("grab-context-btn")) {
      return;
    }

    const actionsDiv = document.querySelector(
      'div[aria-label="Message actions"]'
    );

    if (!actionsDiv) return;

    // Create tooltip container
    const tooltipContainer = document.createElement("div");
    tooltipContainer.className = "relative";
    tooltipContainer.style.display = "inline-block";

    const btn = document.createElement("button");
    btn.id = "grab-context-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Grab page context");
    btn.className = defaultClassName;
    btn.innerHTML = defaultContent;

    // Create tooltip element
    const tooltip = document.createElement("div");
    tooltip.className =
      "text-xs rounded whitespace-nowrap opacity-0 pointer-events-none";
    tooltip.style.position = "absolute";
    tooltip.style.bottom = "100%";
    tooltip.style.left = "50%";
    tooltip.style.transform = "translateX(-50%)";
    tooltip.style.marginBottom = "10px";
    tooltip.style.padding = "6px 12px";
    tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    tooltip.style.color = "white";
    tooltip.style.borderRadius = "4px";
    tooltip.style.zIndex = "50";
    tooltip.style.transition = "opacity 0.2s ease";
    tooltip.textContent = "Grab Context";
    tooltip.style.width = "max-content";

    // Add hover event listeners for tooltip
    tooltipContainer.addEventListener("mouseenter", () => {
      tooltip.style.opacity = "1";
    });

    tooltipContainer.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
    });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      if (isSending || now - lastMessageTime < THROTTLE_TIME) {
        return;
      }

      if (!port) {
        connectToBackground();
      }

      isSending = true;
      lastMessageTime = now;

      btn.className = defaultClassName + " opacity-50";
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
      `;

      tooltip.textContent = "Processing...";

      port.postMessage({ type: "GET_ACTIVE_PAGE_HTML" });

      setTimeout(() => {
        if (isSending) {
          isSending = false;
          btn.className = defaultClassName;
          btn.innerHTML = defaultContent;
          tooltip.textContent = "Grab Context";
        }
      }, 5000);
    });

    // Add elements to DOM
    tooltipContainer.appendChild(btn);
    tooltipContainer.appendChild(tooltip);

    // Insert in the middle of the action buttons
    const children = Array.from(actionsDiv.children);
    const middleIndex = Math.floor(children.length / 2);

    if (children.length > 0) {
      actionsDiv.insertBefore(tooltipContainer, children[middleIndex]);
    } else {
      actionsDiv.appendChild(tooltipContainer);
    }
  }

  const observer = new MutationObserver((mutations, obs) => {
    const actionsDiv = document.querySelector(
      'div[aria-label="Message actions"]'
    );
    if (actionsDiv) {
      injectButton();
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }
})();
