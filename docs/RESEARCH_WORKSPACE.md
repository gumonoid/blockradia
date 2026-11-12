# Research workspace

The address screen and Telegram bot share six research features.

| Feature | Desktop | Telegram |
| --- | --- | --- |
| AML refresh | Automatic source checks and Refresh AML sources | /aml_update and automatic checks during lookups and watches |
| Portfolio | Add addresses from their network views, then refresh balances | /portfolio add network address, /portfolio, /portfolio remove number |
| Comparison | Compare wallets in the same network | /compare network address address |
| Alert rules | Asset or contract, minimum amount and direction in Notifications | /rule watch_number asset_or_all minimum in/out/all |
| Change tracking | Counts and hashes since the previous complete check | /changes after repeating a lookup |
| Coverage | Source, loaded date range, operation count and partial status | Date range and status in wallet cards |

## Backend deployment

Deploy the updated main API service to enable action=aml and action=portfolio on /api/explorer. Both use the existing API rate limits. Client builds keep bundled AML snapshots until the new feed is available. An older server returns an unavailable status for the new actions.

The backend checks official OFAC SDN XML and the configured MyEtherWallet and Safe Research UK feeds once per hour. Refreshes run in the background. Only validated nonempty snapshots replace previous data, with SHA-256, retrieval date and original source identity retained. Each source is refreshed independently. Errors retain older snapshots, and stale sanctions data stays explicitly stale. XML declarations for external entities and document types are rejected. The feed contains public data and no provider credentials.

## Portfolio coverage

Portfolios contain up to twenty address/network pairs. Native balances and market quotes use existing explorer adapters. Token sources are Blockscout or server-side Alchemy for EVM, Solana token accounts, TON Jetton balances and TRONSCAN TRC-20 balances. Bitcoin includes the native balance. Provider restrictions and pagination caps produce partial results. EVM Alchemy metadata lookup is bounded to ten nonzero token entries per response. Unknown precision is not guessed. Token quantities are retained as decimal strings. USD valuations are approximate, and unpriced assets are counted separately. A known USD total excludes unavailable valuations.

## Evidence and privacy

Comparison shows observed direct transfers and common counterparties in loaded history. Shared counterparties do not establish common ownership. Snapshot change tracking compares transaction hashes and root attribution identifiers, rather than source refresh timestamps. Incomplete history does not replace a complete baseline. New-in-sample hashes may include older transactions that became available from the provider.

Desktop portfolios and baselines are local. Bot portfolios and baselines are per-user SQLite records, removable with /delete_me. Personal portfolio and changes commands are restricted to private chats. Watches check attribution even when transaction history is unavailable. Rules select matching transfer events before transaction hashes are deduplicated. Notification baselines include filtered-out hashes, so changing a rule does not replay old events.
