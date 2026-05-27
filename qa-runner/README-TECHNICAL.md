# Nexora QA Runner — Technical Notes

## Scope

This is an isolated QA subproject for Nexora Desktop. It deliberately avoids modifying the main app code, root package scripts, Tauri config, sidecar code, or existing tests.

## Entry point

```bash
node qa-runner/scripts/qa-runner.mjs --suite quick
```

Supported suites:

- `quick`
- `complete`
- `video`
- `stress-light`
- `stress-heavy`
- `soak`

Options:

```text
--suite <name>
--video-dir <path>
--duration <seconds>
--no-start-app
--no-open
--help
```

## Architecture

- `scripts/qa-runner.mjs`: orchestration.
- `scripts/detect-app.mjs`: app/process detection and safe startup hooks.
- `scripts/video-input.mjs`: video discovery and isolated copy.
- `scripts/collect-metrics.mjs`: lightweight system metrics and CSV.
- `scripts/generate-report.mjs`: HTML, Markdown, JSON, stats and AI handoff.
- `scripts/logger.mjs`: user-facing and debug logs.

## Reports

Every run writes:

```text
.logs/qa-runs/<timestamp>/
  index.html
  report.md
  report.json
  ai-handoff.md
  stats.json
  metrics.csv
  system-snapshot.json
  qa-input/
  logs/
  screenshots/
```

## Current limitations

The first implementation is a safe, non-destructive external runner. It does not yet drive the live Tauri UI through WebDriver because that would require adding tooling and possibly test selectors in the main app. Those changes should be planned separately if deeper E2E automation is required.

## Safety invariant

The runner can read from project fixtures and optional video folders, but it works on copies only. It must not delete or modify source videos.
