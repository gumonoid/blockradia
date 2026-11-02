<div align="center">

<img src="docs/assets/blockradia-banner.svg" alt="BlockRadia — connect the dots across blockchains" width="100%" />

### A desktop workspace for exploring wallets and following on-chain transfers.

BlockRadia helps both professional blockchain researchers and everyday users explore wallet activity, trace transfers, and understand connections between addresses.

**Real API data · Interactive relationship graphs · Local research history**

[Download](#download) · [Features](#features) · [Supported networks](#supported-networks) · [Build from source](#build-from-source) · [Release notes](CHANGELOG.md)

</div>

---

Known exchange addresses display their exchange logos in graphs, transaction tables, and history. The initial registry covers selected public addresses of Binance, Coinbase, OKX, Kraken, Bybit, and MEXC; [label sources and coverage](docs/EXCHANGE_LABELS.md).

## Download

The existing v1.1.2 downloads were published under the former name **Chainlens**. They retain their original filenames and branding; this source rename does not publish a new release.

Choose the package for your operating system. Downloads are hosted in this **private repository**, so you must be signed in to an account with access.

| Platform | Architecture | Download |
| :--- | :--- | :--- |
| **Windows** | Intel / AMD 64-bit | [**Portable EXE**](https://github.com/gumonoid/blockradia/releases/latest/download/Chainlens-Windows-x64.exe) |
| **macOS** | Apple Silicon — M1 / M2 / M3 / M4 and later | [**DMG**](https://github.com/gumonoid/blockradia/releases/latest/download/Chainlens-macOS-arm64.dmg) · [ZIP](https://github.com/gumonoid/blockradia/releases/latest/download/Chainlens-macOS-arm64.zip) |
| **macOS** | Intel 64-bit | [**DMG**](https://github.com/gumonoid/blockradia/releases/latest/download/Chainlens-macOS-x64.dmg) · [ZIP](https://github.com/gumonoid/blockradia/releases/latest/download/Chainlens-macOS-x64.zip) |
| **Linux** | Intel / AMD 64-bit | [**AppImage**](https://github.com/gumonoid/blockradia/releases/latest/download/Chainlens-Linux-x86_64.AppImage) · [tar.gz](https://github.com/gumonoid/blockradia/releases/latest/download/Chainlens-Linux-x64.tar.gz) |

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

| Network | Native asset | Data source | Relationship coverage |
| :--- | :---: | :--- | :--- |
| Ethereum | ETH | Blockscout / public RPC | Native, ERC-20, and internal transfers when the indexer is available |
| TRON | TRX | TronGrid | Recent native transfers and TRC-20 transfers |
| Solana | SOL | Solana Mainnet RPC | Parsed system and supported SPL transfer instructions |
| **TON** | **TON** | **TON Center v3** | Recent internal TON messages; friendly and raw Mainnet addresses |
| Base | ETH | Blockscout / public RPC | Indexed transfers where available; restricted ERC-20 log fallback |
| Arbitrum | ETH | Blockscout / public RPC | Indexed transfers where available; restricted ERC-20 log fallback |
| Polygon | POL | Blockscout / public RPC | Indexed transfers where available; restricted ERC-20 log fallback |
| Optimism | ETH | Blockscout / public RPC | Indexed transfers where available; restricted ERC-20 log fallback |

Native-asset prices and price history come independently from **DefiLlama Coins**. Activity charts identify whether they show indexed network statistics, RPC performance intervals, or only the downloaded transaction sample.

### What the graph means

A line represents transfers returned by the selected provider, grouped by direction and asset. Selecting it shows the underlying transactions. A nickname is your own annotation; it does not establish the real-world identity of a wallet owner.

This is a lightweight explorer using public APIs, **not a complete blockchain indexer or an AML attribution database**. Limits and partial failures are shown in the interface:

- EVM indexer responses use the latest available pages. RPC fallback covers a bounded block range and may be restricted by the provider.
- TRON loads up to 50 recent native operations and 50 token operations. Unknown token precision is not guessed.
- TON loads up to 50 recent transactions and their TON messages. Jetton decoding is not included.
- Solana decodes up to six recent signatures per expansion. Unsupported or unavailable details remain explicitly incomplete.

**No visible connection does not prove that no transfer exists.**

## Your first investigation

1. Select the correct network and paste a public wallet address or transaction hash. Use **Ctrl + K** to focus search.
2. Review the native balance as soon as it arrives; history and graph data follow separately.
3. Select a node, add a nickname, then choose **Expand wallet relationships** in the inspector. The current UI uses the Russian label `Раскрыть связи кошелька`.
4. Select a connection to inspect its amounts and transaction hashes. Drag the graph or use zoom / fit controls to adjust the view.
5. Open **History** (`История`) to rename or revisit wallets. Use CSV or JSON export to save the loaded research.

## Build from source

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

Tests cover address validation, token amount precision, TON address canonicalization, independent market-data failures, request deadlines, cancellation, shared in-flight requests, and slow Solana history responses.

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
