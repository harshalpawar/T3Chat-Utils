// Convert HTML to Markdown using Turndown
function convertHtmlToMarkdown(html) {
  console.log("Converting HTML to Markdown with Turndown...");
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const body = doc.body.cloneNode(true);

    // Remove unwanted elements that don't contribute to content
    const unwantedElements = [
      "script",
      "style",
      "noscript",
      "iframe",
      "meta",
      "nav",
      "header",
      "footer",
      "aside",
    ];

    // Remove common navigation, header, footer elements by selectors
    const unwantedSelectors = [
      "nav",
      "header",
      "footer",
      ".header",
      ".footer",
      ".navigation",
      ".nav",
      ".navbar",
      ".menu",
      ".sidebar",
      ".site-header",
      ".site-footer",
      "#header",
      "#footer",
      "#nav",
      "#navbar",
      "#menu",
      "#sidebar",
      "[role='navigation']",
      "[role='banner']",
      "[role='contentinfo']",
    ];

    // Remove elements by tag name
    unwantedElements.forEach((selector) => {
      const elements = body.querySelectorAll(selector);
      elements.forEach((element) => element.remove());
    });

    // Remove elements by class/id
    unwantedSelectors.forEach((selector) => {
      const elements = body.querySelectorAll(selector);
      elements.forEach((element) => element.remove());
    });

    // Try to find and extract main content
    const mainContent =
      body.querySelector("main") ||
      body.querySelector("article") ||
      body.querySelector("#content") ||
      body.querySelector(".content") ||
      body.querySelector("[role='main']") ||
      body.querySelector(".main-content") ||
      body.querySelector(".post-content") ||
      body.querySelector(".entry-content") ||
      body.querySelector(".article-content");

    // Use main content if found, otherwise use cleaned body
    const contentToConvert = mainContent || body;

    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
      hr: "---",
    });

    // Add support for code blocks
    turndownService.addRule("fencedCodeBlock", {
      filter: (node) =>
        node.nodeName === "PRE" && node.firstChild?.nodeName === "CODE",
      replacement: (content, node) => {
        const language =
          node.firstChild.getAttribute("class")?.match(/language-(\w+)/)?.[1] ||
          "";
        return `\n\n\`\`\`${language}\n${node.firstChild.textContent}\n\`\`\`\n\n`;
      },
    });

    // Remove images - replace with empty string
    turndownService.addRule("removeImages", {
      filter: "img",
      replacement: function () {
        return "";
      },
    });

    // Strip links - keep text content only
    turndownService.addRule("stripLinks", {
      filter: "a",
      replacement: function (content) {
        return content;
      },
    });

    // Clean up the body before conversion
    const cleanedMarkdown = turndownService.turndown(contentToConvert);

    // Additional post-processing to remove any remaining image or link markdown syntax
    return cleanedMarkdown
      .replace(/!\[.*?\]\(.*?\)/g, "") // Remove any remaining image markdown
      .replace(/\[([^\]]*)\]\(.*?\)/g, "$1") // Convert links to just their text content
      .trim(); // Remove leading/trailing whitespace
  } catch (error) {
    console.error("Error converting HTML to Markdown:", error);
    throw error;
  }
}
