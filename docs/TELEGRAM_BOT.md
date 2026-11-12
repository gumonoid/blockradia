# BlockRadia chat bot

This branch runs BlockRadia as a Telegram chat bot. Wallet cards, transaction lists, filters and AML findings appear in chat messages with inline buttons. Connections and market charts are PNG images.

## Features

- Nine networks, automatic wallet format detection and checksum validation for Bitcoin, TRON and friendly TON addresses. A valid 32-byte Base58 public key identifies a Solana candidate.
- EVM addresses offer five network choices after checking their balances. An address format cannot establish its active chain or exclude activity on another chain.
- Native balance with approximate USD valuation, exchange attribution, source names, timestamps and coverage warnings.
- History pagination in groups of ten, up to 100 loaded transactions, confirmed/pending views, existing large-transfer thresholds, incoming/outgoing and text filters.
- Transaction lookup, dated archive queries, network overview, current fees and price timeframes.
- AML with the same OFAC and additional snapshots, evidence links and green/yellow/red status as the desktop version. Source freshness and coverage limitations remain visible. Sources refresh hourly on the updated shared API, with the last snapshot retained on failure.
- Direct counterparty list, per-counterparty lookup buttons and PNG graph export.
- Line charts, Kraken OHLC candlesticks with the candles argument, and activity charts via /activity. These are PNG images in chat.
- Per-user recent wallets, nicknames, saved investigation snapshots, notes, JSON reports and configurable CSV columns.
- Private wallet watches, up to ten per user and 100 per bot. Each watch is checked every two minutes. The bot reports newly seen timestamped transactions newer than watch creation, deduplicates them and skips incomplete responses. Coverage follows the provider's loaded sample.
- Automatic checks in groups, enabled by default, up to three detected wallets per message and six requests per minute per chat. Administrators can disable automatic checking.
- SQLite persistence and a user data deletion command. Personal saved lists and watch management are restricted to private chats. Callback buttons are scoped to the user and chat that created them and expire after a day.

The bot reuses the public read-only explorer API. Credentials for blockchain providers stay on that API server. The bot needs its own Telegram token. Initial command descriptions are Russian and report labels are English with bilingual help and notices.

## Local launch

Requires Node.js 22.13 or newer. Set TELEGRAM_BOT_TOKEN securely in your local environment, then run:

On Windows, double-click bot/start-local.cmd. It checks Node.js and prompts for a hidden token if the environment variable is absent. The token is passed only to the current process and is not saved to a file. Keep the console open. Ctrl+C stops the bot. The launcher installs npm dependencies when they are missing.

~~~powershell
git switch feature/telegram-chat-bot
npm run bot:start
~~~

The bot uses long polling and installs commands and a command menu on startup. Run one polling instance per bot token. If the same bot already uses a webhook, the process stops with instructions. Set TELEGRAM_REPLACE_WEBHOOK=true only when switching that bot to this polling process. Pending updates are preserved.

Open a private chat with the bot and send /start, then a public wallet address. Keep the token out of repository files, screenshots and chats.

If the bot previously had a Main Mini App, disable it in BotFather under /mybots → the bot → Bot Settings → Configure Mini App. The runtime replaces the chat menu button with the command menu, but profile-level Main Mini App configuration is managed separately in BotFather.

## Render launch

Create a separate Docker web service from branch feature/telegram-chat-bot.

| Setting | Value |
| --- | --- |
| Dockerfile path | ./Dockerfile.bot |
| Health check | /healthz |
| TELEGRAM_BOT_TOKEN | Secret token in Render Environment |
| BLOCKRADIA_API_URL | https://blockradia-api.onrender.com |
| BOT_DATA_PATH | Optional SQLite path on a writable persistent volume |

render.bot.yaml is a free preview blueprint without a persistent disk. The free Render web service can sleep, suspending bot replies and watches until it wakes. Ephemeral storage is lost on restarts or deploys. For continuous operation and retained investigations, use an always-running instance with a writable persistent disk and set BOT_DATA_PATH inside the mounted directory, or run locally on an always-on computer. Ensure the container's node user can write to that directory. These resources require a separate hosting decision.

The root URL returns JSON 404. Telegram receives messages through outbound Bot API polling. The bot sets its menu back to commands on startup.

## Enable group checks

1. In [@BotFather](https://t.me/BotFather), use /setjoingroups and enable adding the bot to groups.
2. Use /setprivacy, choose the bot, then Disable. Re-add it to existing groups for the privacy change to take effect. An administrator bot also receives ordinary group messages.
3. Send a public address as ordinary text. BTC, TRON, Solana and TON show a report. EVM addresses show a network selector.
4. Group administrators can use /autodetect off or /autodetect on. Commands addressed to another bot are ignored.

With privacy mode enabled, direct commands such as /wallet@YourBot ethereum 0x... can still be used. The bot cannot change BotFather's privacy setting.

## Examples

~~~text
/wallet ethereum 0x28c6c06298d514db089934071355e5743bf21d60
/history bitcoin 1BoatSLRHtKNngkdXEeobR76b53LETtpyT confirmed
/aml tron TEPSrSYPDSQ7yXpMFPq91Fb1QEWpMkRGfn
/price solana 7d
/fees ethereum
/dates bitcoin 1BoatSLRHtKNngkdXEeobR76b53LETtpyT 2026-11-01 2026-11-02
/timezone Europe/Kyiv
/save Exchange review
/note 1 Verify counterparty provenance
~~~

The /dates command uses UTC boundaries. History lists use the user's /timezone preference. CSV retains source timestamps. /delete_me removes personal watches, saved investigations, nicknames, recent wallets and active sessions. A public reply already sent into a group remains part of that chat.

Telegram may deliver an update again after a crash between sending a message and saving its offset. SQLite commits are atomic and notification baselines persist. Uncertain outgoing sends are not retried automatically. API retention and outages can reduce coverage. Charts and graphs are PNG images; navigation uses lookup buttons and commands.

## Verification

~~~bash
npm run bot:test
npm run check
npm test
~~~

Tests exercise address detection, groups, EVM ambiguity, session ownership, callback actions, notification deduplication, persistence, export escaping and sanitized transport failures.

References: [Telegram Bot API](https://core.telegram.org/bots/api), [privacy mode](https://core.telegram.org/bots/features#privacy-mode), [Render free services](https://render.com/docs/free), [Render disks](https://render.com/docs/disks).

## Extended research commands

See [research workspace](RESEARCH_WORKSPACE.md) for portfolio, comparison, changes, coverage and alert rules.

~~~text
/portfolio add ethereum 0x28c6c06298d514db089934071355e5743bf21d60
/portfolio
/compare ethereum first_address second_address
/changes
/rule 1 USDT 100 in
/aml_update
~~~
