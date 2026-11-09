# BlockRadia desktop release

Search public blockchain addresses, inspect balances and transaction history, and explore counterparties in the wallet graph. An internet connection is required for live data. The interface defaults to English and can be changed in Settings. No wallet connection or private key is required.

This release preserves your theme across restarts, starts independently of other local services, and excludes tokens from native large-transfer results.

- **Windows x64:** requires Windows 10 or later. Verify the publisher signature and open the portable EXE.
- **macOS:** choose arm64 for Apple Silicon or x64 for Intel. Open the signed, notarized DMG and drag BlockRadia into Applications, or extract the ZIP.
- **Linux x64:** verify the signed checksum manifest, then make the AppImage executable and run it. If FUSE is unavailable, extract the tar.gz archive and run the executable inside. The Chromium sandbox must be available.

Downloads are available without a GitHub account. Verify `SHA256SUMS.txt.sig` using the public key you obtained from the maintainer before checking the package hash. See [release verification instructions](https://github.com/gumonoid/blockradia/blob/main/docs/RELEASE_SIGNING.md).
