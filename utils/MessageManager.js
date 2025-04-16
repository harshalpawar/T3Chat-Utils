export class MessageManager {
  constructor() {
    this.messages = [];
    this.messagesContainer = document.getElementById("chat-messages");
  }

  async sendMessage(content) {
    // Add user message
    const userMessage = {
      type: "user",
      content,
      timestamp: new Date(),
    };
    this.addMessageToUI(userMessage);
    this.messages.push(userMessage);

    // Get page context if needed
    const context = await this.getPageContext();

    // TODO: Implement T3chat API integration
    // For now, just echo the message
    const botMessage = {
      type: "bot",
      content: `Received: ${content}\nContext: ${JSON.stringify(context)}`,
      timestamp: new Date(),
    };

    this.addMessageToUI(botMessage);
    this.messages.push(botMessage);
  }

  async getPageContext() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_PAGE_CONTENT",
      });
      return response;
    } catch (error) {
      console.error("Error getting page context:", error);
      return null;
    }
  }

  addMessageToUI(message) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", message.type);

    const contentElement = document.createElement("div");
    contentElement.classList.add("message-content");
    contentElement.textContent = message.content;

    const timestampElement = document.createElement("div");
    timestampElement.classList.add("message-timestamp");
    timestampElement.textContent = message.timestamp.toLocaleTimeString();

    messageElement.appendChild(contentElement);
    messageElement.appendChild(timestampElement);

    this.messagesContainer.appendChild(messageElement);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}
