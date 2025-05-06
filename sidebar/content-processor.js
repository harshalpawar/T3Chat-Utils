// Convert HTML to Markdown using Turndown
function convertHtmlToMarkdown(html) {
  console.log("Converting HTML to Markdown with Turndown...");
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const body = doc.body.cloneNode(true);

    // Remove unwanted elements that don't contribute to content
    const unwantedElements = ["script", "style", "noscript", "iframe", "meta"];

    unwantedElements.forEach((selector) => {
      const elements = body.querySelectorAll(selector);
      elements.forEach((element) => element.remove());
    });

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

    return turndownService.turndown(body);
  } catch (error) {
    console.error("Error converting HTML to Markdown:", error);
    throw error;
  }
}
