# BitcoinTalk invalid-block lead inventory

Private candidate inventory of BitcoinTalk threads that name a mined, proof-of-work Bitcoin mainnet block claimed to fail consensus. This is **not** dataset admission.

Intended wiki home (sibling of `mergedmonitor-source-audit`):

`wiki/topics/bitcoin/datasets/bitcointalk-invalid-leads/`

This copy lives in the `deadmanoz.xyz` repo because that wiki tree is not on this VM. Do **not** merge these hashes into [invalid-blocks](https://github.com/bitcoin-data/invalid-blocks), [stale-blocks](https://github.com/bitcoin-data/stale-blocks), or the catalogue post from this folder.

Files:

| File | Role |
| --- | --- |
| `README.md` | Search log, coverage limits, next chases |
| `threads.md` | One section per thread: URL, date, claim, hashes, attachments |
| `leads.jsonl` | One object per distinct header hash (or hash-less claim) |

Search date: **2026-09-10**. Cross-check against clones of `bitcoin-data/invalid-blocks` (46 records) and `bitcoin-data/stale-blocks` (`stale-blocks.csv` 3141 rows plus `blocks/*.bin`). `candidates.jsonl` from the mergedmonitor source audit was **not** present on this VM; `mergedmonitor_candidate` values below are labelled `file_absent_on_this_vm` and, where known from that earlier audit, noted as prior status.

---

## Next chases

This list is the handoff. This pass does not implement them.

1. **474294 evidence contract** — Hash `00000000000000000182acdf5657c93a0769dc6f9004047496b2e15efc6a4232`. Body is already in stale-blocks (`csv+bin`, 715405 bytes). Absent from invalid-blocks. Forum and later analysis: the spend is of a parent **not in the block** (missing unconfirmed parent), which the current `bad-txns-inputs-missingorspent` checker does not admit (it requires an in-block forward spend). Existing private brief; do not admit until a named rule exists.
2. **450529 header + body recovery** — Hash `000000000000000000cf208f521de0424677f7a87f2f278a1042f38d159565f5`, Bitcoin.com/BU oversized block, Core `bad-blk-length` / `bad-blk-weight`. Listed in `stale-blocks.csv` with an **empty** `header` field and **no** `.bin`. Strongest new forum lead (topic 1769542). `bad-blk-length` is not currently a registered invalid-blocks body rule. BlockCypher page 403; no dump URL in the thread.
3. **363731 header recovery** — Hash `0000000000000000009cc829aa25b40b2cd4eb83dd498c12ad0d26d90c439d99`, BTC Nuggets version-2 block after BIP66 95% (same construction class as catalogued 363726). **Absent** from both invalid-blocks and stale-blocks. Header-only rule `bip66_block_version_below_3` / `bad-version` if the header is recovered. Do **not** chase SPV-mining **descendants** (empty F2Pool/AntPool extensions) unless they fail a construction rule on a canonical parent.
4. **1Hash gocoin.pl dumps** — OP links `http://gocoin.pl/1hash/{height}-{hash}.bin` (also later `gocoin.pl/files/1hash_invalid_block*.bin` mentions). All **404**. CDX search returned **no** captures. Bodies of 474294 and 477115 are already held (stale-blocks / invalid-blocks). No further dump chase unless a new mirror appears.
5. **F2Pool mega.nz dump** — `https://mega.nz/file/FAdXWLaR#UR0BSrx1WxMVqPszITF5FxcElufHJyt3InILB-GZR4E` landing page still 200; bodies of 783426 and 784121 are already published in invalid-blocks. Superseded; optional integrity check only.
6. **809478 farside hex** — `https://farside.co.uk/blocks/809478invalid.txt` still live (confirmed hash). Already catalogued. Keep as incident-provenance URL for a future `docs/notes.md` / observation pass. Do not invent `scrape` observations in this pass.
7. **474294 / 477115 paste** — Pastebin `LtMKi8pC` still live; it is a **477115** tx-index dump, not 474294.

---

## Search method

BitcoinTalk SMF search is weak and rate-limits. Primary index: quoted `site:bitcointalk.org` web search, then fetch the topic HTML and extract 64-hex strings with leading zeros. Follow each new header-like hash back onto BitcoinTalk and the web.

**Boards used:** Development & Technical Discussion, Mining (and the 2010 overflow topics, which predate the current board split). Altcoin boards and “what is an invalid block” beginner threads were skipped unless they pasted a hash.

**SMF:** not used as a query engine this pass (rate limits). Direct topic IDs from seeds and `site:` hits were fetched instead.

### Queries run

Quoted, then unquoted where the quoted form was too sparse:

- `"mined an invalid block"`
- `"invalid block" pool`
- `"rejected the block"`
- `bad-txns-inputs-missingorspent` (almost all hits are wallet/PSBT spend errors, not mined blocks)
- `bad-blk-sigops` → topic 5447129
- `bad-blk-length` / `bad-blk-weight` → 2017 BU 450529 logs
- `bad-cb-height` (regtest/altcoin/beginner; skipped)
- `bad-version` / BIP66 July 2015
- `time-too-old` (no mined-block artefact on BitcoinTalk)
- `"submitblock" invalid` (no new mainnet hash)
- `getchaintips` invalid (no new mainnet hash)
- `InvalidChainFound: invalid block=` → 5447129 (real); 5088737 / 5266193 / 1031675 are sync/corruption or stale races, skipped
- Pool/incident names: `1hash`, `F2Pool` sigops, `MARA` / Marathon 809478, overflow / CVE-2010-5139, BIP66 July 2015
- Hash follow-ups for every 64-hex header found
- piotr_n’s “BU node mined an invalid block” aside in 2041607 → topic **1769542** (achow101, 2017-01-30), also quoted in 1907817 and 1760149

### Seed threads (logged first)

- [topic 2041607](https://bitcointalk.org/index.php?topic=2041607.0) — 1Hash 474294 + 477115
- [topic 5488487](https://bitcointalk.org/index.php?topic=5488487.msg63795653#msg63795653) — overflow 74638 (raw tx reconstruction; cites 822)
- [topic 5469134](https://bitcointalk.org/index.php?topic=5469134.0), [5468420](https://bitcointalk.org/index.php?topic=5468420.0), [5468317](https://bitcointalk.org/index.php?topic=5468317.0) — 2023 MARA/F2Pool discussion

### Coverage limits

- `site:bitcointalk.org` and SMF are **incomplete**. Old posts drop out of the public web index; pagination and print-view copies differ.
- Compact-block / mutation threads, invalid **stratum jobs** with no found block, and “what if a miner mines invalid blocks” with no artefact were out of scope.
- SPV-mining **descendants** of an invalid parent are excluded from the catalogue by policy; they are recorded here only so they are not re-chased as independent failures.
- No bodies were downloaded into invalid-blocks. Attachment checks were HEAD/GET of the URL and Wayback availability only.

---

## Disposition legend

Classified with the **dataset** meaning of invalid (valid PoW + named consensus failure + evidence), not the forum’s.

| `disposition` | Meaning |
| --- | --- |
| `catalogued` | Hash is in `invalid-blocks.jsonl` |
| `body_in_stale_blocks` | Full body in stale-blocks; not in invalid-blocks |
| `header_only` | Header bytes known; no body |
| `hash_only` | Hash known (forum and/or CSV); no header hex, no body |
| `needs_recovery` | Hash not in the three datasets; dead or missing artefact |
| `not_consensus_invalid` | Valid construction, stale race, canonical tip, or invalid-only-because-parent |
| `hypothetical` | No mined artefact |

`stale_blocks`: `csv+bin` / `csv` / `absent`. A CSV row with an empty `header` field is still `csv`.

---

## Skipped (false friends)

| Thread / hit | Why skipped |
| --- | --- |
| 5469134 OP | Hypothetical “what if”; Cricktor later names heights 783426, 784121, 809478 already catalogued |
| 5468317 Foundry hash `…261a0b5d3836c…` | Canonical replacement of 809478, not invalid |
| 5469134 mempool.space `…03be389a…` | Canonical fee-rate example, not invalid |
| 5447129 `UpdateTip` parents 783425 / 784120 | Canonical tips in the log, not the invalid block |
| 5484359, 5462166, 5488342 | `bad-txns-inputs-missingorspent` on **wallet txs**, not blocks |
| 4381857 | Beginner “who detects invalid blocks”, no hash |
| 5088737, 5266193, 1031675 | `InvalidChainFound` on **canonical** or locally corrupted blocks during sync |
| 1166928 | Theoretical sigops-stuffing attack; no found block |
| Altcoin `bad-cb-height` | Out of scope |

---

## Wayback

Hash-bearing threads and file links were checked with the availability API, then Save Page Now where a snapshot was missing. gocoin.pl dumps have **no** CDX captures.

| URL | Snapshot used |
| --- | --- |
| topic 2041607 | https://web.archive.org/web/20260910061338/https://bitcointalk.org/index.php?topic=2041607.0 (also 20221206) |
| topic 1769542 | https://web.archive.org/web/20260910061220/https://bitcointalk.org/index.php?topic=1769542.0 (also 20221107) |
| topic 5447129 | https://web.archive.org/web/20260910060713/https://bitcointalk.org/index.php?topic=5447129.0 |
| topic 5468420 | https://web.archive.org/web/20260910060742/https://bitcointalk.org/index.php?topic=5468420.0 |
| topic 5468317 | https://web.archive.org/web/20260910060844/https://bitcointalk.org/index.php?topic=5468317.0 |
| topic 5469134 | https://web.archive.org/web/20260910060908/https://bitcointalk.org/index.php?topic=5469134.0 |
| topic 5488487 | https://web.archive.org/web/20260910060928/https://bitcointalk.org/index.php?topic=5488487.0 |
| topic 958036.msg11787714 | https://web.archive.org/web/20260910061502/https://bitcointalk.org/index.php?topic=958036.msg11787714 |
| topic 1108304.40 | https://web.archive.org/web/20260910061520/https://bitcointalk.org/index.php?topic=1108304.40 |
| topic 822 | https://web.archive.org/web/20260823155154/https://bitcointalk.org/index.php?topic=822.0 (Save Page Now timed out 2026-09-10) |
| topic 1907817.20 | Save Page Now timed out 2026-09-10; live page 200 (same 450529 logs as 1769542) |
| topic 1760149.120 | https://web.archive.org/web/20260910061832/https://bitcointalk.org/index.php?topic=1760149.120 |
| farside 809478invalid.txt | https://web.archive.org/web/20260910061606/https://farside.co.uk/blocks/809478invalid.txt (also 20240111) |
| pastebin LtMKi8pC | https://web.archive.org/web/20241215012451/https://pastebin.com/LtMKi8pC (live 200; re-save timed out) |
| pastebin ETVD9yf9 | https://web.archive.org/web/20241212051410/https://pastebin.com/ETVD9yf9 (live 200; re-save timed out) |
| mega.nz FAdXWLaR | https://web.archive.org/web/20241212043038/https://mega.nz/file/FAdXWLaR |
| gocoin.pl `1hash/*.bin` and `files/1hash_invalid_block*.bin` | **none** |

---

## Cross-check sources

Read-only, 2026-09-10:

- `invalid-blocks` `data/invalid-blocks.jsonl` + `blocks/{height}-{hash}.bin` (5 published bodies: 74638, 477115, 783426, 784121, 809478)
- `stale-blocks` `stale-blocks.csv` + `blocks/{height}-{hash}.bin`
- `candidates.jsonl` **absent** on this VM
