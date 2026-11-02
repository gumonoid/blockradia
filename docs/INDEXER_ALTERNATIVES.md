# Base and Polygon indexer alternatives

Reviewed on November 2, 2026. Both networks are temporarily commented out of the UI network list. Existing backend adapters and local research records are retained.

## Alchemy Transfers API

Alchemy explicitly supports historical address transfers on Base and Polygon. Its free tier includes the Transfers API. Access requires an Alchemy account and API key; the existing Blockscout key cannot be used with Alchemy.

This is a candidate for restoring address investigation and transfer graphs, not a replacement for Blockscout's network-wide transaction totals, indexed-address counts, or daily network statistics. It has not been connected or verified with a user API key.

- [Supported networks and setup](https://www.alchemy.com/docs/reference/transfers-api-quickstart)
- [Transfer categories and request format](https://www.alchemy.com/docs/data/transfers-api/transfers-endpoints/alchemy-get-asset-transfers)
- [Free tier feature coverage and limits](https://www.alchemy.com/docs/reference/pricing-plans)

## Routescan

The current supported-chain list does not include Base or Polygon. Do not send these networks to an unsupported chain route or use another chain's data as a fallback.

- [Supported chains](https://docs.routescan.io/getting-started/supported-chains)

## Current Blockscout access

Live checks with the locally configured key returned HTTP 402 for Base (8453) and Polygon (137), explicitly requiring Builder, Business, or Pro. Ethereum, Arbitrum, and Optimism returned HTTP 200. No keys are stored in this document.
