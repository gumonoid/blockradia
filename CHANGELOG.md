# Changelog

## 1.1.4

- Show transaction timestamps separately from refresh times, with clearer history coverage and filters.
- Focus the wallet graph on incoming or outgoing transfers and reveal complete addresses in tables.
- Include indexed Jetton transfers in TON wallet history and load more indexed token and internal transfers on supported EVM networks.
- Import investigation snapshots and optionally keep address monitoring active in the Windows system tray after closing the window.
- Reject backslash paths in the local desktop HTTP server consistently across platforms.
- Check packaged desktop startup in the release pipeline.

## 1.1.3

- Pace Solana transaction requests through a shared queue and honor RPC rate-limit cooldowns.
- Retain decoded transactions in a bounded in-memory cache to reduce repeat requests.
- Allow additional time for queued Solana transaction lookups while keeping cancellation and deadlines.

## 1.1.2

- Publish the complete desktop application source in `main`.
- Add native packaging for Windows x64, macOS Intel / Apple Silicon, and Linux x64.
- Add a verified, cross-platform GitHub Actions release pipeline and SHA-256 checksums.
- Add English project documentation and platform download links.

## 1.1.1

- Load the native balance independently from transaction history.
- Bound client and server operations, including API queues, retries, and response decoding.
- Keep the balance visible when history fails; add cancellation, status, elapsed time, and retry.
- Deduplicate simultaneous requests and avoid caching failures.
- Limit Solana decoding to six recent signatures per expansion.
- Pause background polling while an address search is active.

## 1.1.0

- Add TON, independent market prices, interactive relationship graphs, local nicknames, and search history.
- Add graph JSON and transaction CSV exports.
