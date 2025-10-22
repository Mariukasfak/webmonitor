# Web Monitor – VMI e‑parduotuvė `eshop_total`

Monitors the public page https://www.vmi.lt/pardavimai/lt/e-parduotuve every 30 minutes and alerts via a GitHub Issue when the value inside `<span id="eshop_total">…</span>` changes. State is stored in `state.json` in the repo, and only changes trigger commits/issues.

- Free on public repositories (GitHub Actions schedule)
- No external services or secrets required
- Uses built‑in Node.js `fetch` (Node 20)

## How it works

1. A scheduled workflow runs every 30 minutes (UTC) and on manual trigger.
2. `scripts/check.mjs` fetches the page, extracts the integer from `#eshop_total`, and compares with `state.json`.
3. If it changed, the workflow:
   - Commits the new value to `state.json`
   - Creates a new GitHub Issue with details. If you watch the repo, you'll get notified.

## Setup

1. Create a new public GitHub repository and push these files.
2. Watch the repository (Watch → All Activity) to receive notifications when an alert Issue is created.
3. That's it. The next half-hour tick will run automatically.

Cron timezone: GitHub uses UTC for cron. You can adjust in `.github/workflows/scrape.yml`.

## Local test (Windows PowerShell)

```powershell
# Ensure Node >= 20
node -v

# Run the check script once
node scripts/check.mjs
```

- On first run, it initializes `state.json` without creating an alert.
- On subsequent runs (after the real value changes), it will log a change and the workflow will create an Issue on the next scheduled execution.

## Customize

- Target URL or selector: edit constants at the top of `scripts/check.mjs`.
- Schedule: change the `cron` in `.github/workflows/scrape.yml`.
- Notification channel: by default Issues/notifications are used (simplest, no secrets). If you prefer Telegram/Discord/Slack, add a step to post to a webhook using a repo secret and run it only when `CHANGED == 'true'`.

## Notes

- Network errors are logged but do not fail the workflow.
- The workflow only runs on schedule or manual dispatch, so `state.json` commits won't re-trigger it.
