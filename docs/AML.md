# AML evidence review

The address screen includes preliminary, local analysis of the loaded transfer sample. It lists direct counterparties, incoming/outgoing transfer counts, transaction hashes, and exact network-scoped exchange attributions with source URLs and snapshot dates. Reports can be exported as JSON. Exchange identity is not inherited by adjacent addresses. Self transfers do not create counterparties; repeated transfer IDs are counted once.

The module screens exact addresses against a bundled official OFAC SDN snapshot. It does not infer criminal activity, calculate a risk score, or certify an address as safe. Unknown attribution means unknown. A public exchange label is informational and may be historical. Coverage is restricted to transfers actually returned by the provider, including any provider failures or history limits shown elsewhere in the address view. Counts represent transfer events, not necessarily unique transactions. No value-based exposure percentage is calculated across different assets.

The report is generated locally without additional network requests. It contains public addresses, transaction hashes, and attribution sources; review it before sharing. Labels come from the bundled exchange registry, not a live AML provider.

## OFAC screening

The snapshot is downloaded from the official OFAC Sanctions List Service. It retains entity IDs, currency tags, programs, publication date, retrieval date and SHA-256 of the source XML. Refresh it with `python scripts/import-ofac.py`, then rebuild the desktop app. Refresh is currently maintainer-operated, not automatic in installed applications. The importer atomically replaces the snapshot only after successful parsing and rejects empty exports; removed entries disappear on replacement.

A snapshot older than 24 hours is explicitly stale. Historical matches remain visible for review but are not current findings. Matching is exact; EVM address casing is normalized. Currency tags are not silently propagated between EVM networks. A matching address with an unconfirmed chain requires manual review. Networks without native-currency records are reported as coverage unconfirmed. TON friendly/raw address equivalence is not yet supported by sanctions matching. No fuzzy identity matching is performed.

Only OFAC SDN explicit digital-currency identifiers are screened. UK, EU, UN and other lists, entity ownership rules, off-chain identity, indirect exposure and behavioral AML detection are outside current coverage. The module is not a complete compliance or AML service. Transfer evidence covers the loaded sample only. No percentage of illicit funds or pass/fail clearance is inferred.

Source documentation: https://ofac.treasury.gov/sanctions-list-service


## Additional researched sources and colors

- MyEtherWallet address darklist: 715 valid Ethereum address records imported on 2026-11-10. Historical community warnings, not a current sanctions list or independently verified ownership finding. Each entry retains its original comment and date. https://github.com/MyEtherWallet/ethereum-lists/blob/master/src/addresses/addresses-darklist.json
- Safe Research UK extraction: six EVM addresses imported from the UK release asset on 2026-11-10. This third-party extraction does not supply per-entry entity identity or chain scope, so matches require verification and never independently produce red. https://github.com/safe-fndn/sanctions-address-lists
- ScamSniffer: researched but excluded because its address list is no longer maintained (domain detection is a different task). https://github.com/scamsniffer/scam-database
- MetaMask phishing detection: domain blocklist, not wallet attribution; excluded from address screening. https://github.com/MetaMask/eth-phishing-detect
- EU extraction in Safe Research was researched but has not been imported or validated here. No EU coverage is claimed.

Additional snapshot provenance and raw-file SHA-256 are stored in lib/aml-additional.json. MIT attribution and license texts are retained in AML_DATA_LICENSES.md. These snapshots are bundled; installed apps do not automatically refresh them.

Red means a fresh, direct OFAC address match whose currency tag matches the selected network. Yellow means a historical/community report, counterparty exposure, ambiguous network, stale sanctions snapshot, unavailable coverage, empty sample, or incomplete history loading. Green means no signals in the checked sample and fresh OFAC checks for that network; it does not mean safe or globally screened. Historical community data cannot establish absence of current scam activity. No numeric probability or AML score is fabricated. Every exported report contains the color, reason and underlying source findings.

## Runtime updates

Updated desktop and bot builds also request the shared API AML feed. The updated API refreshes OFAC and additional address sources hourly. The bundled files remain a fallback. Each source retains its own retrieval date. See [research workspace](RESEARCH_WORKSPACE.md) for runtime coverage and deployment. Earlier snapshot import commands apply to the bundled fallback files.
