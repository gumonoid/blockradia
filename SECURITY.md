# Security Policy

BlockRadia is a **read-only, multi-chain desktop blockchain explorer** with an optional shared API server. Security reports concerning its Electron desktop application, local HTTP service, shared API, blockchain provider integrations, build pipeline, or release artifacts are welcome.

## Supported versions

| Version | Security support |
| --- | --- |
| Current `main` branch | Actively maintained |
| Latest published desktop release | Best-effort security fixes |
| Older releases | Not guaranteed |

Check the [latest release](https://github.com/gumonoid/blockradia/releases/latest) and [changelog](CHANGELOG.md) before reporting. A fix on `main` is not necessarily present in a published desktop package; check release notes for the affected version.

## Report a vulnerability privately

**Do not open a public issue or pull request containing exploitation steps, secrets, or sensitive data.**

1. If you have repository access and the appropriate permissions, open a **draft security advisory** from the repository's **Security → Advisories** section.
2. Otherwise, request a private reporting channel from the repository maintainer [@gumonoid](https://github.com/gumonoid). Do **not** put vulnerability details in a public message or issue. If a private contact method is not listed, request one without revealing the issue itself.
3. If a private reporting feature becomes available in the repository, use that in preference to public issue discussions.

Include, where safe:
- Affected BlockRadia version or commit, operating system, and relevant configuration (desktop loopback vs. shared API).
- A concise description of the impact and the trust boundary involved.
- Reproduction steps using your **own** test data, together with expected and actual results.
- Sanitized logs or a minimal proof of concept. Redact provider tokens, IP addresses, wallet investigation notes, and other potentially identifying details.
- Any suggested mitigation or patch.

Maintainers will triage reports and coordinate a fix and disclosure as capacity permits. Acknowledgement and remediation times are **not guaranteed**. Please allow time to investigate before public disclosure.

## In-scope issues

Examples include:
- Electron renderer isolation bypass, unsafe IPC, navigation to untrusted origins, or unintended operating-system access.
- Unauthorized access to the desktop's `127.0.0.1` HTTP API, cross-origin request bypass, or file/path traversal.
- Injection or unsafe rendering of untrusted blockchain data, token metadata, or provider responses.
- Sensitive data exposure from the shared API, local investigation data, server logs, or bundled assets.
- Authentication or authorization mistakes where an actual protected boundary exists; provider-key leaks; server-side request forgery or material rate-limit bypass.
- Dependency, CI/CD, release, or update-chain compromises with a demonstrated security impact.

BlockRadia does **not** import private keys, sign transactions, or move funds. Never send private keys, wallet seed phrases, or real credentials in a report.

## Responsible research

- Use systems, addresses, and accounts that you own or are authorized to test.
- Keep tests non-destructive, low-volume, and within applicable laws and provider terms.
- Do not access other users' local profiles, investigations, secrets, or infrastructure.
- Do not attempt denial of service, data destruction, persistence, social engineering, or attacks against third-party blockchain providers.
- Stop and report privately if you encounter another person's sensitive information.

There is **no published bug bounty or guaranteed safe-harbor program**. Testing permissions are not expanded by this document.

## Known boundaries and limitations

- The shared API handles **public blockchain addresses and queries** and may expose requests to upstream data providers. Hosting services may retain access logs; see [shared API documentation](docs/SHARED_SERVER.md).
- Investigation notes, labels, and history are stored locally unless the user explicitly exports them.
- Some providers offer incomplete or rate-limited history. Missing transfers, incomplete address attribution, and stale market data are not automatically security vulnerabilities.
- Current Windows releases may be **unsigned**, and macOS packages may use **ad-hoc signing**. Obtain packages only from [official GitHub releases](https://github.com/gumonoid/blockradia/releases), compare available SHA-256 checksums, and see the [signing status and roadmap](docs/RELEASE_SIGNING.md). Checksums detect changes relative to the published checksum file; they do not replace authenticated code signing.
- Releases depend on external data providers and network connectivity; never use unverified explorer output as the sole basis for irreversible financial decisions.

## Maintenance practices

Contributors and maintainers should:
- Keep provider keys and signing credentials in environment variables or GitHub Actions secrets, **never** in source code, desktop bundles, issue reports, or logs.
- Review dependency updates and CI failures, and run `npm run check`, `npm test`, and `npm run build` before release.
- Preserve Electron sandboxing, context isolation, restricted IPC and navigation, local-host request validation, and server-side input limits.
- Review changes to `desktop/security.cjs`, `desktop/main.cjs`, `server/`, `app/api/explorer/`, release workflows, and deployment configuration especially carefully.

Thank you for helping keep BlockRadia and its users safe.
