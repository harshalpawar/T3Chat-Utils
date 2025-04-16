**Project Overview: T3chat Sidebar Browser Extension**

---

**Goal:**
Build a browser extension (Chrome/Firefox) that embeds T3chat in a sidebar and augments it with advanced context-aware features.

---

**Core Features:**

1. **Sidebar Integration**
   - Open T3chat in a persistent browser sidebar for easy access on any webpage.

2. **Contextual Chat**
   - Allow users to chat with T3chat about the content of their current webpage.
   - Extract and clean webpage HTML, then pass it as context to T3chat.

3. **YouTube Transcript Support**
   - When on a YouTube video, extract the transcript and pass it to T3chat.
   - Enable queries like “summarize this video.”

4. **Enhanced Chat Navigation**
   - Custom scrollbar in the chat UI with clickable dots for each prompt/response.
   - Buttons to jump up/down by one exchange.

5. **Prompt Text Expansion**
   - Auto-expand shortcuts (e.g., `%tldr%` → “summarize this webpage in 5 bullet points”) in the chat input.

---

**Tools & Technologies:**

- **Browser Extension APIs**
  - Chrome: Manifest V3, `sidePanel` API.
  - Firefox: Manifest V3, `sidebar_action` API.

- **JavaScript/HTML/CSS**
  - For UI, logic, and DOM manipulation.

- **Content Scripts**
  - To extract webpage content and interact with page DOM.

- **Messaging**
  - For communication between sidebar, content scripts, and background scripts.

- **Libraries**
  - [Mozilla Readability](https://github.com/mozilla/readability) for extracting main content from webpages.
  - [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) for cross-browser compatibility.

- **(Optional) Frameworks**
  - React or Vue for sidebar UI (if complexity grows).

---

**Integration Approach:**

- If T3chat has no official API, inject context by manipulating the chat input box in the sidebar.
- For YouTube, extract transcript via DOM or unofficial APIs.
- All features should degrade gracefully if page structure or APIs change.

---

**Summary:**
A cross-browser extension that embeds T3chat in a sidebar, lets users chat about the current page or YouTube video, and provides advanced chat navigation and input features. Uses standard web tech, browser APIs, and robust libraries for content extraction and compatibility.
