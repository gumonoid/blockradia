# Signing desktop releases

BlockRadia 1.1.3 uses unsigned Windows and ad-hoc signed macOS packages. To sign future releases, supply a Windows code-signing certificate compatible with SignTool and an Apple Developer ID Application certificate with notarization access.

1. Add repository Actions secrets: `WIN_CSC_LINK` (base64 PFX), `WIN_CSC_KEY_PASSWORD`, `MAC_CSC_LINK` (base64 P12), `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`.
2. Set the Actions variable `MAC_SIGNING_IDENTITY` to the Developer ID Application certificate identity. Set `BLOCKRADIA_SIGN_RELEASES` to `true`.
3. Use the main **Build desktop packages** workflow for a fresh release. Leave the artifact reuse field empty. Signed builds fail if the credentials or artifact verification fail. GitHub does not publish a release unless all package jobs succeed.

The workflow verifies Authenticode on the portable EXE, Developer ID signatures on both macOS packages, and a stapled notarization ticket in each macOS app bundle. Keep credentials in Actions secrets and out of source, logs, and desktop packages.

See [electron-builder code signing](https://www.electron.build/v26/docs/features/code-signing/) and [macOS notarization](https://www.electron.build/v26/docs/features/code-signing/notarization/).
