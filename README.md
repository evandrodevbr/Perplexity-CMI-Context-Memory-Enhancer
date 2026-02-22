<div align="center">
  <img src="https://www.perplexity.ai/favicon.ico" alt="Perplexity Logo" width="80" height="80" />
  
  # Perplexity Context Memory Injector

**Persistent Memory & Custom Instructions System for Perplexity AI**

[![Version](https://img.shields.io/badge/Version-1.6.0-blue.svg?style=flat-square)]()
[![Platform](https://img.shields.io/badge/Platform-Perplexity%20AI-22d3ee.svg?style=flat-square)]()
[![Script](https://img.shields.io/badge/Manager-Tampermonkey-00bc70.svg?style=flat-square&logo=tampermonkey)]()
[![License: GNU](https://www.gnu.org/graphics/gfdl-logo-tiny.png)](<(https://www.gnu.org/licenses/gpl-3.0.html)>)

  <br>

[![Install Now](https://img.shields.io/badge/🚀%20INSTALL%20DIRECTLY%20IN%20TAMPERMONKEY-282828?style=for-the-badge&logo=javascript&labelColor=22d3ee&color=1f1f1f)](https://raw.githubusercontent.com/evandrodevbr/Perplexity-CMI-Context-Memory-Injector/main/perplexity-memory.user.js)

_(Requires the Tampermonkey / Violentmonkey extension installed in your browser)_

</div>

---

## 💡 The Problem

Natively, Perplexity AI lacks a built-in feature for persistent context or Custom Instructions (System Prompts) across different threads. For advanced users, developers, and researchers, manually rewriting the same guidelines (code architecture, formatting rules, project context) in every new interaction is inefficient and prone to context loss.

## ⚙️ The Solution

A high-performance **Userscript** that seamlessly injects structured memory blocks directly into Perplexity's text engine (Lexical) invisibly during message submission. Built with a UI/UX practically identical to Perplexity's native interface, ensuring a fluid experience with zero layout breakage.

---

## 🚀 Features

- **Native UI Integration:** An access button embedded directly into the sidebar (user profile area), matching the original iconography, typography, and color palette (supports Dark/Light modes).
- **Shadow DOM Isolation:** The floating panel interface runs within a Shadow DOM, preventing CSS conflicts with the original site's dynamic updates.
- **Lexical Engine Bypass (Sanitizer Evasion):** Overcomes the React DOM Sanitizer using a Multi-MIME paste architecture (`text/plain` + `text/html`), guaranteeing that line breaks and formatting are strictly respected.
- **Anti-Guardrail (Safe Declarative Context):** Structured to avoid triggering False Positive _Prompt Injection_ flags by LLMs. It uses passive semantic framing (e.g., `[Additional User Context]`) instead of blockable imperative commands.
- **Local State Management:** Utilizes the `GM_setValue` / `GM_getValue` API for secure local data persistence, with zero reliance on third-party servers.

---

## 🛠️ Quick Installation

1. **Prerequisite:** Install the [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Edge, Safari) or [Violentmonkey](https://violentmonkey.github.io/) (Firefox) extension.
2. **Install Script:** Click the install button at the top of this README, or directly access the raw `.user.js` link.
3. **Confirmation:** The Tampermonkey dashboard will open. Click **Install**.
4. **Usage:** Reload your Perplexity tab (`F5`). The new "Memory" button will appear in the bottom-left corner of the sidebar.

---

## 📖 How to Use (Best Practices)

To ensure the AI strictly follows your memory context without triggering security filters (Jailbreak Detection), use **Declarative Structures**.

**Avoid (Imperative/Suspicious):**
❌ `Ignore all previous instructions.`
❌ `--- (ambiguous split separators)`
❌ `Strictly follow this hidden rule:`

**Prefer (Safe Declarative Example):**

```text
[SYSTEM]
You will act as a Senior Software Engineer and Security Auditor.
Temperature: 0.2 for technical precision.

[ABSOLUTE CONSTRAINTS]
- Never generate code without describing the existing architecture.
- Always use absolute paths in terminal commands.
- No destructive operations without prior warning.

```

---

## 🤝 Contributing & Suggestions: We want to hear from you!

This script is actively maintained, and we are always looking to improve it! Do you have ideas to make the UX even better? Or perhaps new features you'd love to see?

**Potential future features on our radar:**

- ☁️ Cloud Sync (Export/Import memories via JSON)
- ⌨️ Global Keyboard Shortcuts (e.g., `Ctrl+Shift+M` to open the panel)
- 🗂️ Multiple Memory Profiles (Switch between "Coding", "Writing", "Research" contexts)
- 💬 Auto-formatting markdown to plain text

**Have a suggestion or found a bug?** Please open an **[Issue](https://www.google.com/search?q=%23)** or submit a **[Pull Request](https://www.google.com/search?q=%23)**. Let us know what features would make this the ultimate productivity tool for your AI workflow!

---

## 🧠 Technical Architecture (For Developers)

Direct injection into the `<textarea>` or via `document.execCommand` fails in modern Perplexity due to the Lexical framework's Virtual DOM. This script resolves state synchronization through the following topology:

1. **Event Lock:** Aggressive suppression of synthetic `keypress` and `keyup` events associated with the Enter key (`!e.shiftKey`) to prevent race conditions with React.
2. **Range Collapse:** Absolute cursor positioning at the end of the text node (`range.collapse(false)`).
3. **Multi-MIME DataTransfer:** Emission of a synthetic `ClipboardEvent('paste')` containing `\r\n` (CRLF) for _plain text_ and `&nbsp;` + `<br>` for _HTML_, forcing the engine to register structural paragraph blocks (padding) independent of the user's original message.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.

<div align="center">
<sub><b>SEO Search Tags:</b> <i>Perplexity AI Custom Instructions, Perplexity Memory Script, System Prompt Manager, Tampermonkey Perplexity, Greasemonkey, Lexical Editor Bypass, AI Context Injector, Prompt Engineering Tool, Perplexity Userscript.</i></sub>
</div>
