# BlockRadia in Telegram

The Mini App serves the same BlockRadia interface and assets as the desktop build. Wallet lookup, transaction history, graphs, exchange labels, AML, themes and saved investigations use the shared UI. Data requests go to the same host as the Mini App, through the existing explorer API and its rate limits.

1. Deploy the repository Dockerfile to an HTTPS host. The container serves the Mini App at `/` and health checks at `/healthz`. Keep blockchain provider credentials in the deployment environment.
2. Create a bot with [@BotFather](https://t.me/BotFather). Set its menu button with `/setmenubutton`, label it **Open BlockRadia**, and use the deployed HTTPS URL. Enable Main Mini App under the bot's settings if you also want a launch button on the profile.
3. Open the bot's private chat and tap **Open BlockRadia**.

The menu button also can be configured with `node scripts/configure-telegram.mjs`. Set `BLOCKRADIA_MINI_APP_URL` and `TELEGRAM_BOT_TOKEN` in your local environment first. The menu button requires no running bot worker. Keep the token out of the repository and frontend.

For a browser preview from PowerShell:

```powershell
npm ci
npm run build
$env:BLOCKRADIA_WEB_DIR = (Resolve-Path desktop/ui-dist).Path
npm run server:start
```

Open `http://127.0.0.1:8080/`. To check Telegram-specific behavior, use the deployed HTTPS URL in a Telegram client. Telegram fullscreen and safe area handling depend on client version. Saved data belongs to the Mini App's local WebView storage. Desktop tray monitoring is specific to Electron. Export, clipboard and graph fullscreen depend on WebView capabilities.
