export class TextExpander {
  constructor() {
    this.shortcuts = new Map([
      ["%tldr%", "summarize this webpage in 5 bullet points"],
      ["%sum%", "provide a detailed summary of this content"],
      ["%key%", "what are the key points from this content?"],
      ["%eli5%", "explain this content like I'm 5 years old"],
      ["%tech%", "explain the technical details of this content"],
    ]);
  }

  async expand(text) {
    let expandedText = text;

    for (const [shortcut, expansion] of this.shortcuts) {
      expandedText = expandedText.replace(new RegExp(shortcut, "g"), expansion);
    }

    return expandedText;
  }

  addShortcut(shortcut, expansion) {
    if (!shortcut.startsWith("%") || !shortcut.endsWith("%")) {
      shortcut = `%${shortcut}%`;
    }
    this.shortcuts.set(shortcut, expansion);
  }

  removeShortcut(shortcut) {
    if (!shortcut.startsWith("%") || !shortcut.endsWith("%")) {
      shortcut = `%${shortcut}%`;
    }
    return this.shortcuts.delete(shortcut);
  }

  getShortcuts() {
    return Object.fromEntries(this.shortcuts);
  }
}
