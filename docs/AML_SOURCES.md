# AML evidence aggregation

BlockRadia combines available evidence in the desktop AML panel and the Telegram `/aml network address` report. Both use the same decision rules. It is not a commercial compliance certification or a substitute for a full blockchain indexer.

## Sources

| Source | Data used | Coverage and requirements |
| --- | --- | --- |
| Official OFAC SDN snapshot | Exact listed address, entity, currency/network scope and sanctions program | Root address and direct counterparties in loaded transfers; freshness and unconfirmed network scope remain visible |
| MyEtherWallet historical darklist | Historical community reports, original comments and dates | EVM addresses; reports are not independently verified and a cross-network match needs review |
| Safe Research UK sanctions snapshot | Additional address-list evidence and provenance | EVM addresses; coverage follows the downloaded source |
| [GoPlus Malicious Address API](https://docs.gopluslabs.io/reference/addresscontractusingget_1) | Explicit security flags, including phishing, theft, mixer and sanctions reports | Root address on Ethereum, Base, Arbitrum, Optimism, Polygon and TRON; unavailable and missing fields remain unknown |
| [Blockscout address API](https://github.com/blockscout/blockscout/blob/master/apps/block_scout_web/API.md) | Public address names/tags and the explicit `is_scam` flag | Root address on the five EVM networks above; private tags are ignored; uses `BLOCKSCOUT_API_KEY` on the server when configured, otherwise the public instance API |
| [TRONSCAN account tags](https://docs.tronscan.org/en/api/deep-analysis/account-tag) | Red risk tag separately from blue, grey and public attribution | TRON root address; requires `TRONSCAN_API_KEY` in the API server environment |

Bitcoin, Solana and GRAM(TON) retain the existing list-based checks. The new online address scanners are **not integrated** for those networks; this limitation is shown explicitly. Etherscan, Solscan, Tonviewer and commercial AML products are not presented as connected AML providers merely because BlockRadia links to their address pages. Source access may depend on the provider plan even with a key. No restricted site is scraped or bypassed.

The [GoPlus response definitions](https://docs.gopluslabs.io/reference/response-details-1) describe what each flag means. BlockRadia displays a provider's statement as source evidence, not as its own independently proven allegation. A zero flag means the provider returned no flag for that check; missing fields are not zero.

## Reading the result

- **Red:** an exact address and network match in the fresh official OFAC snapshot.
- **Yellow:** a source reports a signal, a direct counterparty matches, network scope is uncertain, or required data/checks are missing or stale. An online provider's sanctions flag alone is not elevated to an independently verified OFAC match.
- **Green:** no signals in the checked sources and loaded sample, with the required checks current and complete. It is not a safety guarantee.

There is no invented risk percentage and no majority voting between scanners. Providers may reuse the same upstream report. An exchange tag or verified contract does not establish safety. A counterparty match does not establish that the root address is owned by the counterparty, committed wrongdoing or voluntarily accepted an incoming transfer.

Online queries cover the searched root address only. Direct counterparties are checked against downloaded lists; multi-hop exposure and the wallet's entire historical source of funds are not claimed. All positive findings retain their source, and scanner retrieval times are distinguished from incident dates.

## Operation and privacy

The public address and network are sent to the relevant providers. Private nicknames, Telegram user IDs, investigation notes and private keys are not included. Never place API credentials in the repository or frontend.

The shared API exposes `action=aml-address&network=...&q=...`. Deploy the updated API for centralized scanning; desktop and bot builds can fall back to the same public adapters when an older server responds that the action is unknown. This fallback does not bypass authentication or provider rate limits. A TRONSCAN key configured only on the shared server cannot be used by a local fallback.

Successful scanner results are cached for five minutes with concurrent-request deduplication. Partial/unavailable results are retried after a short 30-second cache. Each provider request has a 6.5-second timeout, a 128 KiB response limit, no redirects and a fixed endpoint. At most eight upstream scanner calls run simultaneously per process; the shared API retains its client/global request limits. No findings from a failed response are invented. A successful cache hit retains its original retrieval time.

The desktop panel includes explanations in English, Russian and Simplified Chinese, source cards, a retry button, and evidence in PDF exports. The bot includes source links and explanations in `/aml`; full scanner findings are retained in `/export` JSON even if the chat preview is shortened. Refresh the wallet to rerun all checks, subject to the source cache.
