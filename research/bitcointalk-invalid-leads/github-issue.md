# GitHub issue draft (`bitcoin-data/invalid-blocks`)

Paste as a single tracking issue. **474294** is intentionally omitted: that body is already held and is going in on a separate PR (new evidence checker for a missing unconfirmed parent).

Suggested title:

`Recover two reported invalid blocks: 363731 header and 450529 body`

---

## Issue body

BitcoinTalk still names two mined mainnet blocks that are **not** in this dataset. Both have contemporaneous Core/forum reports and a 64-hex header hash. Neither has enough **bytes** for CI to admit them today. A forum reject string cannot substitute for the evidence contract ([schema](https://github.com/bitcoin-data/invalid-blocks/blob/main/docs/schema.md)).

This is recovery + (for 450529) a possible new rule. It is not an invitation to add SPV-mining descendants of an invalid parent.

### 1. 363731 — header only (`bip66_block_version_below_3`)

| | |
| --- | --- |
| Height | 363731 |
| Hash | `0000000000000000009cc829aa25b40b2cd4eb83dd498c12ad0d26d90c439d99` |
| Claimed rule | `bip66_block_version_below_3` / `bad-version` |
| Miner | BTC Nuggets (version-2 block after BIP66 95%) |
| In `invalid-blocks` | no |
| In `stale-blocks` | no |

This is the July 2015 fork **trigger**, independently the same construction as catalogued **363726** (`0000000000000000032527aa796d3672e32e5f85a452d3a584a28fc7efbcd5d0`). The registered check is header-only: signed version `< 3` at height `≥ 363725`. The **body is not required**.

**Have:** hash; contemporaneous reports ([BitcoinTalk 958036](https://bitcointalk.org/index.php?topic=958036.20), [1108304](https://bitcointalk.org/index.php?topic=1108304.40), bitcoin.org 2015-07-04 SPV-mining alert).

**Need:** the 80-byte header (and thus PoW). Once that hex is in hand, this should be a normal JSONL record, same pattern as 363726.

**Out of scope here:** empty F2Pool/AntPool extensions of this hash (e.g. `0000000000000000155f2519d35cd5d2869900bcc5093594b27763a0315390b4`). Those fail because the parent is invalid, not as an independent construction on a canonical parent.

- [ ] Recover 80-byte header
- [ ] Verify PoW and version; add JSONL record
- [ ] Observation provenance (BitcoinTalk / alert URLs)

### 2. 450529 — header, body, and a new rule (`bad-blk-length`)

| | |
| --- | --- |
| Height | 450529 |
| Hash | `000000000000000000cf208f521de0424677f7a87f2f278a1042f38d159565f5` |
| Claimed rule | `bad-blk-length` (also logged `bad-blk-weight`) |
| Miner | Bitcoin.com pool / Bitcoin Unlimited (oversized; coinbase reservation bug) |
| In `invalid-blocks` | no |
| In `stale-blocks` | CSV row with **empty** `header`, **no** `.bin` |

**Have:** hash; Core logs from 2017-01-29 (`AcceptBlock: bad-blk-length, size limits failed`; also `weight limit failed` / `bad-blk-weight`) in [BitcoinTalk 1769542](https://bitcointalk.org/index.php?topic=1769542.0) (also 1907817, 1760149) and the matching Reddit thread.

**Need:**

1. Header hex (CSV is hash-only today; PoW is unproven in-tree).
2. Full `.bin`. No dump in the thread; BlockCypher page 403 as of 2026-09-10.
3. A **registered** size/weight evidence contract. `bad-blk-length` / `bad-blk-weight` are not in `RULES`. Recovering the body is not enough to merge until CI can replay the failure.

- [ ] Recover header
- [ ] Recover body
- [ ] Register size/weight rule + checker + tests (only after a body exists)
- [ ] Admit record; drop the empty stale-blocks CSV row if that repo still lists it

### Not this issue

- **474294** (1Hash missing parent) — body already in stale-blocks; separate PR / checker.
- Catalogued blocks that BitcoinTalk also names (74638, 363726, 477115, 783426, 784121, 809478) — optional later observation URLs only.
- Hypothetical “what if a miner mines invalid blocks” threads with no artefact.

Search notes for this pass: `deadmanoz.xyz` `research/bitcointalk-invalid-leads/` (private inventory, not admission).
