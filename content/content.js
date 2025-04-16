// Import Readability when on a webpage that needs content extraction
import { Readability } from "@mozilla/readability";

class ContentExtractor {
  constructor() {
    this.initializeMessageListener();
  }

  initializeMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "EXTRACT_CONTENT") {
        const content = this.extractPageContent();
        sendResponse(content);
      }
      return true;
    });
  }

  extractPageContent() {
    try {
      const documentClone = document.cloneNode(true);
      const reader = new Readability(documentClone);
      const article = reader.parse();

      return {
        title: article.title,
        content: article.textContent,
        excerpt: article.excerpt,
        url: window.location.href,
      };
    } catch (error) {
      console.error("Error extracting content:", error);
      return {
        title: document.title,
        content: document.body.innerText,
        url: window.location.href,
      };
    }
  }
}

// Initialize content extractor
new ContentExtractor();
