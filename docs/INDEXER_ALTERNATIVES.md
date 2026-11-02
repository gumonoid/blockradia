# Base and Polygon indexer alternatives

Reviewed on November 2, 2026. Both networks are enabled again with Alchemy for wallet histories. Existing local research records are retained.

## Alchemy Transfers API

Alchemy explicitly supports historical address transfers on Base and Polygon. Its free tier includes the Transfers API. Access requires an Alchemy account and API key; the existing Blockscout key cannot be used with Alchemy.

Alchemy is connected for address investigation and transfer graphs. It does not replace Blockscout's network-wide transaction totals, indexed-address counts, or daily network statistics. The adapter requests up to 50 incoming and 50 outgoing external, internal, and ERC-20 transfers, deduplicates transfer IDs and transaction hashes, and preserves raw token precision. Partial provider failures remain explicitly incomplete.

- [Supported networks and setup](https://www.alchemy.com/docs/reference/transfers-api-quickstart)
- [Transfer categories and request format](https://www.alchemy.com/docs/data/transfers-api/transfers-endpoints/alchemy-get-asset-transfers)
- [Free tier feature coverage and limits](https://www.alchemy.com/docs/reference/pricing-plans)

## Routescan

The current supported-chain list does not include Base or Polygon. Do not send these networks to an unsupported chain route or use another chain's data as a fallback.

- [Supported chains](https://docs.routescan.io/getting-started/supported-chains)

## Current Blockscout access

Live checks with the locally configured key returned HTTP 402 for Base (8453) and Polygon (137), explicitly requiring Builder, Business, or Pro. Ethereum, Arbitrum, and Optimism returned HTTP 200. No keys are stored in this document.
