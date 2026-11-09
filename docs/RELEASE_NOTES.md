# BlockRadia desktop release

Search public blockchain addresses, inspect balances and transaction history, and explore counterparties in the wallet graph. An internet connection is required for live data. The interface defaults to English and can be changed in Settings. No wallet connection or private key is required.

Choose from six themes in Settings or enter a custom HEX color. BlockRadia shows the selected theme's HEX value and remembers your choice across restarts. This release also improves recovery when wallet data providers limit requests and hardens the shared API.

- **Windows x64:** requires Windows 10 or later. Open the portable EXE. Windows SmartScreen may warn that the publisher is unknown.
- **macOS:** choose arm64 for Apple Silicon or x64 for Intel. Open the ad-hoc signed DMG and drag BlockRadia into Applications, or extract the ZIP.
- **Linux x64:** make the AppImage executable and run it. If FUSE is unavailable, extract the tar.gz archive and run the executable inside. The Chromium sandbox must be available.

The Windows executable is unsigned and the macOS builds are ad-hoc signed without notarization. macOS Gatekeeper may require additional approval. SHA256SUMS.txt contains unsigned hashes for checking download integrity.
