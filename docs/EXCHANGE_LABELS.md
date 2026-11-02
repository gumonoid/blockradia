# Exchange address labels

Snapshot checked on 2026-11-02: **3077 exact address/network pairs across 81 exchange brands**, covering all eight supported networks. Counts do not mean that every exchange wallet is known. Private deposit addresses and newly created wallets are often absent from public sources. Historical labels do not guarantee present ownership or continued operation of an exchange.

## Coverage

| Network | Address labels |
|---|---:|
| arbitrum | 174 |
| base | 89 |
| ethereum | 1742 |
| optimism | 118 |
| polygon | 155 |
| solana | 343 |
| ton | 94 |
| tron | 362 |

## Sources

- [DefiLlama CEX registry](https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/cex): only explicit `owners` and owner positions in `tokensAndOwners` were extracted. Token arrays, own tokens, arbitrary addresses in comments, and executable code were not imported. Additional static owner configs from KuCoin, Bitget, HTX, and Bitfinex were included.
- [Binance official PoR address API](https://www.binance.com/bapi/apex/v1/public/apex/market/por/address): only explicitly named supported networks were mapped.
- [Bybit official October 2026 PoR CSV](https://api2.bybit.com/common-static/por/bybit_por_202610.csv): November was not available at import time. Each asset row maps to its explicitly named chain; aggregate rows are excluded.
- [tradezon/cex-list](https://github.com/tradezon/cex-list): curated Ethereum exchange addresses; MIT, Ivan Kopeykin.
- [dawsbot/eth-labels](https://github.com/dawsbot/eth-labels/tree/v1): only `exchange` category account rows with an explicit supported chain ID and matching exchange brand. Token records, exploit/scam tags and charity labels are excluded. MIT, Dawson Botsford; see THIRD_PARTY_NOTICES.md.
- Original ten curated explorer labels are retained, including the MEXC TRON address supplied by the user ([Tokenview](https://trx.tokenview.io/en/address/TEPSrSYPDSQ7yXpMFPq91Fb1QEWpMkRGfn)).

## Validation and limits

- Exact, network-specific matching; no cross-chain propagation or transaction-based inference.
- EVM format validated and normalized to lowercase. TRON Base58Check validated. Solana addresses must decode to 32 bytes. TON mainnet raw/friendly forms use CRC16 validation and canonical raw keys; testnet forms are rejected.
- Duplicate addresses are collapsed. OSL HK and OSL source names are combined under the OSL brand. One remaining conflicting attribution is excluded; malformed records and unmatched non-exchange entities/brands are not silently guessed.
- The summary JSON records excluded entries. Some old or unrecognized exchange brands remain outside this snapshot.
- Local nicknames take precedence over display names; exchange attribution remains separate. The inspector shows the source URL and snapshot check date. This date describes import validation, not a promise of real-time ownership verification.
- Labels and logos are bundled locally. Looking up a wallet adds no attribution API requests. This is a point-in-time snapshot, without automatic updates.

## Exchange brands

TradeOgre, arkham-exchange, biconomy, bigone, binance, binance_us, bingx, bitcointry, bitfinex, bitget, bithumb, bitkan, bitkub, bitlo, bitmex, bitomato, bitstamp, bitunix, bitvavo, bitvenus, blofin_spot, bybit, bydfi, cex, coin8-cex, coinbase, coindcx, coinone, coinsquare, coinstore, coinw, crypto_com, cryptology, deribit, exmo, fastex, flipster, gate, gate_us, gemini, grovex, hashkey, hibt, hotbit, hotcoin_global, huobi, indodax, klever-exchange, korbit, kraken, kucoin, latoken, lbank, levex, maskex, mexc, nbx, nexo-cex, niza-global, nonkyc, okcoin, okx, orangex, osl-exchange, ourbit, p2pb2b, phemex, pionex, poloniex, probit, robinhood, sclite, swissborg, tapbit, toobit, valr, webot, websea, weex, wootrade, zoomex

## Logos

Original brand images from the CoinGecko public exchange catalog and DefiLlama icon service are bundled locally. Source URLs remain in `lib/exchange-registry.json`. Logos identify their respective owners; no affiliation is implied.
