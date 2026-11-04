# Security review — 2026-11-04

## Scope and method

Source-assisted security assessment of the BlockRadia desktop HTTP server, Electron preload/IPC, public gateway, explorer input handling, CSV export, dependencies and credential handling. This is a bounded review and local exploit simulation, not an independent certification or exhaustive penetration test.

HTTP abuse scenarios were exercised against the actual desktop request-handler code in an isolated Node VM, with mocked provider calls: no external provider was attacked. Gateway tests use ephemeral loopback servers with deliberately small limits. The live Render checks were four read-only GET requests: `/healthz` (200), invalid-network API input (400), `/.env.local` (404) and `/package.json` (404). Responses were JSON with `nosniff` and no wildcard CORS permission. No production stress test, destructive action, credential extraction or operating-system exploit was performed.

## Findings and remediation

| ID | Severity / affected surface | Evidence and resolution |
| --- | --- | --- |
| BR-01 | High upstream advisory; development tooling | Vite 8.0.13 was affected by multiple advisories including Windows launch-editor issues. Updated to 8.3.5, pinned in the lockfile. These advisory ratings do not establish production desktop RCE. No UNC/SMB exploit was run. |
| BR-02 | Moderate upstream advisory; installer tooling | minimatch 9.0.9 and 10.2.6 in the electron-builder tree were affected by glob-pattern amplification. Added a scoped override for affected versions to 11.0.4; unaffected older major versions remain unchanged. Audits are clean. Builder CLI and file-pattern compilation smoke tests pass; installers were not rebuilt. |
| BR-03 | Medium; local API request abuse | Before remediation, a request with a foreign Origin and `Sec-Fetch-Site: cross-site` reached the desktop API handler (HTTP 200; one mocked provider-handler invocation). Host checking alone was insufficient. Added Origin/Fetch Metadata checks and a required custom client header for the local API. Foreign websites cannot supply that header through a simple request; preflight is rejected by the GET-only server. Tests now verify HTTP 403 before provider access. This is browser request isolation, not authentication against native processes on the same computer. |
| BR-04 | Medium; CSV formula injection | Token symbols are external data. Quoting CSV fields did not prevent a value such as `=1+1` from becoming a spreadsheet formula. CSV export now prefixes formula-like cells with an apostrophe and still escapes quotes. Harmless formula strings were tested; no Excel/DDE execution was attempted. |
| BR-05 | Low; input allowlist | Inherited JavaScript property names such as `constructor` and `__proto__` could pass truthy-object network checks and reach inappropriate processing instead of being rejected. Changed validation to own-property checks. Regression tests require HTTP 400 and zero provider calls. This was not demonstrated as prototype pollution or SSRF. |

Additional Electron hardening validates the IPC sender, main frame and origin for all exposed window-control operations. Permissions are restricted to the app's notifications, fullscreen and sanitized clipboard writing; camera, microphone, geolocation, clipboard reading and device/file permissions are denied. Webview attachment is denied. External links require a parsed HTTPS URL without credentials, controls or backslashes. CSP now also restricts base URLs, form submissions and embedding. These are defense-in-depth improvements; an Electron sandbox escape was not demonstrated.

## Validation

- `npm run check` and `npm run build`: passed.
- Full test suite: **198 passed, 0 failed**, including seven focused security tests.
- `npm audit`: **0 known vulnerabilities** in the root dependency tree.
- `npm audit --prefix desktop`: **0 known vulnerabilities** in the desktop dependency tree, including development dependencies.
- Clean desktop dependency installation with install scripts disabled: passed.
- electron-builder CLI and the actual `FileMatcher` with the overridden minimatch: passed without creating release artifacts.
- Encoded traversal cases were blocked by the existing UI-root containment check; no file-read bypass was demonstrated.
- Known Blockscout key prefixes and PEM private-key markers were not found in tracked files; the Blockscout-prefix history scan also found no matches. The built browser bundle did not contain server credential variable names or the known key-prefix pattern. This is not an exhaustive arbitrary-secret or external-secret-store audit.
- Source review found no application use of `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` to render provider data. No full browser-driven XSS campaign was performed.

## Remaining risks and limits

1. The shared API is intentionally public and unauthenticated. Its per-IP rate limit and global concurrency limit reduce abuse but do not prevent distributed quota exhaustion or consumption of the operator's provider allowance. Provider-side spending/usage caps, global request budgets and stronger client/account quotas should be considered before scaling. Limits were not disabled or bypassed in production.
2. `TRUST_PROXY=true` is safe only behind the intended reverse proxy that supplies the final client address. Direct exposure with attacker-controlled forwarded headers would invalidate that assumption.
3. Research notes, nicknames and snapshots are local plaintext application data. The app does not protect them against malware or another process running with the same user's privileges. Exports inherit the destination folder's protection.
4. No signed installer, OS-level sandbox escape, Electron binary CVE campaign, fuzzing marathon, provider-side authorization test, external account audit, or distributed denial-of-service test was included. A clean npm audit is not proof of an absence of vulnerabilities.
5. The desktop application and any running development server must be restarted to load the fixes. Existing downloadable releases were deliberately not rebuilt or replaced.

## Primary references

- [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron session permission handling](https://www.electronjs.org/docs/latest/api/session)
- [Windows launch-editor advisory](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)
- [minimatch amplification advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
