# Chill Learn — Microsoft Edge Extension Package

This folder contains the complete, ready-to-publish Microsoft Edge extension package for **Chill Learn**.

## Package Contents

```
edge-package/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker background script
├── content.js             # Content script for YouTube integration
├── content.css            # Styles for lesson overlay
├── core.js                # Core lesson/quiz logic
├── importer.js            # Lesson import/parsing logic
├── i18n.js                # Internationalization (VI/EN)
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── import.html            # Lesson import page
├── import.js              # Import page logic
├── results.html           # Results/history page
├── results.js             # Results page logic
├── ui.css                 # Shared UI styles
├── icons/
│   ├── icon16.png         # 16x16 toolbar icon
│   ├── icon48.png         # 48x48 management page icon
│   └── icon128.png        # 128x128 store listing icon
├── lib/
│   ├── pdf.min.mjs        # PDF.js library (ES module)
│   ├── pdf.worker.min.mjs # PDF.js worker
│   └── pdfjs-LICENSE.txt  # PDF.js license
├── samples/               # Built-in sample lessons (15+ files)
│   ├── bai-hoc-chuan.md
│   ├── bai-mau.md
│   ├── cloze-anki.txt
│   ├── demo-nhanh-1-phut.md
│   ├── flashcard-cap-tu.txt
│   ├── flashcard.csv
│   ├── gan-dung-dinh-dang.md
│   ├── ghi-chu.md
│   ├── he-mat-troi.md
│   ├── hoi-dap-qa.txt
│   ├── hoi-dap.csv
│   ├── huong-dan-su-dung.md
│   ├── ky-nang-hoc-tap.md
│   ├── python-co-ban.md
│   ├── tieng-nhat-chao-hoi.md
│   ├── user-guide-en.md
│   └── van-ban-thuong.txt
├── PRIVACY_POLICY.md      # Privacy policy for store listing
└── STORE_LISTING.md       # Store listing details & keywords
```

## Installation (Development)

1. Open Microsoft Edge
2. Navigate to `edge://extensions`
3. Enable **Developer mode** (bottom-left toggle)
4. Click **Load unpacked**
5. Select this `edge-package` folder

## Publishing to Microsoft Edge Add-ons

### Prerequisites
- Microsoft Partner Center developer account
- Verified identity (individual or organization)

### Steps

1. **Create ZIP package** (already done: `chill-learn-edge-extension.zip` in parent folder)
   - Contains all files above except this README
   - Size: ~600 KB

2. **Register at Partner Center**
   - Go to https://partner.microsoft.com/dashboard/microsoftedge
   - Sign in with Microsoft account
   - Complete developer registration ($19 one-time fee for individuals)

3. **Submit Extension**
   - Click "Create new extension"
   - Upload `chill-learn-edge-extension.zip`
   - Fill in store listing details (see `STORE_LISTING.md`)
   - Upload privacy policy (see `PRIVACY_POLICY.md`)
   - Add screenshots & promotional images
   - Submit for certification

4. **Certification Review**
   - Typically 1-3 business days
   - Reviewers test functionality, privacy, security
   - May request changes if issues found

### Store Listing Checklist

- [ ] Extension name: "Chill Learn — Interactive Lessons on YouTube"
- [ ] Short description (≤132 chars)
- [ ] Detailed description with features
- [ ] Category: Productivity > Education
- [ ] Keywords: learning, education, youtube, lessons, quiz, markdown, interactive, study, language, tutorial, offline, privacy
- [ ] Privacy policy URL
- [ ] Support contact (GitHub issues)
- [ ] Screenshots (6+ recommended)
- [ ] Promotional images (small tile, large tile, hero)
- [ ] Certification notes for reviewers

## Technical Compliance

✅ **Manifest V3** — Modern, secure architecture  
✅ **No remote code** — All code bundled locally  
✅ **Minimal permissions** — Only `storage` + YouTube host access  
✅ **No external requests** — Fully offline operation  
✅ **Privacy policy** — Comprehensive, GDPR/CCPA aligned  
✅ **Open source** — Full code on GitHub for audit  

## Version History

- **1.2.1** — Current version (Edge-ready package)
- **1.2.0** — Added PDF import, improved quiz types
- **1.1.0** — Internationalization (VI/EN), results page
- **1.0.0** — Initial release with core lesson/quiz functionality

## Support

- **GitHub Repository**: https://github.com/tuanba2308/Chill-Learning
- **Issues**: https://github.com/tuanba2308/Chill-Learning/issues
- **Documentation**: See main repository README.md

---

**Ready for Microsoft Edge Add-ons submission!** 🚀