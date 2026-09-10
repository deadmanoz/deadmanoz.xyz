# Threads

One section per BitcoinTalk thread that named a mined mainnet invalid-block claim, a header hash, or a downloadable body. Dates are the first post unless noted. Attachment “resolves” is a 2026-09-10 HEAD/GET, not a body download into the datasets.

Related hashes are cross-referenced in `leads.jsonl`.

---

## topic 2041607 — 1Hash 474294 and 477115

- **URL:** https://bitcointalk.org/index.php?topic=2041607.0
- **Wayback:** https://web.archive.org/web/20260910061338/https://bitcointalk.org/index.php?topic=2041607.0
- **Date:** 2017-07-23 (piotr_n / tonikt)
- **Board:** Development & Technical Discussion
- **Claim:** 1Hash mined two invalid blocks. OP guessed in-block tx order; achow101 distinguished the two failures.
- **Hashes:**
  - height 474294 `00000000000000000182acdf5657c93a0769dc6f9004047496b2e15efc6a4232`
  - height 477115 `0000000000000000013ee4a86822d37a061732e04ee5f41fb77168f193363d1b`
- **Reject string (forum):** missing unconfirmed parent / later-in-block parent (`bad-txns-inputs-missingorspent` in Core terms). 474294: child `a6655ca4…` spends `b11a78c6…:1` which is **not** in the block (parent confirmed in the canonical competing block). 477115: in-block forward spends (tx 22 spends tx 90, plus further pairs).
- **Attachments:**
  - `http://gocoin.pl/1hash/474294-00000000000000000182acdf5657c93a0769dc6f9004047496b2e15efc6a4232.bin` — **404**, no Wayback CDX
  - `http://gocoin.pl/1hash/477115-0000000000000000013ee4a86822d37a061732e04ee5f41fb77168f193363d1b.bin` — **404**, no Wayback CDX
  - `https://gocoin.pl/files/1hash_invalid_block.bin` and `_2.bin` (later citations) — **404**, no Wayback CDX
  - `https://pastebin.com/LtMKi8pC` — **200** (raw still live). Tx-index dump of **477115 only**, not 474294. Wayback 20241215.
- **piotr_n aside:** “I remember once, when a BU node mined an invalid block” — follow-on is topic 1769542, not a free pass to invent a hash here.
- **Dataset:** 477115 catalogued (`bad-txns-inputs-missingorspent`) with body. 474294 absent from invalid-blocks; body in stale-blocks.

---

## topic 1769542 — Bitcoin.com / Bitcoin Unlimited 450529

- **URL:** https://bitcointalk.org/index.php?topic=1769542.0
- **Wayback:** https://web.archive.org/web/20260910061220/https://bitcointalk.org/index.php?topic=1769542.0
- **Date:** 2017-01-30 (achow101)
- **Claim:** Bitcoin.com pool running Bitcoin Unlimited mined a block **greater than 1,000,000 bytes**. Core rejected it; BU peers were banned for relay. Distinct from ordinary stale/orphan. Bug: BU dropped coinbase size reservation so selected txs + coinbase overflowed the limit.
- **Hash:** height 450529 `000000000000000000cf208f521de0424677f7a87f2f278a1042f38d159565f5`
- **Reject strings in-thread:** `AcceptBlock: bad-blk-length, size limits failed`; also `ContextualCheckBlock(): weight limit failed` / `bad-blk-weight` (ck / 0.13.2 pool node). Height in version handshake `blocks=450529`.
- **Attachments / explorers:**
  - `https://live.blockcypher.com/btc/block/000000000000000000cf208f521de0424677f7a87f2f278a1042f38d159565f5/` — **403** on 2026-09-10
  - Reddit log dump (same hash): https://www.reddit.com/r/Bitcoin/comments/5qwtr2/bitcoincom_loses_132btc_trying_to_fork_the/
  - **No `.bin` or hex dump in the thread**
- **Also quoted in:**
  - https://bitcointalk.org/index.php?topic=1907817.20 (same logs)
  - https://bitcointalk.org/index.php?topic=1760149.120 (same logs; Wayback https://web.archive.org/web/20260910061832/https://bitcointalk.org/index.php?topic=1760149.120)
- **Dataset:** hash listed in `stale-blocks.csv` with **empty header**, **no** `.bin`. Absent from invalid-blocks. Prior mergedmonitor audit (file not on this VM): `reported_invalid_unresolved`.

---

## topic 1907817 — same 450529 logs (aside)

- **URL:** https://bitcointalk.org/index.php?topic=1907817.20
- **Date:** 2017-05 (hash appears in quotes of the January logs)
- **Claim:** franky1 pastes the 2017-01-29 `Requesting block …cf208f…` / `bad-blk-length` log while arguing about orphans vs rule changes. Same artefact as 1769542; no new dump.
- **Hash:** `000000000000000000cf208f521de0424677f7a87f2f278a1042f38d159565f5`
- **Wayback:** Save Page Now timed out 2026-09-10; live page still 200.

---

## topic 1760149 — same 450529 logs (aside)

- **URL:** https://bitcointalk.org/index.php?topic=1760149.120
- **Wayback:** https://web.archive.org/web/20260910061832/https://bitcointalk.org/index.php?topic=1760149.120
- **Claim:** same `bad-blk-length` paste as 1769542. No new hash or file.

---

## topic 822 — 2010 value overflow (CVE-2010-5139)

- **URL:** https://bitcointalk.org/index.php?topic=822.0
- **Wayback:** https://web.archive.org/web/20260823155154/https://bitcointalk.org/index.php?topic=822.0
- **Date:** 2010-08 (incident thread)
- **Claim:** block created two ~92 billion BTC outputs; signed 64-bit overflow.
- **Hashes:**
  - overflow block 74638 `0000000000790ab3f22ec756ad43b6ab569abf0bddeb97c67a6f7b1470a7ec1c`
  - prev (canonical) `0000000000606865e679308edf079991764d88e8122ca9250aef5386962b6e84` — parent, not a lead
- **Attachments:** none as `.bin`; header hex later reconstructed in 5488487.
- **Dataset:** catalogued in invalid-blocks (`bad-txns-vout-toolarge`) with 474-byte `.bin`. Not in stale-blocks.csv.

---

## topic 823 — overflow follow-on

- **URL:** https://bitcointalk.org/index.php?topic=823.0
- **Date:** 2010-08
- **Claim:** contemporaneous overflow discussion. **No 64-hex header** on the first page. Incident artefact is in 822 / 5488487.
- **Disposition of the incident:** see 74638 lead (catalogued). This thread is provenance only.

---

## topic 5488487 — overflow raw tx / header reconstruction

- **URL:** https://bitcointalk.org/index.php?topic=5488487.0 (hash also at [msg63795653](https://bitcointalk.org/index.php?topic=5488487.msg63795653#msg63795653))
- **Wayback:** https://web.archive.org/web/20260910060928/https://bitcointalk.org/index.php?topic=5488487.0
- **Date:** 2024-03-11
- **Claim:** reconstruct the overflow transaction and 80-byte header. Pastes full header hex ending in hash `0000000000790ab3…a7ec1c`.
- **Hash:** 74638 `0000000000790ab3f22ec756ad43b6ab569abf0bddeb97c67a6f7b1470a7ec1c`
- **Attachments:** none external; header hex in-post (already in invalid-blocks).
- **Dataset:** catalogued. Useful as incident provenance, not a new body.

---

## topic 5447129 — F2Pool sigops 783426 and 784121

- **URL:** https://bitcointalk.org/index.php?topic=5447129.0
- **Wayback:** https://web.archive.org/web/20260910060713/https://bitcointalk.org/index.php?topic=5447129.0
- **Date:** 2023-04-01 (Cricktor logs; second block 2023-04-06)
- **Claim:** Core `ConnectBlock(): too many sigops` / `InvalidChainFound` / `bad-blk-sigops`. Coinbase `1KFHE7w8BhaENAswwryaoccDb6qcT6DbYY` → F2Pool. Accurate sigop cost above 80,000.
- **Hashes (invalid):**
  - 783426 `00000000000000000002ec935e245f8ae70fc68cc828f05bf4cfa002668599e4`
  - 784121 `000000000000000000046a2698233ed93bb5e74ba7d2146a68ddb0c2504c980d`
- **Hashes (not leads):** canonical `UpdateTip` parents `…01244128897a9f32…` (783425) and `…04ef043082d841…` (784120); other 64-hex in coinbase/getrawtransaction JSON are txids.
- **Attachments:**
  - `https://pastebin.com/ETVD9yf9` — **200**. `getblock` JSON of **783426** (hash confirmed in the paste). Wayback 20241212.
  - `https://mega.nz/file/FAdXWLaR#UR0BSrx1WxMVqPszITF5FxcElufHJyt3InILB-GZR4E` — landing **200** (2069-byte HTML; file bytes not downloaded). Claimed `getblock … 0` hex dump of 783426. Wayback 20241212.
- **Dataset:** both catalogued (`bad-blk-sigops`) with published `.bin` files. Mega dump is superseded.

---

## topic 5468420 — MARA 809478 (farside hex)

- **URL:** https://bitcointalk.org/index.php?topic=5468420.0
- **Wayback:** https://web.archive.org/web/20260910060742/https://bitcointalk.org/index.php?topic=5468420.0
- **Date:** 2023-09-27/28
- **Claim:** Marathon/MARA mined invalid 809478 because child txs precede parents in the same block.
- **Hash:** not pasted as 64-hex in OP; artefact URL names the height. Confirmed from the live dump: `000000000000000000006840568a01091022093a176d12a1e8e5e261e4f11853`
- **Reject:** `bad-txns-inputs-missingorspent` (in-block forward spend). First example in-thread: spend of `7d18f0ee…` appears as tx 6, parent as tx 1454.
- **Attachments:**
  - `https://farside.co.uk/blocks/809478invalid.txt` — **200** `text/plain`, hash field matches catalogued 809478. Wayback 20260910 and 20240111.
- **Dataset:** catalogued. Keep farside URL as future observation provenance; do not add a `scrape` observation in this pass.

---

## topic 5468317 — MARA 809478 (news / beginner)

- **URL:** https://bitcointalk.org/index.php?topic=5468317.0
- **Wayback:** https://web.archive.org/web/20260910060844/https://bitcointalk.org/index.php?topic=5468317.0
- **Date:** 2023-09-27
- **Claim:** news-style write-up of MARA 809478 (CoinDesk / b10c / Lopp). OP does **not** paste the invalid hash.
- **Hash in-thread:** `0000000000000000000261a0b5d3836c8bd1785946118e01ac989e7a4b228ce5` — **Foundry USA canonical block that replaced 809478**, not invalid.
- **Attachments:** none for the invalid body.
- **Dataset:** 809478 catalogued via other sources. The Foundry hash is `not_consensus_invalid`.

---

## topic 5469134 — hypothetical + Cricktor height list

- **URL:** https://bitcointalk.org/index.php?topic=5469134.0
- **Wayback:** https://web.archive.org/web/20260910060908/https://bitcointalk.org/index.php?topic=5469134.0
- **Date:** 2023-10-04
- **Claim (OP):** hypothetical “what if someone consistently mined invalid blocks”. **No artefact.**
- **Claim (Cricktor):** nodes logged three invalid blocks in ~six months: **783426, 784121, 809478** (heights; hashes not in that post). Already catalogued.
- **Hash in-thread:** `00000000000000000003be389a325abb73dd8ece1c885ff70c4ef53f01434670` — mempool.space “most recent block” fee-rate example; **canonical**, not invalid.
- **Dataset:** OP row is `hypothetical`. The three heights are the catalogued 2023 incidents.

---

## topic 958036 — BIP66 status; first v2 victims and F2Pool SPV child

- **URL:** https://bitcointalk.org/index.php?topic=958036.20 (hashes at [msg ~11787714](https://bitcointalk.org/index.php?topic=958036.msg11787714) / page 20)
- **Wayback:** https://web.archive.org/web/20260910061502/https://bitcointalk.org/index.php?topic=958036.msg11787714
- **Date:** 2015-07-04
- **Claim:** after 95% v3, BTC Nuggets still produced version-2 blocks. F2Pool built a v3 empty block on the second v2 block without rejecting it.
- **Hashes:**
  - 363726 `0000000000000000032527aa796d3672e32e5f85a452d3a584a28fc7efbcd5d0` — BTC Nuggets v2 (**independently** `bad-version`). **Catalogued.**
  - 363731 `0000000000000000009cc829aa25b40b2cd4eb83dd498c12ad0d26d90c439d99` — BTC Nuggets v2, the fork trigger. **Not** in invalid-blocks or stale-blocks.
  - 363732-era F2Pool empty `0000000000000000155f2519d35cd5d2869900bcc5093594b27763a0315390b4` — SPV **descendant** of 363731 (empty on invalid parent). Catalogue excludes descendants.
  - `00000000000000001242e0216eb113f1c50e4c18ecfbc8b9c0224ec82ec391d6` — cited as the **valid** tip on the rejecting side (`#363732`). Canonical, not invalid.
- **Attachments:** blockchain.info orphan pages (historical). Not fetched as bodies this pass.
- **Dataset:** 363726 catalogued (`bip66_block_version_below_3`). 363731 `needs_recovery`. 155f and 1242e0 `not_consensus_invalid`.

---

## topic 1108304 — Blockchain split of 4 July 2015

- **URL:** https://bitcointalk.org/index.php?topic=1108304.0 (hash on [page 40](https://bitcointalk.org/index.php?topic=1108304.40) / later pages)
- **Wayback:** https://web.archive.org/web/20260510114000/https://bitcointalk.org/index.php?topic=1108304.0 and https://web.archive.org/web/20260910061520/https://bitcointalk.org/index.php?topic=1108304.40
- **Date:** 2015-07-04
- **Claim:** BIP66 95% then BTC Nuggets v2 block; F2Pool/AntPool SPV-mined on it. First page of the topic **does not** paste 64-hex; later posts link `blockchain.info/block/0000000000000000009cc829…`.
- **Hash in-thread:** 363731 `0000000000000000009cc829aa25b40b2cd4eb83dd498c12ad0d26d90c439d99`
- **Notes:** bitcoin.org alert https://bitcoin.org/en/alert/2015-07-04-spv-mining. Wiki `July_2015_Forks` (and the old `July_2015_fork` path, 404 on 2026-09-10) lists further **descendant** hashes; those stay out of invalid-blocks unless they fail a construction rule on a canonical parent.
- **Dataset:** same as 958036. 363726 is the catalogued first v2; this thread’s pasted hash is 363731.

---

## Threads fetched and dropped

- **4381857** — beginner consensus question; no hash.
- **5088737 / 5266193 / 1031675** — `InvalidChainFound` on canonical or locally bad blocks during sync (`reconsiderblock`).
- **5484359 / 5462166 / 5488342** — mempool `bad-txns-inputs-missingorspent` on user transactions.
