<div align="center">

<img src="docs/assets/blockradia-banner.svg" alt="BlockRadia — connect the dots across blockchains" width="100%" />

### A desktop workspace for exploring wallets and following on-chain transfers.

BlockRadia helps both professional blockchain researchers and everyday users explore wallet activity, trace transfers, and understand connections between addresses.

**Real API data · Interactive relationship graphs · Local research history**

[Download](#download) · [Features](#features) · [Supported networks](#supported-networks) · [Build from source](#build-from-source) · [Release notes](CHANGELOG.md)

</div>

---

Known exchange addresses display their exchange logos in graphs, transaction tables, and history. The registry includes 3,077 public address labels across 81 exchange brands and all eight supported networks; [label sources and coverage](docs/EXCHANGE_LABELS.md).

The transaction table includes Confirmed and Pending tabs, address/hash/nickname/exchange search, date bounds, incoming/outgoing direction for an opened wallet, asset and minimum-amount filters. Filters apply to the loaded sample. Column visibility is saved locally. Dates display the computer's time zone.

Selecting dates on any supported network loads up to 100 transactions from its archive for the selected local-calendar period. Bitcoin, EVM, TRON and Solana network overviews locate historical blocks by time; GRAM(TON) uses TON Center time bounds. Wallet queries use date-bounded TON Center/TronGrid requests, block-bounded Alchemy or Blockscout EVM history, and date-anchored Solana signature pagination. Refresh reloads the selected period. Source rate limits and bounded scans are reported as partial results rather than a complete empty history. The EVM RPC fallback only covers direct transactions, not internal or token-only transfers. Solana retains known hashes, slots and dates if some details cannot be decoded. Bitcoin wallet scans stop after 80 pages; EVM fallback scans stop after 256 blocks. Historical unconfirmed transactions are not included.

The desktop app reads TRON and Solana date-range archives directly from public providers using the user's connection, avoiding shared-server data-center restrictions. These archive requests require no user API key. Other networks continue through the shared server when configured. Public archive access remains subject to provider availability and rate limits.

Address alerts support up to ten watched wallets while the app is open. The first successful check establishes a baseline; later checks run roughly once per minute and report newly observed transaction hashes. OS notifications require notification permission; the in-app event list remains available. Checks use each provider's available recent sample and may be delayed or incomplete during rate limits or network failures.

The graph's Saved investigations section stores named local snapshots with notes, node positions, zoom, transfers and nicknames. Open restores the saved snapshot, including its network and root address; JSON exports provide a portable backup. Up to thirty snapshots are retained, subject to local storage capacity. Search history also supports network, record-type and date filters.

## Download

Windows portable is available in v1.1.3. macOS and Linux packages are available in v1.1.2. Choose the package for your operating system. Downloads are hosted in this **private repository**, so you must be signed in to an account with access.

| Platform | Architecture | Download |
| :--- | :--- | :--- |
| **Windows** | Intel / AMD 64-bit | [**Portable EXE**](https://github.com/gumonoid/blockradia/releases/latest/download/BlockRadia-Windows-x64.exe) |
| **macOS** | Apple Silicon — M1 / M2 / M3 / M4 and later | [**DMG**](https://github.com/gumonoid/blockradia/releases/download/v1.1.2/BlockRadia-macOS-arm64.dmg) · [ZIP](https://github.com/gumonoid/blockradia/releases/download/v1.1.2/BlockRadia-macOS-arm64.zip) |
| **macOS** | Intel 64-bit | [**DMG**](https://github.com/gumonoid/blockradia/releases/download/v1.1.2/BlockRadia-macOS-x64.dmg) · [ZIP](https://github.com/gumonoid/blockradia/releases/download/v1.1.2/BlockRadia-macOS-x64.zip) |
| **Linux** | Intel / AMD 64-bit | [**AppImage**](https://github.com/gumonoid/blockradia/releases/download/v1.1.2/BlockRadia-Linux-x86_64.AppImage) · [tar.gz](https://github.com/gumonoid/blockradia/releases/download/v1.1.2/BlockRadia-Linux-x64.tar.gz) |

[All releases](https://github.com/gumonoid/blockradia/releases) · [SHA-256 checksums](https://github.com/gumonoid/blockradia/releases/latest/download/SHA256SUMS.txt) · [Build pipeline](https://github.com/gumonoid/blockradia/actions/workflows/desktop-release.yml)

**Getting started:** open the Windows EXE, install the macOS application from its DMG, or make the Linux AppImage executable and run it. Node.js is **not** required for packaged downloads. An internet connection is required for blockchain and market data.

Windows packages are unsigned; macOS packages use ad-hoc signing and are not notarized. The application interface is in Russian; this repository's documentation is in English. The banner above is an illustration, not a screenshot of live data.

## Features

| Explore | Investigate | Keep your research |
| :--- | :--- | :--- |
| Search public addresses and transaction hashes | View wallets as nodes and transfers as directed edges | Save local nicknames for wallets |
| See native balances and market prices | Expand a neighboring wallet to follow its relationships | Reopen recently investigated addresses |
| Switch between price and network activity charts | Inspect amounts and the transactions behind a connection | Filter and export research history as JSON |
| Browse recent operations and blocks from the loaded sample | Drag nodes, pan, zoom, fit the graph, and use fullscreen | Export transfer tables as CSV and graphs as JSON |

### A search that does not keep you waiting forever

Balance retrieval is independent from transaction-history decoding. The balance can appear first while relationships load. Requests have bounded waiting times, repeated concurrent calls are deduplicated, and background polling pauses during a search. You can cancel a request or retry history without losing the visible balance.

## Supported networks

Base and Polygon wallet history uses Alchemy through the shared server. End users do not need provider keys. Their overview combines recent RPC blocks with growthepie analytics: network-wide daily transactions, daily active addresses, and a 30-day activity chart. Daily statistics show their UTC date and source; they are not all-time transaction or address totals. The current incomplete UTC day is excluded. [growthepie definitions and coverage](https://docs.growthepie.com/).

| Network | Native asset | Data source | Relationship coverage |
| :--- | :---: | :--- | :--- |
| Bitcoin | BTC | Blockstream Esplora | Balance, recent confirmed and pending transactions, UTXO outputs; graph attribution limited to single-input-address transactions |
| Ethereum | ETH | Blockscout / public RPC | Native, ERC-20, and internal transfers when the indexer is available |
| TRON | TRX | TronGrid | Recent native transfers and TRC-20 transfers |
| Solana | SOL | Solana Mainnet RPC | Parsed system and supported SPL transfer instructions |
| GRAM(TON) | GRAM(TON) | GRAM(TON) Center v3 | Recent internal GRAM(TON) messages; friendly and raw Mainnet addresses |
| Base | ETH | Alchemy / public RPC | Up to 100 incoming and 100 outgoing native, internal, and ERC-20 transfers |
| Arbitrum | ETH | Blockscout / public RPC | Indexed transfers where available; restricted ERC-20 log fallback |
| Polygon | POL | Alchemy / public RPC | Up to 100 incoming and 100 outgoing native, internal, and ERC-20 transfers |
| Optimism | ETH | Blockscout / public RPC | Indexed transfers where available; restricted ERC-20 log fallback |

Native-asset prices and history use Kraken USD pairs for the 1H and 4H ranges and **DefiLlama Coins** for longer ranges. All providers are accessed through the shared server without user keys. Activity charts identify whether they show indexed network statistics, RPC performance intervals, or only the downloaded transaction sample.

### What the graph means

A line represents transfers returned by the selected provider, grouped by direction and asset. Selecting it shows the underlying transactions. A nickname is your own annotation; it does not establish the real-world identity of a wallet owner.

This is a lightweight explorer using public APIs, **not a complete blockchain indexer or an AML attribution database**. Limits and partial failures are shown in the interface:

- EVM indexer responses use the latest available pages. RPC fallback covers a bounded block range and may be restricted by the provider.
- TRON loads up to 100 recent native operations and 100 token operations. Unknown token precision is not guessed.
- GRAM(TON) loads up to 100 recent transactions and their GRAM(TON) messages. Jetton decoding is not included.
- Solana decodes up to 100 recent signatures progressively in extended wallet analysis. Unsupported or unavailable details remain explicitly incomplete.

**No visible connection does not prove that no transfer exists.**

## Your first investigation

Network fees refresh independently on load, once per minute when automatic updates are enabled, on returning to the tab, and with the refresh button. Each quote shows its source and observation time. EVM networks report the mean observed gas price in the latest block (Gwei), with a labelled RPC estimate for empty blocks; additional L1 fees on rollups are excluded. Bitcoin shows a three-block confirmation fee estimate in sat/vB, TRON shows live Energy and Bandwidth burn tariffs in SUN, and Solana/GRAM(TON) show mean observed transaction fees in their native currency. Failed refreshes retain the previous quote with an unavailable notice and its original timestamp.

Fee definitions: [Ethereum execution API](https://ethereum.github.io/execution-apis/next/api/methods/eth_getBlockByNumber/), [Bitcoin fee estimates](https://github.com/Blockstream/esplora/blob/master/API.md#fee-estimates), [TRON resource prices](https://developers.tron.network/docs/bandwidth-and-energy), [Solana fees](https://solana.com/docs/core/fees), and [GRAM(TON) transaction fields](https://docs.ton.org/api/v3/blockchain-data/get-transactions).

The transaction table displays up to 100 recent unique transactions, ten per page. Large transfers are selected from that same sample using the native-currency threshold for each network. Public provider failures or a shorter wallet history can result in fewer rows.

Price charts offer line and Japanese candlestick views for 1H, 4H, 24H, 7D, 14D, 30D, 90D, and 1Y. The 1H range uses 60 one-minute exchange candles; 4H uses 48 five-minute candles from [Kraken public OHLC](https://docs.kraken.com/api-reference/market-data/get-ohlc-data). The current unfinished candle is identified in its tooltip. All networks and periods use Kraken USD OHLC: 24H uses hourly candles, 7D and 14D use four-hour candles, and 30D, 90D and 1Y use daily candles. Exchange failures fall back to a labelled DefiLlama line chart; synthetic candles are not shown. Activity charts use line view only. The price card and chart display signed change over the selected period, green for growth and red for decline. Native wallet balances include an approximate USD valuation using the current available coin price; missing balances or quotes are never treated as zero. Large GRAM(TON) transfers must exceed 500 GRAM(TON); exactly 500 GRAM(TON) is excluded, and outgoing native messages are included.

1. Select the correct network and paste a public wallet address or transaction hash. Use **Ctrl + K** to focus search.
2. Review the native balance as soon as it arrives; history and graph data follow separately.
3. Select a node, add a nickname, then choose **Expand wallet relationships** in the inspector.
4. Select a connection to inspect its amounts and transaction hashes. Drag the graph or use zoom / fit controls to adjust the view.
5. Open **History** to rename or revisit wallets. Use CSV or JSON export to save the loaded research.

## Build from source

### Shared server mode

New desktop builds use the shared API at `https://blockradia-api.onrender.com`, so desktop users do not need provider keys. The backend, Docker image, and Render deployment configuration are included. See [deployment and desktop configuration](docs/SHARED_SERVER.md). Existing release packages predate this setup. The free preview server can take about a minute to wake after inactivity. Server hosting does not change provider plan restrictions.

### Requirements

- Node.js **22.13 or newer** and npm.
- Git access to this private repository.
- Windows, macOS, or Linux. Native platform packages are built on their corresponding operating systems.

```bash
git clone https://github.com/gumonoid/blockradia.git
cd blockradia
npm ci
npm run desktop:install
npm start
```

`npm start` builds the interface and launches Electron. The first development launch may download the official Electron runtime.

### Indexer API access

Set `BLOCKSCOUT_API_KEY` in the environment before launching BlockRadia to use the official multichain Blockscout API. The key stays in the backend and is never included in API responses or the UI bundle. Access depends on your key's network permissions and plan; Base requires a paid tier according to [Blockscout's Base API documentation](https://docs.blockscout.com/base-api).

Without a key, public explorer endpoints are used. Some endpoints restrict automated access. If an indexer refuses access, the overview loads up to 48 recent blocks as needed to fill the 100-transaction sample through public RPC and labels the activity chart as a sample. Network-wide transaction and address totals remain unavailable rather than being estimated.

### Create desktop packages

Run the appropriate command **on the target operating system**:

```bash
npm run dist:win    # Windows x64 portable executable
npm run dist:mac    # macOS Intel and Apple Silicon DMG / ZIP
npm run dist:linux  # Linux x64 AppImage / tar.gz
```

Build output is written to `release/`. Dependencies, generated bundles, runtime state, credentials, and desktop binaries are excluded from Git.

### Checks

```bash
npm run check
npm test
npm run build
```

Tests cover address validation, token amount precision, GRAM(TON) address canonicalization, independent market-data failures, request deadlines, cancellation, shared in-flight requests, and slow Solana history responses.

## Source map

```text
app/
  page.tsx                     Main explorer and search state
  globals.css                  Responsive UI styles
  api/explorer/route.ts         Read-only API adapters and request budgets
components/explorer/
  WalletGraph.tsx              Interactive transfer graph and node expansion
  HistoryPanel.tsx             Research history and nickname editor
lib/explorer-client.ts         Client deadlines and cancellation
desktop/
  main.cjs                    Electron window and loopback HTTP service
  build.mjs                   UI build and server adapter compilation
  ui/                         React desktop entry point
scripts/checksums.mjs          Release completeness and SHA-256 checks
tests/                        Adapter and timeout regression tests
.github/workflows/             Cross-platform build and release pipeline
```

## How releases are built

The **Build desktop packages** workflow validates the source, builds packages on Windows, macOS, and Linux runners, checks that every required asset exists, and publishes the release only after all three platform builds succeed. It also generates `SHA256SUMS.txt`. Official GitHub Actions are pinned to specific commits.

Maintainers can run it from **Actions → Build desktop packages → Run workflow**, or push a version tag after updating both package versions. A published version is not silently overwritten; a new release requires a version bump.

## Data and privacy

- **Read-only:** no private keys, wallet signatures, or fund transfers are used.
- **Local annotations:** history, bookmarks, and nicknames are stored in the application's local profile. Sharing exports is an explicit action.
- **Internet lookups:** searched public addresses are sent to the corresponding blockchain API providers. Market requests go to DefiLlama Coins.
- **Isolated desktop window:** Node.js access is disabled in the renderer, with sandbox and context isolation enabled.
- **Local service:** the embedded API binds only to `127.0.0.1:19237`. It is not a public web service.

---

<div align="center">

**BlockRadia — make blockchain relationships easier to explore.**

[Download](#download) · [Latest release](https://github.com/gumonoid/blockradia/releases/latest) · [Changelog](CHANGELOG.md)

</div>
