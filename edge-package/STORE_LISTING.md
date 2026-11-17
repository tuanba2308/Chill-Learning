# Microsoft Edge Add-ons Store Listing for Chill Learn

## Extension Name
**Chill Learn — Interactive Lessons on YouTube**

## Short Description (max 132 characters)
Overlay interactive lessons & quizzes from Markdown files onto YouTube videos. Learn while you watch — completely offline, privacy-first.

## Detailed Description

**Chill Learn** transforms any YouTube video into an interactive learning experience. Import your own Markdown lessons (or use built-in samples) and watch them appear as timed cards overlayed on the video — synchronized to specific timestamps.

### ✨ Key Features

**📚 Markdown-Powered Lessons**
- Write lessons in simple Markdown with `<lesson>`, `<quiz>` blocks
- Support for single-choice, multi-choice, and fill-in-the-blank questions
- Rich formatting: headers, bold, italic, code, tables, colored text, custom fonts
- YAML frontmatter for lesson metadata (title, description)

**⏱️ Smart Timeline Synchronization**
- Timestamp formats: `30s`, `1m30s`, `1:30`, `1h2m`, `90` (seconds)
- Auto-scheduling: lessons adapt to video length (stretch/compress/prioritize)
- Priority system: important content shows first when time is limited
- Seamless navigation: next/previous cards, skip, replay

**🎯 Interactive Overlay**
- Three display modes: Banner (bottom), Card (center), Full-screen
- Draggable, resizable cards with transparent backgrounds
- Works in normal, theater, and fullscreen YouTube modes
- Pauses during ads, resumes automatically

**📊 Progress Tracking & Results**
- Real-time progress bar on YouTube player
- Detailed results screen with score, time spent, wrong answers
- "Retry wrong answers" feature
- Full history with export capability

**🌐 Internationalization**
- Vietnamese (primary) + English UI
- Easy to add more languages via JSON locale files

**🔒 Privacy-First Architecture**
- **Zero data collection** — everything runs locally in your browser
- **No external requests** — no analytics, no AI calls, no tracking
- **Local storage only** — your lessons and progress never leave your device
- **Open source** — full code transparency on GitHub

### 🎓 Perfect For
- Language learning (vocabulary, grammar, listening practice)
- Technical tutorials (coding, software, workflows)
- Educational content (science, history, math)
- Self-paced study with video references
- Creating interactive courses from existing YouTube content

### 📦 Built-in Sample Lessons
- Vietnamese greetings & basics
- Python fundamentals
- Solar system overview
- Learning skills & techniques
- Flashcard templates (CSV, Anki format)
- Q&A formats

### 🛠️ Technical Details
- **Manifest V3** — modern, secure extension architecture
- **Service Worker** background script
- **Content Scripts** for YouTube page integration
- **chrome.storage.local** for offline data persistence
- **PDF.js** integration for importing PDF lessons
- **No external dependencies** — fully self-contained

### 📋 Requirements
- Microsoft Edge (Chromium-based) version 88+
- YouTube.com access

---

## Category
**Productivity** → **Education**

## Keywords / Search Terms
```
learning, education, youtube, lessons, quiz, markdown, interactive, study, language, tutorial, offline, privacy
```

## Screenshots Needed (for store listing)
1. **Main popup** — showing lesson import, sample lessons, settings
2. **YouTube overlay** — lesson card displayed on video with progress bar
3. **Quiz interaction** — multiple choice question on video
4. **Results screen** — score summary with retry option
5. **Import screen** — drag & drop Markdown/PDF import
6. **Settings** — language, display options

## Promotional Images (optional but recommended)
- **Small tile** (440x280): Extension icon + "Chill Learn" text
- **Large tile** (920x680): YouTube video with lesson overlay demo
- **Hero image** (1400x560): Full-width showcase

## Privacy Policy URL
https://github.com/tuanba2308/Chill-Learning/blob/main/PRIVACY_POLICY.md

## Support / Contact
- GitHub Issues: https://github.com/tuanba2308/Chill-Learning/issues
- Repository: https://github.com/tuanba2308/Chill-Learning

## Developer Information
- **Name**: Tuấn Bá
- **Website**: https://github.com/tuanba2308

## Certification Notes for Reviewers
- Extension uses only `storage` permission and YouTube host permissions
- No remote code execution (Manifest V3 compliant)
- All processing is client-side — no server communication
- Sample lessons included for immediate testing
- Open source — full code available for audit

## Testing Instructions for Reviewers
1. Install extension (load unpacked or from store)
2. Click extension icon → "Nạp bài mẫu" (Load sample lesson)
3. Open any YouTube video (e.g., https://youtube.com/watch?v=dQw4w9WgXcQ)
4. Observe lesson cards appearing at timestamps
5. Interact with quiz questions (Enter to submit, 1-9 for options)
6. Complete video → view results screen
7. Test "Làm lại câu sai" (Retry wrong answers)
8. Verify data persists across browser restarts
9. Test import: click "Tải file .md" → select any .md file
10. Test settings: change language, display mode, font size