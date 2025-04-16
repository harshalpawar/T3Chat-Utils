# T3Chat Sidebar Chrome Extension

A Chrome extension that embeds T3chat in a sidebar and provides advanced context-aware features for webpage interactions.

## Features

- Persistent sidebar integration with T3chat
- Contextual chat about current webpage content
- YouTube transcript support
- Enhanced chat navigation with custom scrollbar
- Text expansion shortcuts
- Clean, modern UI

## Development Setup

1. Install dependencies:

```bash
npm install
```

2. Build the extension:

```bash
npm run build
```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

## Usage

1. Click the extension icon to open the sidebar
2. Use the chat input to interact with T3chat
3. Navigate conversations using:
   - Up/down arrows in the custom scrollbar
   - Clickable dots for each exchange
   - Keyboard shortcuts

## Text Expansion Shortcuts

- `%tldr%` - Summarize webpage in 5 bullet points
- `%sum%` - Detailed content summary
- `%key%` - Key points extraction
- `%eli5%` - Simple explanation
- `%tech%` - Technical details

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Project Structure

```
├── manifest.json           # Extension manifest
├── sidebar/               # Sidebar UI components
├── background/            # Service worker
├── content/              # Content scripts
└── utils/                # Utility classes
    ├── MessageManager.js
    ├── ScrollManager.js
    └── TextExpander.js
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
