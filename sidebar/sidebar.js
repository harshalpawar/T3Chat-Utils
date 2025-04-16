import { MessageManager } from "../utils/MessageManager.js";
import { ScrollManager } from "../utils/ScrollManager.js";
import { TextExpander } from "../utils/TextExpander.js";

class Sidebar {
  constructor() {
    this.messageManager = new MessageManager();
    this.scrollManager = new ScrollManager();
    this.textExpander = new TextExpander();

    this.chatInput = document.getElementById("chat-input");
    this.sendButton = document.getElementById("send-button");
    this.messagesContainer = document.getElementById("chat-messages");
    this.prevButton = document.getElementById("prev-exchange");
    this.nextButton = document.getElementById("next-exchange");

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    this.sendButton.addEventListener("click", () => this.handleSend());
    this.chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    this.prevButton.addEventListener("click", () =>
      this.scrollManager.scrollToPreviousExchange()
    );
    this.nextButton.addEventListener("click", () =>
      this.scrollManager.scrollToNextExchange()
    );
  }

  async handleSend() {
    const rawInput = this.chatInput.value.trim();
    if (!rawInput) return;

    const expandedInput = await this.textExpander.expand(rawInput);
    await this.messageManager.sendMessage(expandedInput);

    this.chatInput.value = "";
  }
}

// Initialize the sidebar when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.sidebar = new Sidebar();
});
