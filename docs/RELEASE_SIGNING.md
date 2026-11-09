# Signing desktop releases

The Windows and macOS downloads in v1.1.4 predate this signing workflow. For a signed release, use a new version and publish it from the default branch.

## Set up publishing

1. In **Settings → General → Releases**, enable **Release immutability**. It applies to future releases.
2. Add these GitHub Actions secrets:
   - Windows: `WIN_CSC_LINK` (base64 PFX) and `WIN_CSC_KEY_PASSWORD`.
   - macOS: `MAC_CSC_LINK` (base64 P12), `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`. Set the Actions variable `MAC_SIGNING_IDENTITY` to the Developer ID Application certificate identity.
   - Release checksums: `RELEASE_CHECKSUM_PRIVATE_KEY` (Ed25519 private key in PEM format). Generate it locally, keep a secure backup, and distribute the public key through a trusted channel separate from the release assets.
3. Bump the matching versions in the root and desktop manifests and lockfiles. Run **Build desktop packages** on `main`. The workflow builds all platforms in the same run, verifies the Windows signature and macOS notarization, signs the checksum manifest, and uploads the assets to a new draft before publishing it. If a draft is left behind after a failed upload, inspect and remove that draft before retrying.

Generate the checksum key pair with OpenSSL 3:

```sh
openssl genpkey -algorithm ED25519 -out blockradia-release-private.pem
openssl pkey -in blockradia-release-private.pem -pubout -out blockradia-release-public.pem
```

## Verify a download

Obtain `blockradia-release-public.pem` from the maintainer through the trusted channel. In the download directory, use OpenSSL 3 to verify the signature before using the checksum manifest:

```sh
openssl pkeyutl -verify -pubin -inkey blockradia-release-public.pem -rawin -in SHA256SUMS.txt -sigfile SHA256SUMS.txt.sig
sha256sum --ignore-missing --check SHA256SUMS.txt
```

Check that the command reports `OK` for the package you downloaded. On macOS, use `shasum -a 256 --ignore-missing -c SHA256SUMS.txt` in place of `sha256sum`. For a GitHub release marked immutable, you can also verify a download with `gh release verify-asset TAG FILE -R gumonoid/blockradia`.

[GitHub immutable releases](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes) · [Electron Builder code signing](https://www.electron.build/v26/docs/features/code-signing/)
