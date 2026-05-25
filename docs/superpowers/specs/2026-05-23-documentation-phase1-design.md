# Documentation Phase 1 — README + In-App Manual (Cloud) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the GitHub README and the in-app HelpModal to cover v0.25.0 cloud features (Cloud File Browser, automatic upload, GDrive upsert), with full i18n across all 15 languages.

**Architecture:** Three parallel deliverables — (1) README surgical update, (2) HelpModal new Cloud tab + Settings tab patch, (3) i18n strings for all 15 languages. No new components introduced; the existing `ScreenCard` pattern is reused.

**Tech Stack:** React 19 + TypeScript, react-i18next, Radix UI Dialog, Lucide icons, Tailwind CSS, Markdown (README)

---

## Scope

### In scope

- `README.md` — Features list, new Cloud Destinations section, Quick Start step 6
- `src/components/HelpModal.tsx` — new Cloud tab, Settings tab note
- `src/i18n/locales/*/common.json` — all 15 language files

### Out of scope

- Screenshots (no new screenshots for cloud; existing ones stay)
- README architecture section, contributing section, development section
- Any backend changes

---

## Design Decisions

### README — surgical update only

The existing README is solid. We only touch three areas:

1. Features list — add cloud bullet
2. New `## Cloud Destinations` section (table of providers + supported operations)
3. Quick Start — add Step 6 for cloud delivery

### HelpModal — reuse existing ScreenCard pattern

`ScreenCard` already accepts `title`, `icon`, `children`, `tips`, and optional `screenshot`. The Cloud tab uses three `ScreenCard` instances with no `screenshot` (no screenshots exist yet for cloud UI):

- Card 1: Cloud Destinations (what it is, providers)
- Card 2: Cloud File Browser (Browse button, navigate, download, delete)
- Card 3: Automatic Upload (post-job trigger, retries, backoff)

The tab is inserted between Settings and Logs in `SCREEN_TABS` and `TAB_COUNTS`.

### Settings tab patch

Add a single list item `{t('help.screens.settings.cloud')}` to the existing Settings card bullet list. The text reads "Cloud — manage cloud profiles, credentials, and browse remote files (see Cloud tab)".

### I18n — English source, 14 machine-translated

`en/common.json` is written by hand with correct technical terminology. The other 14 languages (`pt`, `es`, `fr`, `de`, `it`, `ja`, `ko`, `nl`, `pl`, `ru`, `sv`, `tr`, `ar`, `zh`) receive translations derived from the English source. Technical terms (FTP, SFTP, SMB, S3, GDrive, VMAF, LUFS) are kept in English in all languages.

### New i18n key structure

```
help.tabs.cloud                         → "Cloud"
help.screens.cloud.title                → "Cloud — Destinations & File Browser"
help.screens.cloud.desc                 → intro paragraph
help.screens.cloud.destinations.title   → "Cloud Destinations"
help.screens.cloud.destinations.desc    → what it is + providers table text
help.screens.cloud.destinations.tip1    → iCloud browse limitation
help.screens.cloud.destinations.tip2    → credentials stored locally
help.screens.cloud.destinations.tip3    → GDrive resolves folders by name
help.screens.cloud.browser.title        → "Cloud File Browser"
help.screens.cloud.browser.desc         → Browse button, navigation, actions
help.screens.cloud.browser.tip1         → select multiple with checkboxes
help.screens.cloud.browser.tip2         → download uses native file dialog
help.screens.cloud.browser.tip3         → delete is permanent, no recycle bin
help.screens.cloud.upload.title         → "Automatic Upload"
help.screens.cloud.upload.desc          → post-job trigger + retries
help.screens.cloud.upload.tip1          → multiple destinations per job
help.screens.cloud.upload.tip2          → upload status in job detail
help.screens.cloud.upload.tip3          → failed uploads logged in Logs tab
help.screens.settings.cloud             → "Cloud — manage profiles and browse remote files (see Cloud tab)"
```

---

## File Changes

| File                              | Action                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `README.md`                       | Modify — add Features bullet, Cloud Destinations section, Quick Start step 6                            |
| `src/components/HelpModal.tsx`    | Modify — add `cloud` to `ScreenTab`, `SCREEN_TABS`, `TAB_COUNTS`; add Cloud tab JSX; patch Settings tab |
| `src/i18n/locales/en/common.json` | Modify — add `help.tabs.cloud`, `help.screens.cloud.*`, `help.screens.settings.cloud`                   |
| `src/i18n/locales/pt/common.json` | Modify — Portuguese translations                                                                        |
| `src/i18n/locales/es/common.json` | Modify — Spanish                                                                                        |
| `src/i18n/locales/fr/common.json` | Modify — French                                                                                         |
| `src/i18n/locales/de/common.json` | Modify — German                                                                                         |
| `src/i18n/locales/it/common.json` | Modify — Italian                                                                                        |
| `src/i18n/locales/ja/common.json` | Modify — Japanese                                                                                       |
| `src/i18n/locales/ko/common.json` | Modify — Korean                                                                                         |
| `src/i18n/locales/nl/common.json` | Modify — Dutch                                                                                          |
| `src/i18n/locales/pl/common.json` | Modify — Polish                                                                                         |
| `src/i18n/locales/ru/common.json` | Modify — Russian                                                                                        |
| `src/i18n/locales/sv/common.json` | Modify — Swedish                                                                                        |
| `src/i18n/locales/tr/common.json` | Modify — Turkish                                                                                        |
| `src/i18n/locales/ar/common.json` | Modify — Arabic                                                                                         |
| `src/i18n/locales/zh/common.json` | Modify — Chinese                                                                                        |

---

## Cloud Destinations — Provider Reference (for README and i18n)

| Provider     | Protocol  | Browse | Upload | Download | Delete | Notes                                 |
| ------------ | --------- | ------ | ------ | -------- | ------ | ------------------------------------- |
| FTP          | FTP/FTPS  | ✅     | ✅     | ✅       | ✅     | Plain FTP or explicit TLS             |
| SFTP         | SSH       | ✅     | ✅     | ✅       | ✅     | Key-based or password auth            |
| SMB          | CIFS/SMB2 | ✅     | ✅     | ✅       | ✅     | Windows shares, NAS                   |
| S3           | HTTPS     | ✅     | ✅     | ✅       | ✅     | AWS S3 and compatible (MinIO, Wasabi) |
| Google Drive | HTTPS     | ✅     | ✅     | ✅       | ✅     | OAuth device flow; upsert on upload   |
| iCloud       | —         | ❌     | ❌     | ❌       | ❌     | Not supported (Apple restriction)     |

---

## Acceptance Criteria

- [ ] README renders correctly on GitHub (no broken Markdown)
- [ ] Cloud Destinations section appears between Transcoding Profiles and Keyboard Shortcuts
- [ ] HelpModal opens Cloud tab without errors in dev mode
- [ ] Cloud tab shows 3 ScreenCards with correct content
- [ ] Settings tab shows new Cloud bullet
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] All 15 language files are valid JSON (`node -e "require('./src/i18n/locales/XX/common.json')"`)
- [ ] Switching language in Settings reflects Cloud tab content in the new language
- [ ] i18n fallback works (if a key is missing, English is shown, not an error key)
