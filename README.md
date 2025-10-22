# Web Monitor – VMI e‑parduotuvė `eshop_total`

Monitors the public page https://www.vmi.lt/pardavimai/lt/e-parduotuve every 30 minutes and alerts via a GitHub Issue when the value inside `<span id="eshop_total">…</span>` changes. State is stored in `state.json` in the repo, and only changes trigger commits/issues.

- Free on public repositories (GitHub Actions schedule)
- No external services or secrets required
- Uses built‑in Node.js `fetch` (Node 20)
 - Optional Telegram notification on change (set two secrets)

## How it works

1. A scheduled workflow runs every 30 minutes (UTC) and on manual trigger.
2. `scripts/check.mjs` fetches the page, extracts the integer from `#eshop_total`, and compares with `state.json`.
3. If it changed, the workflow:
   - Commits the new value to `state.json`
   - Creates a new GitHub Issue with details (GitHub will notify you if you watch the repo)
   - Optionally sends a Telegram message if secrets are configured

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

### Email notifications

- GitHub will email you when a new Issue is created if your notification settings allow it and you "Watch" the repository (Watch → All Activity).

### Telegram notifications (optional)

1. Create a Telegram bot via @BotFather, get the bot token.
2. Obtain your chat id. Easiest: message your bot once, then use a bot like @userinfobot or call `getUpdates` on your bot to see the chat id.
3. In your GitHub repo Settings → Secrets and variables → Actions → New repository secret, add:
   - `TELEGRAM_BOT_TOKEN` = your bot token
   - `TELEGRAM_CHAT_ID` = your chat id
4. The workflow will send a message only when a change is detected.

## Notes

- Network errors are logged but do not fail the workflow.
- The workflow only runs on schedule or manual dispatch, so `state.json` commits won't re-trigger it.
