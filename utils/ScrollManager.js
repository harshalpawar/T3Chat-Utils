export class ScrollManager {
  constructor() {
    this.messagesContainer = document.getElementById("chat-messages");
    this.scrollbar = document.getElementById("chat-scrollbar");
    this.exchanges = [];
    this.currentExchangeIndex = -1;

    this.initializeScrollbar();
    this.initializeObserver();
  }

  initializeScrollbar() {
    this.scrollbar.addEventListener("click", (e) => {
      const rect = this.scrollbar.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      const targetScroll = this.messagesContainer.scrollHeight * ratio;
      this.messagesContainer.scrollTop = targetScroll;
    });
  }

  initializeObserver() {
    // Observe changes in the messages container
    const observer = new MutationObserver(() => {
      this.updateExchanges();
      this.updateScrollbarMarkers();
    });

    observer.observe(this.messagesContainer, {
      childList: true,
      subtree: true,
    });
  }

  updateExchanges() {
    const messages = Array.from(this.messagesContainer.children);
    this.exchanges = [];

    for (let i = 0; i < messages.length; i += 2) {
      if (i + 1 < messages.length) {
        this.exchanges.push({
          userMessage: messages[i],
          botMessage: messages[i + 1],
          index: this.exchanges.length,
        });
      }
    }
  }

  updateScrollbarMarkers() {
    // Clear existing markers
    while (this.scrollbar.firstChild) {
      this.scrollbar.removeChild(this.scrollbar.firstChild);
    }

    // Add new markers
    this.exchanges.forEach((exchange) => {
      const marker = document.createElement("div");
      marker.classList.add("scrollbar-marker");

      const position =
        (exchange.userMessage.offsetTop / this.messagesContainer.scrollHeight) *
        100;
      marker.style.top = `${position}%`;

      this.scrollbar.appendChild(marker);
    });
  }

  scrollToPreviousExchange() {
    if (this.exchanges.length === 0) return;

    const currentScroll = this.messagesContainer.scrollTop;
    let targetExchange = this.exchanges[this.exchanges.length - 1];

    for (let i = this.exchanges.length - 1; i >= 0; i--) {
      const exchange = this.exchanges[i];
      if (exchange.userMessage.offsetTop < currentScroll - 10) {
        targetExchange = exchange;
        break;
      }
    }

    targetExchange.userMessage.scrollIntoView({ behavior: "smooth" });
  }

  scrollToNextExchange() {
    if (this.exchanges.length === 0) return;

    const currentScroll = this.messagesContainer.scrollTop;

    for (const exchange of this.exchanges) {
      if (exchange.userMessage.offsetTop > currentScroll + 10) {
        exchange.userMessage.scrollIntoView({ behavior: "smooth" });
        break;
      }
    }
  }
}
