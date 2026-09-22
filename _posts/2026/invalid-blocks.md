---
title: 'Invalid Bitcoin blocks: full PoW, consensus invalid'
excerpt: 'A catalogue of 143 established Bitcoin consensus failures, from the 2010 overflow to two F2Pool timestamp failures in 2026, plus 10 separate reported cases still missing proof'
coverImage: '/assets/blog/2026/invalid-blocks/invalid-blocks-cover.png'
date: '2026-09-22T00:00:00.000Z'
tags:
  - bitcoin
  - invalid-blocks
  - merge-mining
  - research
author:
  name: deadmanoz
ogImage:
  url: '/assets/blog/2026/invalid-blocks/invalid-blocks-preview.jpg'
status: published
---

## tl;dr

- A block can carry full proof-of-work and still be invalid.
  The [invalid-blocks repository](https://github.com/bitcoin-data/invalid-blocks) catalogues **143 such Bitcoin blocks from 2010 to 2026**, each with the bytes and an offline check that establish which consensus rule it broke, plus **10 reported cases** held apart until their evidence turns up.
- **Two are very recent.**
  F2Pool headers from April and July 2026 carry timestamps roughly **7 and 14 days below their parents' median time past**.
  Neither has a known Bitcoin-side capture; both were found in merge-mined auxiliary chains, which is what prompted this post.
- **89 blocks contain the same P2SH-invalid transaction**, mined between April and July 2012 by pools that had not upgraded.
  Archived explorer txid lists and preserved headers prove its inclusion in each, so the failure is established even though only four complete bodies could be rebuilt.
- **127 of the 143 have no complete body.**
  A header, a coinbase bound to it by its Merkle branch, or an [[inclusion proof||Sibling hashes that hash a transaction ID up to the header's Merkle root. If the path matches the committed root, the header included that transaction.]], plus chain context, is enough to establish the rule that was broken.
- **Merge mining reveals both stale and invalid Bitcoin blocks.**
  Auxiliary chains hold 49 of the 143 headers and provide the catalogue's only recorded observation for 35; the same research recovered roughly 1,400 stale headers new to the [stale-blocks collection](https://github.com/bitcoin-data/stale-blocks).
  Monitoring the chains that merge-mine with Bitcoin is essential to a holistic Bitcoin monitoring effort.

## Introduction

Proof-of-work makes a Bitcoin block a candidate.
The consensus rules in force at that height make it eligible to extend (or [[race||If two or more valid blocks are found at the same height, only one extends the chain. The loser is a stale, recorded when possible in [stale-blocks](https://github.com/bitcoin-data/stale-blocks)]]).
This post is about blocks that met the [[PoW requirements||The header's double-SHA256, read as a 256-bit integer, must be **at or below** the target encoded by the `nBits` that consensus expects at the claimed height]] yet failed a consensus rule, thus becoming invalid blocks.

The catalogue, and this post, began with the two most recent cases.
In April and July 2026, merge-mined auxiliary chains recorded two F2Pool headers whose timestamps sat a week and two weeks behind the chain, and no Bitcoin-side monitor reported either.
I had assumed that consensus-invalid blocks with full proof of work belonged to earlier periods in Bitcoin's history, but two in three months from one of the largest pools suggested otherwise, and raised the question of how many there had been and how much of each survives.

Invalid blocks matter beyond the wasted work.
Each is the public trace of a bug in mining software that is otherwise closed, and direct evidence of how a consensus rule was enforced when it changed.
For example, as covered in this post, the 2012 cluster shows a pool advertising P2SH support in its coinbase while its node still accepted a spend the new rule forbade, and the 2015 forks show miners extending headers they had not validated.

Recent incidents are usually discussed individually.
b10c documented [F2Pool's two excessive-sigops blocks](https://b10c.me/observations/11-invalid-blocks-783426-and-784121/) and [MARA Pool's transaction-ordering failure](https://b10c.me/observations/07-invalid-block-809478/) from 2023, with enough data to reproduce the failures.
Earlier incidents more often survive as a hash, a height and a contemporary report, without the bytes needed to check the claimed failure.
Those are useful starting points, but not a substitute for the headers, coinbases or transactions that establish it.

I began with the record kept by chains that [merge-mine with Bitcoin](./merge-mining), because it had already proved the most productive source of stale blocks I know of: the merge-mining records of more than 25 auxiliary chains yielded [about 2,160 unique stale Bitcoin headers](https://github.com/deadmanoz/merge-mining-research), roughly 1,400 of them new to the [stale-blocks](https://github.com/bitcoin-data/stale-blocks) collection (about 1,090 from [Namecoin alone](https://github.com/bitcoin-data/stale-blocks/pull/94)) and the rest corroborating headers that Bitcoin-side monitors had captured.
The same records also keep headers of invalid Bitcoin blocks, since an auxiliary chain verifies its own rules and not Bitcoin's, and on AuxPoW chains the parent (Bitcoin) coinbase and its Merkle branch survive with them.
The search then expanded into archived explorer pages, developer discussions, old node files and test fixtures, and the archives kept by earlier fork research.
Combining those sources has made it possible to recover complete blocks in some cases, and in others to establish the failure without one.

The catalogue is [bitcoin-data/invalid-blocks](https://github.com/bitcoin-data/invalid-blocks), which holds 143 established failures with their proofs and offline checks, and the tables and charts below are generated from [its contents](/assets/blog/2026/invalid-blocks/data/catalogue.json) as of 22 September 2026.
The [10 reported cases](https://github.com/bitcoin-data/invalid-blocks/blob/166ff94/data/reported-blocks.jsonl) presented separately remain outside the catalogue because the surviving evidence does not yet establish their claimed failures.
Many of these headers were already in the companion [stale-blocks](https://github.com/bitcoin-data/stale-blocks) dataset, recorded as stales before their failures were established.

The next section sets out what the surviving evidence proves.
The failure families then follow, from the 2010 overflow through the large 2012 P2SH cluster to the pool-template errors and MTP violations of 2017 to 2026, with the reported cases, the summary tables and source notes at the end.

## Methodology

### The scope of the catalogue

A catalogued header must hash to a value at or below the Bitcoin target required to extend its parent.
It must also have enough surviving evidence to establish a specific consensus failure.
A reported case has a claim of invalidity and usually a hash, sometimes a header, but not the bytes needed to run that check.
Reported cases are therefore kept in the repository's [separate ledger](https://github.com/bitcoin-data/invalid-blocks/blob/166ff94/data/reported-blocks.jsonl) and are not fully admitted to the catalogue until the required evidence is available.

“Invalid” also needs a rule context.
During a soft-fork transition, nodes enforcing the new rule reject blocks that older software can accept.
The [2012 P2SH](https://bips.dev/16/) and [2015 version](https://bips.dev/66/) failures are the main historical examples.
The [2010 overflow](https://en.bitcoin.it/wiki/Value_overflow_incident) is a separate, explicitly retrospective case: the software initially accepted it, and the emergency fix made the block invalid.
Admitting a block to the catalogue therefore does not claim that every implementation of the day rejected it.

The catalogue counts headers with an established failure in their own contents, rather than every descendant of an invalid block.
That distinction matters for the [July 2015 SPV-mining forks](#invalid-block-versions-11-blocks-2015-to-2018).
That is, a descendant can have invalid ancestry without supplying another instance of a malformed coinbase or invalid transaction.
[One 2014 descendant](#coinbase-height-mistakes-26-blocks-2013-to-2023) is included because its own coinbase independently fails the height rule (so it was itself an invalid block).

The scope also excludes unmined invalid Stratum jobs and invalid relay encodings of otherwise accepted blocks, such as [ViaBTC's witness-stripped messages](https://b10c.me/observations/10-viabtc-blocks-without-witness-data/).
The [March 2013 database fork](https://bips.dev/50/) is outside the catalogue: the triggering block was well-formed, and whether a node could process it depended on that node's Berkeley DB lock state.
Two catalogued headers at that height, [225,430](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=225414&tree_to=225446&tree_height=225430&selected=00000000000001468e0b21b62cd0b41ec317eeeaa5afc0a8df43c01180e57f7f), are separate merge-mined candidates that fail the coinbase-height rule, not the block that triggered the fork.

### Sources and commitments

Bitcoin P2P monitors can capture some invalid blocks.
A failure visible earlier in validation has fewer opportunities to reach an observer, but [high-bandwidth compact-block relay](https://bips.dev/152/) can still forward a block [[before validation against the UTXO set is complete||Bitcoin Core relays to high-bandwidth peers after the header checks (proof of work, `nBits`, timestamp, version), `CheckBlock` and the contextual block checks such as the BIP34 height, but before `ConnectBlock` applies the transactions to the UTXO set.]].
That window is the likely route by which the 2023 transaction-ordering and sigops failures documented by b10c reached observers.
Historical peers that had not adopted a new rule also relayed blocks that upgraded peers rejected, and a monitor connected directly to a pool's node, or to a relay that does not validate, can receive blocks no validating peer would forward.

Merge mining provides a different record.
An AuxPoW auxiliary chain verifies its own proof-of-work and commitment rules, and does not require the Bitcoin template to be consensus-valid.
The header and coinbase can therefore survive in the auxiliary chain even when Bitcoin peers reject them.
Those auxiliary chains also have easier targets, so a broken template can produce many child blocks whose parent headers never meet Bitcoin difficulty and are not catalogued.
The initial sweep covered more than 25 auxiliary chains, building on Stifter _et al._'s 2018 paper [*Echoes of the Past*](https://eprint.iacr.org/2018/1134.pdf), which demonstrated the historical value of this material.
The available evidence varies by chain: Rootstock, for example, preserves a truncated coinbase, and Hathor reconstructs the parent header from a split AuxPoW record.

Archives add a third route: explorer transaction lists, complete block responses, test fixtures and old node files.
An archived explorer page proves the explorer saw the block, not that a peer relayed it, and a recovered [[block index||The database a node keeps of every header it has accepted, separate from the block files that hold the bodies.]] can hold a header long after its body file is gone.
The catalogue records which of the three routes, Bitcoin P2P observation, merge-mining record or archive, each header was recovered from, and {@fig:observation-timeline} colours the established headers by that combination.

Much of the recovery was done by AI agents working under my direction: chasing archive captures, trying transaction orderings until Merkle roots matched, and assembling bodies from parts.
Every proof, body and coinbase they produced is checked by the repository's own verification code, so each case is in the catalogue on the strength of those checks rather than of the agents' output.

:::plot{observation-timeline src="/assets/blog/2026/invalid-blocks/data/observation-timeline.json" annotations="/assets/blog/2026/invalid-blocks/data/events-timeline.json"}
:::
The 143 established failures by date and height, coloured by surviving observation channel. Archive covers explorer and node-file recoveries; merge mining covers auxiliary-chain records, whether AuxPoW or another merge-mining commitment such as Rootstock's; Bitcoin P2P covers a recorded peer or monitor observation. Each recorded combination of those routes has its own colour, including the one header retained by all three. These fields are the catalogue's provenance, not an exhaustive census of every historical observer. Diamonds mark the two F2Pool headers plotted at their auxiliary-chain observation dates. Vertical lines mark soft-fork enforcement dates, with BIP34's two thresholds drawn separately; SegWit and Taproot are included for completeness, though no cluster of failures follows them. {#fig:observation-timeline}

The 2012 P2SH cluster is almost entirely archival, while from 2013 merge-mined records dominate.
A smaller set, including F2Pool's 2023 sigops blocks, survives in both a Bitcoin P2P record and an auxiliary chain.

Which rule can be checked depends on which bytes survive.
A version or timestamp failure needs the header and chain context.
A coinbase-height failure also needs the coinbase, tied to that header by its Merkle branch.
A script failure can be established from the offending transaction, the output it spends and an inclusion proof: the sibling hashes that carry the transaction's [[txid||The double-SHA256 of the serialised transaction, the identifier the Merkle tree is built from.]] up to the header's Merkle root.
If hashing the txid together with those siblings, level by level, reproduces the root committed in the header, the header included that transaction, and the coinbase and every other transaction can stay missing.

Fee accounting has a different requirement: a coinbase above the subsidy may be valid if transaction fees cover the difference.
The ordinary transactions and their funding values must be known before calling it an overpayment.
The Eligius cases below show both sides of that distinction.

{@tab:evidence} separates established invalidity from complete-body availability.
Every established row is proved.
The rows differ only in which bytes are still missing.

| Evidence status | Blocks |
|---|---:|
| Established failure; complete body available | 16 |
| Established P2SH failure; exact coinbase still missing | 85 |
| Established header or coinbase failure; complete body unavailable | 42 |
| Reported failure; insufficient evidence to establish it | 10 |

Evidence available for the 143 established failures and 10 additional reports. {#tab:evidence}

:::alert{info}
**{{cyan:127 of the 143 established failures have no complete body; the rule is still proved from a header, coinbase, or authenticated inclusion.}}**
:::

### Failed rule breakdown

{@tab:rules} groups the established cases by failure mechanism.
Several mechanisms produce the same Bitcoin Core reject reason, so a reject string alone does not explain what went wrong.
Nor is the wording stable: a present-day node reports the 2012 P2SH failure with a different string from the one nodes logged at the time.

<!-- rule-table:start -->
| Failure mechanism | Diagnostic | Blocks |
|---|---|---:|
| P2SH redeem-script failure | `P2SH VerifySignature failed (historical)` | 89 |
| BIP34 height: difficulty in height field | `bad-cb-height` | 12 |
| BIP34 height: wrong height | `bad-cb-height` | 13 |
| BIP34 height: missing script push | `bad-cb-height` | 1 |
| Version below BIP66 minimum | `bad-version` | 6 |
| Version below BIP65 minimum | `bad-version` | 5 |
| Coinbase scriptSig above 100 bytes | `bad-cb-length` | 1 |
| Transaction ordering | `bad-txns-inputs-missingorspent` | 2 |
| Omitted unconfirmed parent | `bad-txns-inputs-missingorspent` | 1 |
| Inputs already spent in parent block | `bad-txns-inputs-missingorspent` | 4 |
| Coinbase overpayment | `bad-cb-amount` | 2 |
| Excessive sigops | `bad-blk-sigops` | 2 |
| Output value overflow | `bad-txns-vout-toolarge` | 1 |
| Retarget not applied | `bad-diffbits` | 1 |
| Timestamp below parent MTP | `time-too-old` | 3 |

Established consensus failures across 143 distinct headers.
Shared reject strings are separated by mechanism; the P2SH row shows the 2012 wording, which a present-day node reports as `mandatory-script-verify-flag-failed (Operation not valid with the current stack size)`. {#tab:rules}
<!-- rule-table:end -->

The timeline in {@fig:catalogue-timeline} shows how strongly the recovered record clusters around particular incidents and eras.
The complete identities are in {@tab:catalogue}.
Neither the chart nor the catalogue includes the reported cases.

:::plot{catalogue-timeline src="/assets/blog/2026/invalid-blocks/data/catalogue-timeline.json" annotations="/assets/blog/2026/invalid-blocks/data/events-timeline.json"}
:::
The 143 established failures by date and height, coloured by rule family. Points use header nTime except the two F2Pool timestamp failures, shown as diamonds at their auxiliary-chain observation dates. Overlapping points can represent multiple blocks; the full catalogue distinguishes their identities. Vertical lines mark the same soft-fork enforcement dates as the previous figure. {#fig:catalogue-timeline}

## The failures

The sections below run in order of how many blocks each failure accounts for, from the 89-block P2SH cluster down to the single-block cases, with two exceptions: the 2010 value overflow comes first because it is the earliest and the origin of the retrospective caveat noted above, and the timestamp failures come last because the two 2026 F2Pool headers among them are what prompted this post.
Each section states the rule, the blocks that broke it, what survives of them and where, and what can be said about the cause.

### The value overflow (1 block, 2010)

At height 74,638, a transaction created two outputs of roughly 92.2 billion BTC each.
Their sum overflowed the signed 64-bit value used in the check, so the software then in use accepted the transaction, as shown in {@fig:value-overflow}.
The [value-overflow incident](https://en.bitcoin.it/wiki/Value_overflow_incident) prompted an emergency fix and a replacement chain.
A present-day node rejects the retained body with `bad-txns-vout-toolarge`.

:::collapse{{@fig:value-overflow}: the value overflow, stage by stage}

![The two outputs overflowed the signed 64-bit total to −0.01 BTC, producing a positive calculated fee that passed the old check. The addition is broken into stages to illustrate the wraparound.](/assets/blog/2026/invalid-blocks/value-overflow.png){#fig:value-overflow}

:::

It is the retrospective case noted above, accepted when mined and invalid only after the fix.
It also predates merge mining, so its survival depends on Bitcoin-side records.

### One invalid P2SH transaction, many blocks (89 established cases, 2012)

[BIP16](https://bips.dev/16/) changed how pay-to-script-hash (P2SH) outputs were validated for [[blocks timestamped from 1 April 2012||BIP16 (P2SH) activated on the header's nTime, not height: blocks with timestamps at or after 1333238400. Present-day Bitcoin Core enforces P2SH at every height except one exception block, 170,060.]].
Under the old rules, a spend could satisfy the outer hash comparison without executing the script that hash commits to.
Under the new rules, the revealed redeem script also had to execute successfully.
A transaction could therefore pass the old checks and fail P2SH validation.

That is what happened with transaction [[`…ef2d5e3f78d2`||`4005d6bea3a93fb72f006d23e2685b85069d270cb57d15f0c057ef2d5e3f78d2`]].
The [4 April developer log](https://buildingbitcoin.org/bitcoin-dev/log-2012-04-04.html) preserves its 123-byte serialisation, [pasted by twobitcoins](https://buildingbitcoin.org/bitcoin-dev/log-2012-04-04.html#l-170).
It spends a P2SH output confirmed at height 170,054.
The input pushes a 1-of-1 `OP_CHECKMULTISIG` redeem script, with no signature and no dummy element, as shown in {@fig:p2sh-missing-arguments}.
Under the old rules the redeem script's hash matches the output and the spend is valid.
Under BIP16 the redeem script is then executed, `OP_CHECKMULTISIG` finds no signature and no dummy element on the stack, and the spend is invalid.

:::collapse{{@fig:p2sh-missing-arguments}: the P2SH spend's missing dummy and signature}

![The recovered transaction supplies only the redeem script. The missing dummy and signature belong before the redeem-script push in scriptSig; OP_CHECKMULTISIG is inside the redeem script.](/assets/blog/2026/invalid-blocks/p2sh-missing-arguments.png){#fig:p2sh-missing-arguments}

:::

#### Turning explorer records into proofs

A [15 June 2012 explorer capture](https://web.archive.org/web/20120615080519id_/http://blockchain.info:80/tx-index/3618498/4005d6bea3a93fb72f006d23e2685b85069d270cb57d15f0c057ef2d5e3f78d2) lists the transaction in 88 blocks from 1 April through 6 June, each matched by height and timestamp to a header preserved in the stale-blocks collection.
A separate [July discussion](https://buildingbitcoin.org/bitcoin-dev/log-2012-07-17.html) identifies another case at height 189,498, bringing the identified population to 89.
All 89 headers build on canonical parents, so these are not descendants of a few invalid openers.

Archived explorer block pages supplied complete txid lists for 46 cases.
The [Decker–Wattenhofer archive](https://github.com/NStifter/mergedmonitor/blob/54344d4e355f73eb94bef8d391e8fb6e4a9323a6/fork-analysis/decker-wattenhofer/orphans.tar.bz2) supplied lists for the remaining 43.
These records do not consistently preserve the order used in the block's Merkle tree.
[[I||The AI agents described in the methodology ran this search under my direction; the repository's checks verify the matching roots.]] tested candidate orderings based on transaction dependencies and historical mining priorities until each ordered list reproduced its header's Merkle root.
Hashing the recovered 123-byte transaction gives the invalid spend's txid, and its presence in each matching tree authenticates its inclusion in all 89 blocks.
Together with the output it spends and the failed redeem script, that establishes the P2SH failure without recovering the complete block.

Height 174,057 is the smallest case: two transactions, a coinbase and the invalid spend.
Hashing those two txids together in Bitcoin's byte order reproduces the header's Merkle root, as shown in {@fig:p2sh-proof-without-body}.
The coinbase's txid is enough for that proof even though its bytes remain missing.

:::collapse{{@fig:p2sh-proof-without-body}: proving P2SH inclusion without the block body}

![At height 174,057, the two recovered transaction IDs reproduce the preserved header's Merkle root. The recovered 123-byte spend hashes to the second txid and fails P2SH validation against its funding output; the first transaction's bytes are not needed for the inclusion proof.](/assets/blog/2026/invalid-blocks/p2sh-proof-without-body.png){#fig:p2sh-proof-without-body}

:::

For four blocks, Namecoin's AuxPoW record supplied the missing coinbase bytes as well.
Their other transactions later confirmed on the accepted chain, so with those canonical bytes, the Namecoin coinbase and the invalid spend, complete bodies exist for heights [**173,928**](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=173912&tree_to=173944&tree_height=173928&selected=000000000000023df73ac98923e2de321db3e3396102ad5dcfe3b25f01a81f64), [**173,957**](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=173941&tree_to=173973&tree_height=173957&selected=00000000000001bd778cffee5b5bae4c7b8d56a9aca955a04c60856b31b11155), [**173,998**](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=173982&tree_to=174014&tree_height=173998&selected=00000000000003bf4a1e491c802eeec3f1fbf3c2c7299e7935c2b0f33b189651) and [**174,605**](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=174589&tree_to=174621&tree_height=174605&selected=000000000000068294db0526cb4a5520d21b9d4f271a34012e96784b3b3168c5).
The four serialisations are among the [block files](https://github.com/bitcoin-data/invalid-blocks/tree/166ff94/blocks), the inclusion proofs for the other 85 headers are in [proofs/](https://github.com/bitcoin-data/invalid-blocks/tree/166ff94/proofs), and the dataset's [checks](https://github.com/bitcoin-data/invalid-blocks/blob/166ff94/ci/block_evidence.py) evaluate the spend with and without P2SH against every one of them.

The other 85 P2SH cases are in the catalogue without their coinbase bytes, since the inclusion proof is sufficient on its own.
That is, the header commits to the invalid spend through its Merkle root, and the spend fails BIP16 on its own bytes, so the other transactions in the block, the coinbase included, need be known only by their txids and not by their contents.
The missing first transactions have authenticated txids, but their coinbase structure cannot be checked without their bytes.

#### What caused the repeated inclusions?

On [2 April](https://buildingbitcoin.org/bitcoin-dev/log-2012-04-02.html#l-97), logs record nodes enforcing BIP16 rejecting the transaction with `P2SH VerifySignature failed`, and on [4 April](https://buildingbitcoin.org/bitcoin-dev/log-2012-04-04.html#l-202) Gregory Maxwell summarised that upgraded nodes reject transactions old nodes still accept.
In that same discussion Maxwell said the spend was presumably intentional, then noted that a CHECKMULTISIG accident could look the same, and that an attacker could have used a simpler script.
Miners still on the old checks could keep including it.
The inclusions thinned as miners upgraded: of the 89 blocks, 73 are from April, 13 from May, two from June and one from July.

The coinbases say little about who mined them.
The [four recovered ones](https://github.com/bitcoin-data/invalid-blocks/tree/166ff94/blocks) carry `eco@ozco.in /P2SH/` twice and `nmcbit.com` once, so [OzCoin](https://raw.githubusercontent.com/bitcoin-data/mining-pools/master/pools/ozcoin.json) mined at least two while carrying the [`/P2SH/` marker](https://bips.dev/16/) that signalled support for the rule its validation was not yet enforcing, and [NMCbit](https://raw.githubusercontent.com/bitcoin-data/mining-pools/master/pools/nmcbit.json) at least one.
The fourth is merge-mined and untagged.
Of the 86 blocks without a pool tag, [archived block pages](https://github.com/bitcoin-data/invalid-blocks/blob/166ff94/docs/notes.md#173928-173957-173998-and-174605---p2sh-redeem-script-failure-2012) preserve the coinbase's payout address for 43, and 40 of those are fresh addresses that no canonical coinbase between heights 172,000 and 190,000 reuses and no known pool used, which fits the [new key per block](https://github.com/bitcoin/bitcoin/blob/v0.6.0/src/main.cpp#L3083) that the reference client's own block template drew from its wallet.
The same pages record which node relayed each block to the explorer, Deepbit's for 13 of them, and a node [relays only a block it accepted](https://github.com/bitcoin/bitcoin/blob/v0.6.0/src/main.cpp#L1707), so that node was still on the old rules, but it does not identify the miner.
The other 43 untagged blocks have no archived page and no coinbase information at all.

In [November](https://buildingbitcoin.org/bitcoin-dev/log-2012-11-28.html#l-1667), a node still had an April invalid block from an old block file.
A reorg disconnected that block, and [[its transactions entered that node's mempool||In 2012, Bitcoin 0.7 re-added a disconnected block's transactions to the mempool without re-checking their inputs ([`AcceptToMemoryPool(txdb, false)`](https://github.com/bitcoin/bitcoin/blob/v0.7.1/src/main.cpp#L1598-L1600)), so a P2SH-invalid spend could enter a P2SH-enforcing mempool, as [sipa noted](https://buildingbitcoin.org/bitcoin-dev/log-2012-11-28.html#l-1743) at the time. The block was in that node's chain because [pre-checkpoint blocks were loaded without script checks](https://buildingbitcoin.org/bitcoin-dev/log-2012-11-28.html#l-1771).]], including the [“invalid p2sh killer”](https://buildingbitcoin.org/bitcoin-dev/log-2012-11-28.html#l-1681).
Despite the discussion, no invalid block resulted: the spend sat in that node's mempool but was never mined again, and the last block to contain it remains 189,498 on 17 July.

### Coinbase-height mistakes (26 blocks, 2013 to 2023)

[BIP34](https://bips.dev/34/), whose height rule took effect for version-2 blocks at height 224,413 on 5 March 2013, requires the block height as the first item in the coinbase scriptSig, encoded as a minimally encoded script number.
The header's previous-block hash fixes the parent and therefore the required height.
A plausible-looking integer in the coinbase is insufficient if it names a different height or uses the wrong encoding.
The catalogue contains four recurring issues, with their required and recovered height prefixes compared byte by byte in {@fig:coinbase-height-prefixes}.

:::collapse{{@fig:coinbase-height-prefixes}: required and recovered coinbase height prefixes}

![The coinbase input expands into its fields, then the scriptSig into the required height prefix and miner-supplied data. Four examples compare the required BIP34 bytes with the recovered prefixes.](/assets/blog/2026/invalid-blocks/coinbase-height-prefixes.png){#fig:coinbase-height-prefixes}

:::

**Difficulty in the height field: twelve blocks.**
Across March 2013, heights [225,013](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=224997&tree_to=225029&tree_height=225013&selected=000000000000037f2cc0769d4244cf50f1cace4ab76b0b4adb31010e10150708) to [226,912](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=226896&tree_to=226928&tree_height=226912&selected=00000000000000a34d399a3cb82e222fad8e73e465b905e333ada1662c61e0e0), the first coinbase item contains the header's [[compact difficulty||The 4-byte `nBits` encoding of the proof-of-work target. The original Bitcoin client pushed it first in every coinbase, and pre-BIP34 merge-mining software kept that layout.]] instead of its height.
Eight encode `0x1a03d74b`; four later blocks encode the next epoch's `0x1a0375fa`.
The wrong field tracks the difficulty transition, and the pattern persists from 9 to 20 March.

The recovered coinbases are [[untagged||No pool ASCII tag appears in the coinbase scriptSig.]], so the coinbases themselves do not identify the operator, though the report below attributes three of the twelve.
Namecoin, Devcoin and Ixcoin supply the surviving observations, and the catalogue has no recorded Bitcoin P2P observation of these twelve headers.

On [20 March](https://buildingbitcoin.org/bitcoin-dev/log-2013-03-20.html#l-1317), the last day of the cluster, Chris Double (`doublec`), who ran the [Bitparking merged-mining pool](https://bitcointalk.org/index.php?topic=57148.0) at mmpool.bitparking.com, reported version-2 blocks [[rejected for a coinbase height mismatch||His node logged `ERROR: AcceptBlock() : block height mismatch in coinbase`, the historical form of `bad-cb-height`.]] and [named height 226,845](https://buildingbitcoin.org/bitcoin-dev/log-2013-03-20.html#l-1389).
In the [pool's thread](https://bitcointalk.org/index.php?topic=57148.msg1646921#msg1646921) the same day he wrote that his merge-mining code had been putting the wrong height data in the coinbase of his version-2 blocks, that it had cost him his last three, and that merge mining was disabled until he had a fix.
Gavin Andresen [asked](https://buildingbitcoin.org/bitcoin-dev/log-2013-03-20.html#l-1404) whether he had put the wrong thing in the coinbase, and [[he said he had||He added that he had noticed earlier that day and was already fixing it.]].
His report covers three of the twelve heights.
The other nine share the same coinbase layout, the difficulty then an extranonce then the 44-byte merge-mining commitment, the same three auxiliary chains, and all fall between the pool [re-enabling merge mining on 9 March](https://bitcointalk.org/index.php?topic=57148.msg1602798#msg1602798) and disabling it on 20 March, which points to the same getwork server, though no report names them and the table leaves them unassigned.

**An unchanged parent: six BTC Guild blocks.**
On 3 April 2013, six headers tagged `BTC Guild 3` reference the same parent at height 229,387, requiring height [229,388](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=229372&tree_to=229404&tree_height=229388&selected=00000000000000329b2b44eca61829f13c94bbafb35022f13e49ffff279e3f03).
Their coinbases instead encode heights from 229,405 to 229,506, between 17 and 118 too high.
The timestamps fit a template that kept writing the current height while remaining stuck on parent 229,387.
{@fig:btc-guild-parent-hash} shows the mismatch.

:::collapse{{@fig:btc-guild-parent-hash}: BTC Guild's six headers on an unchanged parent}

![BTC Guild's six headers all reference parent 229,387, requiring height 229,388, while their encoded coinbase heights advance. Dashed links show the main-chain parents corresponding to those encoded heights; red links show the parent actually referenced.](/assets/blog/2026/invalid-blocks/btc-guild-parent-hash.png){#fig:btc-guild-parent-hash}

:::

**Off by one: seven blocks.**
Six coinbases encode a height one too high; an Eligius block encodes one too low.
Their similar errors do not establish a shared implementation or a single long-lived bug.
Four build on stale or invalid parents.
The 2016 blocks at [402,610](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=402594&tree_to=402626&tree_height=402610&selected=000000000000000003a1ce220ae97419cc4bdb5d70b90189b8f8a06b0b37e3a2) and [422,059](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=422043&tree_to=422075&tree_height=422059&selected=00000000000000000254ed1e8143f0bcd3c3564db07e7c35631e999d53e81fa7) extend stale parents.
The 2014 pair at heights [331,673](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=331657&tree_to=331689&tree_height=331673&selected=000000000000000010bcbb75dc17fce43da835bd26ccec95ed0d39570a51112a) and [331,674](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=331658&tree_to=331690&tree_height=331674&selected=00000000000000000d610e393ffeed6b9494d54121f05f7a3905f940f0e0cf69) extends a stale block and then an invalid block, as shown in {@fig:invalid-fork-2014}.
Both are counted because each coinbase encodes the wrong height on its own, and the second block's invalid parent is a separate defect.

:::collapse{{@fig:invalid-fork-2014}: the 2014 off-by-one fork}

![A stale block at 331,672 is extended by two blocks whose coinbase heights are each one too high. Block 331,674 independently fails the height rule and also has an invalid parent.](/assets/blog/2026/invalid-blocks/invalid-fork-2014.png){#fig:invalid-fork-2014}

:::

**The right number, the wrong encoding: one Hathor recovery.**
At height [649,674](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=649658&tree_to=649690&tree_height=649674&selected=00000000000000000008c80c1f8c101f8aa1fabd59d63ab1350bd1d5dba425e6) in September 2020, the coinbase starts with `fe ca e9 09 00`, Bitcoin's [[CompactSize||A variable-length integer format used for counts and lengths in Bitcoin serialisation.]] encoding of 649,674.
BIP34 requires a script push, `03 ca e9 09`, as compared in {@fig:coinbase-height-encoding}.
The `fe` marker does not perform that push, so the coinbase violates BIP34 (`bad-cb-height`).

:::collapse{{@fig:coinbase-height-encoding}: script push versus CompactSize at height 649,674}

![Height 649,674 as the required BIP34 script push and the observed CompactSize value. CompactSize uses a four-byte integer at this value; its marker does not supply the required script-push prefix.](/assets/blog/2026/invalid-blocks/coinbase-height-encoding.png){#fig:coinbase-height-encoding}

:::

The height encoding is one of several defects in this block, compared in {@fig:hathor-coinbase-issues}.
The coinbase carries witness data without an `OP_RETURN` [witness-commitment](https://bips.dev/141/) output, the supplied branch reaches the header root through the `wtxid` rather than the `txid`, and the payout script omits the byte that should push the 20-byte public-key hash.

A current node fed the block as assembled would therefore report `bad-txnmrklroot` before reaching the BIP34 check, and `unexpected-witness` if the body did match the root, while the malformed payout alone does not invalidate a block.
These findings concern the retained coinbase and proof, not a recovered complete Bitcoin body.

:::collapse{{@fig:hathor-coinbase-issues}: further defects in the Hathor coinbase}

![The Hathor recovery's height encoding, witness data without a coinbase `OP_RETURN` commitment, supplied branch using wtxid, and malformed payout. The payout defect alone is not a block-validity failure.](/assets/blog/2026/invalid-blocks/hathor-coinbase-issues.png){#fig:hathor-coinbase-issues}

:::

The height and payout encodings match bugs corrected in Hathor's reference coordinator in July 2020 ([height fix](https://github.com/HathorNetwork/hathor-core/commit/1e2b658bb384534434fd27244fb41fe252d546fd), [payout fix](https://github.com/HathorNetwork/hathor-core/commit/d9111f911485376cd70196e145b8854f479ad2f0)).
Their later appearance points to older or derivative software, though the operator is unidentified.

### Invalid block versions (11 blocks, 2015 to 2018)

[BIP66](https://bips.dev/66/), enforced from height 363,725 on 4 July 2015, and [BIP65](https://bips.dev/65/), enforced from 388,381 on 14 December 2015, introduced minimum block versions of 3 and 4 respectively.
Six catalogued headers use version 2 after BIP66 enforcement; five fall below the BIP65 minimum.
The version field and parent context are sufficient to establish these failures, without recovering transactions.

**Version 2 after BIP66: six blocks.**
The [July 2015 forks](https://en.bitcoin.it/wiki/July_2015_chain_forks) made this visible when miners built on headers without fully validating the blocks they extended.
The first block of the 4 July fork, at height 363,731, fails the version rule itself.
Its five version-3 descendants fail by ancestry and are excluded from the independent-failure count (not in the catalogue).
The [alert](https://bitcoin.org/en/alert/2015-07-04-spv-mining) that followed told lightweight-wallet users and anyone on Bitcoin Core 0.9.4 or earlier to wait an additional 30 confirmations, and it remained in force for weeks.
The first block's header was discovered in [BTC Relay test fixtures](https://github.com/ethereum/btcrelay/tree/master/test/headers/fork/20150704).
{@fig:july-2015-forks} compares this six-block fork with the reported three-block fork on 5 July, whose first block's header has not yet been recovered.

:::collapse{{@fig:july-2015-forks}: the July 2015 forks}

![The July 2015 forks: red marks the first blocks that fail the version rule, while amber marks descendants with invalid ancestry. The dashed 5 July sequence is based on contemporary reports; its first block's header has not yet been recovered.](/assets/blog/2026/invalid-blocks/july-2015-forks.png){#fig:july-2015-forks}

:::

Two further version-2 headers on 4 July, at 363,726 and 363,847, sit on canonical parents and did not open forks, and 363,726 was mined two minutes after enforcement began.
Three more failures followed, at [363,967](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=363951&tree_to=363983&tree_height=363967&selected=00000000000000000954ed93eda1e79e8261137548fa9ccf4d516bb384a3660b), [364,341](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=364325&tree_to=364357&tree_height=364341&selected=000000000000000012aac0664cd8b6cbc3ea485921a05f2c4340f928b0226d3c) and [367,047](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=367031&tree_to=367063&tree_height=367047&selected=00000000000000000f93ba8faf8bb018c7db642e30391748860cbfa5803a32a4).
The last (367,047), tagged `mmpool`, was mined on 26 July, three weeks after the initial fork, by the same Bitparking pool that produced the March 2013 coinbase-height cluster.
Further reported version-2 cases that have not yet been recovered are listed in {@tab:uncatalogued}.

**Version below BIP65: five blocks.**
Four days after BIP65 enforcement at height 388,381 on 14 December 2015, a version-3 header at [389,043](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=389027&tree_to=389059&tree_height=389043&selected=00000000000000000306ea979ad487157d2950081413eb9d2dca82060f1b89b2) failed the new minimum of 4.
The other four are BTC.COM headers from 2018, and they fail that same minimum by a different mechanism.
Their versions are `0xa0000000` and `0xe0000000`.
As signed 32-bit integers, both are negative.
{@fig:version-sign-bit} shows the sign-bit effect.

:::collapse{{@fig:version-sign-bit}: BTC.COM's sign-bit versions}

![BTC.COM's four headers use two version values with bit 31 set. Both become negative when interpreted as signed 32-bit integers and fail the enforced minimum version of 4.](/assets/blog/2026/invalid-blocks/version-sign-bit.png){#fig:version-sign-bit}

:::

Miners use the version field as extra nonce space, a practice called version rolling: [BIP320](https://bips.dev/320/) sets aside bits 13 to 28 for it, and [BIP310](https://bips.dev/310/) lets a pool tell its miners which bits they may change.
Both values keep bit 29 set, the base every version-signalling block carries; `0xa0000000` adds bit 31 and `0xe0000000` adds bits 30 and 31, all outside the permitted range.
Bit 31 is the sign bit, which is what turns the value negative.
The likeliest cause is mining hardware or firmware rolling a wider mask than it was given, though nothing in the surviving evidence identifies it.
Namecoin and Rootstock each preserved all four headers, and their full PoW and invalid signed versions are directly checkable.

### Inputs already spent (4 blocks, 2018)

A transaction cannot spend an output that has already been spent in an earlier block.
This can produce the same `bad-txns-inputs-missingorspent` error as the missing or misordered dependencies [described next](#transaction-dependencies-3-blocks-2017-and-2023), but the evidence must establish that the input was already consumed.
At heights 507,514, 509,557, 515,319 and 534,339 in 2018, four AntPool blocks repeat non-coinbase transactions already confirmed in their canonical parents.
Those transactions' inputs have already been consumed when validation reaches the copies.
The surviving block bodies and their parents establish the conflict.
Replaying each candidate against that parent on Bitcoin Core v31.1 returned `bad-txns-inputs-missingorspent`.

The simplest case is 515,319.
Its header names parent 515,318 and its body contains a new coinbase followed by the same 79 ordinary transactions, in the same order, as shown in {@fig:antpool-spent-inputs}.
The other three repeat 218, 338 and 1,253 of their parents' transactions, the last two alongside 399 and 1,069 fresh transactions.
All four were timestamped within about a minute of their parent.
The pattern fits a template that took the new parent's hash without rebuilding the transaction list, so the body still carried the parent's transactions.

:::collapse{{@fig:antpool-spent-inputs}: AntPool's repeated transactions at 515,319}

![AntPool's block at 515,319 contains a new coinbase followed by the same 79 ordinary transactions as parent 515,318, in the same order. Their inputs were already spent in the parent, so the candidate fails with bad-txns-inputs-missingorspent.](/assets/blog/2026/invalid-blocks/antpool-spent-inputs.png){#fig:antpool-spent-inputs}

:::

These four bodies survived in [archived chainquery.com responses](https://github.com/NStifter/mergedmonitor/blob/54344d4e355f73eb94bef8d391e8fb6e4a9323a6/fork-analysis/chainquery.com/orphans_chainquery.com.json) and were originally contributed to the stale-blocks collection as stales, [from which they were removed](https://github.com/bitcoin-data/stale-blocks/pull/139) once the failure was established.
A block can have valid PoW, a correct Merkle root and well-formed transactions, yet still fail when those transactions are applied to its parent state.

### Transaction dependencies (3 blocks, 2017 and 2023)

When a transaction spends an output created by another transaction in the same block, the parent transaction must appear first.
Validation applies transactions in order, making each new output available to subsequent transactions.
So a parent included too late or omitted entirely leaves the child's input unavailable when validation reaches it, producing `bad-txns-inputs-missingorspent`.
{@fig:transaction-dependencies} illustrates these two mechanisms.

:::collapse{{@fig:transaction-dependencies}: parent-before-child ordering}

![An unconfirmed parent transaction must precede its child. Placing the parent later or omitting it leaves the input unavailable when the child is checked.](/assets/blog/2026/invalid-blocks/transaction-dependencies.png){#fig:transaction-dependencies}

:::

**Parent included too late: two blocks.**
At height [477,115](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=477099&tree_to=477131&tree_height=477115&selected=0000000000000000013ee4a86822d37a061732e04ee5f41fb77168f193363d1b) on 23 July 2017, three transactions in a 255-transaction block spend outputs from transactions that appear later in the body (this was attributed to 1Hash in a [BitcoinTalk thread](https://bitcointalk.org/index.php?topic=2041607.0)).
Namecoin kept its header and chainquery.com kept its body, from which the ordering failure can be checked.
Six years later, [MARA's block at 809,478](https://b10c.me/observations/07-invalid-block-809478/) failed after sorting transactions by fee rather than respecting dependencies.
Its retained evidence comes from Bitcoin's compact-block relay window.

**Parent omitted: one block.**
At height [474,294](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=474278&tree_to=474310&tree_height=474294&selected=00000000000000000182acdf5657c93a0769dc6f9004047496b2e15efc6a4232) on 5 July 2017, another block attributed to 1Hash (the same [BitcoinTalk thread](https://bitcointalk.org/index.php?topic=2041607.0) as above) contains a transaction whose unconfirmed parent is absent.
The parent is neither elsewhere in the body nor anywhere in the canonical chain.
The [[spending transaction||`a6655ca47c62ffcbf6d3dcba34bc1af24a1eb0bcea54d3099d36201a66aec2a0`]] and its [[parent||`b11a78c6c61af1cb37586f639050d74b95c2b0fd525623b6cb6a4bb4fba46a0e`, whose output 1 it spends.]] were later confirmed together in the [competing block](https://mempool.space/block/000000000000000000db2504327e272fe7658fac0dd0741f46b212256e500886) at that height.

### Coinbase overpayment (2 established blocks, 2012 and 2019)

The coinbase may claim the block subsidy plus the fees of the transactions actually included.
A coinbase computed from another template can claim fees for transactions the mined block body does not contain.
For the two established cases below, the fees are known and the overpayment is exact.

**Eligius: one established overpayment, three unresolved reports.**
A [9 September 2012 developer report](https://buildingbitcoin.org/bitcoin-dev/log-2012-09-09.html) identifies four Eligius blocks as coinbase overpayments: [197,438](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=197422&tree_to=197454&tree_height=197438&selected=0000000000000307872ec2eb0eae2dca3ed9ce6af9e024412cb3ddfe8afd12a7), 197,701, 197,705 and 197,883.
Only 197,438 has enough surviving evidence to establish the overpayment, and the other three remain outside the catalogue.

At 197,438, an Ixcoin AuxPoW record preserves the coinbase and the hash of the other transaction.
That transaction later confirmed at height 197,523, allowing its exact bytes to be recovered and the complete two-transaction block to be reconstructed.

The ordinary transaction's authenticated input is worth 503,413,843 satoshis, and its outputs total exactly the same amount.
Its fee is therefore zero.
The coinbase pays 5,001,000,000 satoshis against the 5,000,000,000-satoshi subsidy: **an excess of 1,000,000 satoshis, or 0.01 BTC**.
The reconstructed block is among the dataset's [block files](https://github.com/bitcoin-data/invalid-blocks/blob/166ff94/blocks/197438-0000000000000307872ec2eb0eae2dca3ed9ce6af9e024412cb3ddfe8afd12a7.bin), and its [check](https://github.com/bitcoin-data/invalid-blocks/blob/166ff94/ci/block_evidence.py) recomputes those amounts from the authenticated funding transaction, independently of the contemporary report.

At 197,883, the authenticated coinbase pays 50.0005 BTC, and [[four auxiliary chains||Namecoin, Ixcoin, i0coin and Devcoin.]] preserve the same header, coinbase and Merkle sibling.
The [[other transaction's hash||`002a6ddf7bc76472bba263f4c5eea26c3ab978b9879b44ecb50421afd3d23956`, the coinbase's Merkle sibling.]] is known, but its bytes remain missing.
Unlike the ordinary transaction at 197,438, it has not been found [[confirmed under that hash||Absent from a txindex node and from public explorers under this exact txid.]].
If it paid a 0.0005 BTC fee, that coinbase amount would be permissible.
A coinbase above the subsidy alone cannot settle the question.

A reproduction using the [historical Eloipool trimming code](https://github.com/luke-jr/eloipool/blob/01cdd426298feb8a3f55cec718155e027d096fcc/merklemaker.py) can drop a transaction from the template while keeping its fee in the coinbase total, which is the reported kind of failure.
The same code can also produce a template in which the one retained transaction genuinely pays a 0.0005 BTC fee, giving an identical coinbase amount legitimately, so the amount alone cannot tell the two apart.
The code shows a possible mechanism, but does not establish the missing transaction's fee or which configuration Eligius ran.

For the remaining two Eligius reports, an [archived September block list](https://web.archive.org/web/20120918194744id_/http://eligius.st:80/~wizkid057/newstats/blocks.php) supplies full hashes for 197,701 and 197,705, but their headers and bodies remain missing and none of the auxiliary chains that preserved 197,438 or 197,883 holds them.

**AntPool [584,802](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=584786&tree_to=584818&tree_height=584802&selected=0000000000000000000b47042b90c6a893e6e5cdef70c92beefb88f4c5fa5a69): no ordinary transactions.**
In July 2019, AntPool's 334-byte block contained only a coinbase paying 13.26546691 BTC against a 12.5 BTC subsidy.
With no ordinary transactions, there were no fees to justify the extra 0.76546691 BTC.
The rejection was [widely reported](https://thenextweb.com/news/bitmain-bitcoin-invalid-block-150000-mining-reward-lost), including ForkMonitor's check across eight implementations.
Elastos also preserved the header and coinbase.

A stale fee total is a plausible explanation and resembles later [invalid mining jobs documented by b10c](https://b10c.me/observations/14-antpool-and-friends-invalid-mining-jobs/).
Unlike the 2018 spent-input blocks, which kept parent transactions they should have dropped, this one claimed fees with no ordinary transactions at all.

### Excessive signature operations (2 blocks, 2023)

F2Pool blocks at heights [783,426](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=783410&tree_to=783442&tree_height=783426&selected=00000000000000000002ec935e245f8ae70fc68cc828f05bf4cfa002668599e4) and [784,121](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=784105&tree_to=784137&tree_height=784121&selected=000000000000000000046a2698233ed93bb5e74ba7d2146a68ddb0c2504c980d) each reached a [[sigops cost||Bitcoin Core's per-block count of signature-checking operations, weighted as SegWit introduced (legacy and P2SH operations count four times, witness operations once). The consensus limit is 80,000.]] of 80,003 against the 80,000 limit.
b10c's [account](https://b10c.me/observations/11-invalid-blocks-783426-and-784121/) has both complete bodies and explains the off-by-three result.
[[Five auxiliary chains||Elastos, Namecoin, Rootstock, Syscoin and Xaya.]] also retained the headers, which on their own cannot establish a sigops count.

### A coinbase greeting three bytes too long (1 block, 2013)

On 31 December 2013, GHash.IO's [block](https://github.com/bitcoin-data/invalid-blocks/blob/166ff94/data/invalid-blocks.jsonl#L110) at height [277,975](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=277959&tree_to=277991&tree_height=277975&selected=0000000000000000de6f0b2978aa2b268cb9a54c5de6d21f97d17c6b0ff0ac3f) included the greeting `Happy New Year! Yours GHash.IO.`.
The preceding fields already occupied 72 bytes, including a 45-byte push carrying the 44-byte merge-mining commitment, leaving only 28 bytes for the 31-byte greeting, as shown in {@fig:ghash-new-year-coinbase}.
The coinbase scriptSig reached 103 bytes, exceeding the 100-byte consensus maximum and producing `bad-cb-length`.
Unlike the other 2013 coinbase failures, its BIP34 height prefix was correct, and the length alone is the fault.

:::collapse{{@fig:ghash-new-year-coinbase}: GHash.IO's 103-byte coinbase scriptSig}

![GHash.IO's complete coinbase scriptSig, grouped by field. The 72 bytes preceding the 31-byte greeting leave room for only 28 greeting bytes; the final IO. exceeds the 100-byte limit.](/assets/blog/2026/invalid-blocks/ghash-new-year-coinbase.png){#fig:ghash-new-year-coinbase}

:::

### A missed difficulty retarget (1 block, 2022)

Height [717,696](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=717680&tree_to=717712&tree_height=717696&selected=0000000000000000000045c5040bf46b4cd6c6f8f4004c149cd602e4e356e71c) is a difficulty-retarget boundary.
ViaBTC's header carries the previous epoch's `nBits`, `170b98ab`, instead of the required `170b8c8b`, producing `bad-diffbits`.
The old target was easier, but the header's hash happens to clear the correct, harder target as well.
That is why it meets this catalogue's full-PoW requirement despite encoding the wrong difficulty.
Emercoin, Syscoin and Namecoin preserved the header.

### Timestamps below median time past (3 blocks, 2015 to 2026)

A block's timestamp must be strictly greater than its parent's [[median time past||The median timestamp of the previous eleven blocks. This lower bound is separate from the two-hour future-time check, which older releases measured against network-adjusted time and Bitcoin Core 27.0 onward measures against the node's own clock.]].
The header at height [380,992](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=380976&tree_to=381008&tree_height=380992&selected=0000000000000000084ee972bfe620224e6893448a9001d2b1f236ede0423779) in 2015 falls about 4.6 hours below that bound.
Two F2Pool cases in 2026 miss it by days, as shown in {@fig:f2pool-timestamps}.

On **22 April 2026**, auxiliary chains recorded a header at height [**946,213**](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=946197&tree_to=946229&tree_height=946213&selected=00000000000000000000c3d95a4bdc068dfe0c6d1e7ad13045c6f570e58d9ed7) whose nTime was 15 April, **634,618 seconds (7.35 days) below the parent MTP**.
On **13 July 2026**, another header at [**957,780**](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=957764&tree_to=957796&tree_height=957780&selected=0000000000000000000198e12592edbe83c84a78f75b3f8d67a3fe2075ef2ffb) used an nTime of 29 June, **1,206,929 seconds (13.97 days) below the parent MTP**.
Both fail `time-too-old`.

:::collapse{{@fig:f2pool-timestamps}: F2Pool's 2026 timestamps against median time past}

![F2Pool's headers at heights 946,213 and 957,780 fall roughly 7.35 and 13.97 days below their parents' median time past. Both fail the requirement that nTime be strictly greater than parent MTP.](/assets/blog/2026/invalid-blocks/f2pool-timestamps.png){#fig:f2pool-timestamps}

:::

Namecoin, Syscoin and Elastos recorded both whereas Fractal Bitcoin recorded only 957,780.
The [merge-mining monitor](https://mmm.deadmanoz.xyz/) [[captured 957,780 live||Invalid-block (error) handling on the monitor was introduced after this event.]], while 946,213 was recovered retrospectively.
No Bitcoin-side capture of either header is known.

Both headers build on the canonical parent at their height, and their [coinbases](https://github.com/bitcoin-data/invalid-blocks/blob/166ff94/docs/notes.md#coinbase-proofs), preserved in Namecoin's AuxPoW records, carry the `/F2Pool/` tag and claim 3.20191623 BTC and 3.14128765 BTC, the 3.125 BTC subsidy plus fees, all of it forfeited.
A mining template that updated its parent while retaining an old timestamp could explain these headers, but the available evidence does not establish how the fault arose.
Whatever the cause, the violation is directly checkable from each header and its parent's median time past.

:::alert{info}
**{{cyan:The April and July 2026 F2Pool headers miss parent median time past by roughly 7 and 14 days, and neither has been reported before.}}**
:::

## Reported cases and missing evidence

The 10 additional reports in {@tab:uncatalogued} are grouped in {@tab:reported-summary} by what remains missing.
They do not contribute to the 143 established failures or the rule totals, but they are useful recovery targets.

| Reported family | Cases | What remains needed |
|---|---:|---|
| Eligius coinbase overpayment, 2012 | 3 | Transaction and fee evidence; two also lack headers |
| P2Pool unspecified failure, 2012 | 1 | Header, rejection reason and authenticated rule evidence |
| Version-2 blocks after BIP66, 2015 | 5 | The 80-byte headers |
| Bitcoin Unlimited oversized block, 2017 | 1 | Body bytes establishing the size violation |

Reported cases by outstanding evidence requirement. {#tab:reported-summary}

**P2Pool 212,048: identified report, missing rejection reason.**
On [13 December 2012](https://buildingbitcoin.org/bitcoin-dev/log-2012-12-13.html#l-334), gmaxwell reported an invalid P2Pool block at height 212,048 and supplied its hash prefix, but said his node had not logged the rejection reason.
The full hash appears in [Syke's historical node dump](https://pastebin.com/raw/LZxst5vD), linked from his [2016 forum post](https://bitcointalk.org/index.php?topic=1403436.msg14244002#msg14244002), with status `invalid` and branch length one.
No header or body has been recovered, so neither the proof of work nor a named consensus failure can be independently checked.
The [ledger entry](https://github.com/bitcoin-data/invalid-blocks/blob/166ff94/data/reported-blocks.jsonl#L4) records the report, the node dump and its archived copy.

**Version failures: reported hashes, missing headers.**
The five version reports include the first block of MegaBigPower's 5 July fork at 363,997 and four later blocks at 364,261, 367,195, 386,682 and 387,396.
A [2017 bitcoin-dev message](https://gnusha.org/pi/bitcoindev/48d3940ab1a2bd53c6e056ce7fbcd361@cock.lu/) lists their full hashes alongside `bad-version(0x00000002)`.
Without the headers, neither the version field nor the PoW can be independently rechecked.
The message lists every hash as a `.bin` filename, which suggests the block files existed on disk in March 2017.
Outreach to the original author has not yet elicited a response.

**Bitcoin Unlimited 450,529: header recovered, size violation unverified.**
The [January 2017 incident statement](https://bitco.in/forum/threads/buir-2017-01-29-statement-regarding-excessive-block-by-bitcoin-unlimited-software-29-jan-2017.1790/) reports a 1,000,023-byte block from Bitcoin.com's pool, exceeding the 1 MB limit after incorrect coinbase-size accounting.
[Archived BlockCypher fields](https://web.archive.org/web/20170129223228id_/https://live.blockcypher.com/btc/block/000000000000000000cf208f521de0424677f7a87f2f278a1042f38d159565f5/) reconstruct its exact [80-byte header](https://github.com/bitcoin-data/invalid-blocks/blob/166ff94/data/reported-blocks.jsonl#L10), and its hash meets the expected target.
The body is still incomplete, so the reported 23-byte excess has not been verified from the serialised block itself.

## Conclusions

The early P2SH, coinbase-height and version clusters coincide with newly enforced rules.
[SegWit](https://bips.dev/141/) and [Taproot](https://bips.dev/341/) have no comparable activation clusters, as {@fig:catalogue-timeline} shows.
Later cases show failures against long-standing rules, including AntPool's already-spent inputs in 2018 and F2Pool's timestamps in 2026.
The [catalogue](https://github.com/bitcoin-data/invalid-blocks) brings these incidents and their surviving evidence together, making each established failure independently checkable.

The recoveries show how complementary records can establish failures that no single source could prove.
For the P2SH cases, archived txid lists and preserved headers establish inclusion of a spend whose script failure can be checked without a complete block body.
For a suspected coinbase overpayment, however, one missing transaction can leave the decisive fee unknown.
Preserving those records and their provenance allows old reports to become independently checkable cases as missing evidence emerges.

Merge mining has proved to be an unusually productive side channel into Bitcoin mining.
Auxiliary-chain records yielded roughly 1,400 stale headers new to the [stale-blocks collection](https://github.com/bitcoin-data/stale-blocks), and provide this catalogue's only recorded observation for 35 established invalid headers.
Stales reveal mining competition outside the accepted chain; invalid blocks reveal failures in constructing candidates that satisfy Bitcoin's rules.
An auxiliary chain checks its own rules, so it can preserve evidence of both outcomes even when Bitcoin peers never relay the candidate.

The two F2Pool headers that prompted this catalogue make the case for ongoing monitoring particularly clear.
The July F2Pool header was captured live by the [merge-mining monitor](https://mmm.deadmanoz.xyz/), while the April header was recovered retrospectively.
Neither has a known Bitcoin-side capture; auxiliary chains preserved the evidence that establishes their failures.
These records cover only participating miners, and uneven monitoring and archive coverage mean the catalogue cannot establish how often invalid blocks occur across Bitcoin mining as a whole.
They nevertheless reveal mining activity that would otherwise be missing from the collected record.
[[Monitoring the chains that merge-mine with Bitcoin||Even if [BIP 332 stale-tip relay](https://bips.dev/332/) is widely adopted, auxiliary chains will remain useful for both stales and invalids. The proposal only shares recent headers known to participating peers and recommends excluding invalid headers, including timestamp failures like F2Pool's.]] is essential to a holistic Bitcoin monitoring effort.

## Contributions and corrections

If you have evidence of an invalid block, additional information about any of these cases, or a correction to this post, contributions to [invalid-blocks](https://github.com/bitcoin-data/invalid-blocks) are welcome.
Old node files, pool logs and archived discussions could help resolve a reported case or identify one that is missing entirely.
You do not need a complete block or a finished proof to suggest a lead: include whatever hashes, dates and source material you have.

## Summary tables and sources

The first table summarises the catalogue's 143 established failures, and the second lists the 10 reported cases that do not yet meet its evidence requirements.
Heights can repeat because different headers were mined at the same height.
“Unknown” means this catalogue does not assign a pool, rather than asserting that a recovered coinbase has no identifying bytes.
A bare pool name comes from a tag in the recovered coinbase, “(reported)” from a report of the time, and “(address)” from the coinbase's payout address matched against the [mining-pools dataset](https://github.com/bitcoin-data/mining-pools).
Dates, full hashes, source links and observation channels for all established cases are in the [post catalogue](/assets/blog/2026/invalid-blocks/data/catalogue.json); the [reported ledger](https://github.com/bitcoin-data/invalid-blocks/blob/166ff94/data/reported-blocks.jsonl) covers the rest.

:::collapse{All 143 established failures}{#catalogue-table}
“Body” denotes a complete recovered or reconstructed block; “inclusion” denotes an authenticated P2SH transaction proof with the coinbase still missing; “header/coinbase” denotes the remaining header- or coinbase-checkable failures.
Each entry's rule is established, regardless of which of those components survives.

<!-- catalogue-table:start -->
| Height | Hash suffix | Date (UTC) | Failure | Pool / tag | Evidence |
|---:|---|---|---|---|---|
| 74,638 | `…7b1470a7ec1c` | 2010-08-15 | Output value overflow | unknown | body |
| 173,886 | `…4f6a53920bc1` | 2012-04-01 | P2SH redeem-script failure | unknown | inclusion |
| [173,928](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=173912&tree_to=173944&tree_height=173928&selected=000000000000023df73ac98923e2de321db3e3396102ad5dcfe3b25f01a81f64) | `…b25f01a81f64` | 2012-04-01 | P2SH redeem-script failure | OzCoin | body |
| 173,948 | `…58f231f583e1` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| [173,957](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=173941&tree_to=173973&tree_height=173957&selected=00000000000001bd778cffee5b5bae4c7b8d56a9aca955a04c60856b31b11155) | `…856b31b11155` | 2012-04-02 | P2SH redeem-script failure | OzCoin | body |
| 173,965 | `…a1118e18423b` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| 173,970 | `…bd850d03c32f` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| 173,980 | `…5b9a9a2842c0` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| 173,986 | `…1abaf6792847` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| 173,989 | `…5634470c63a2` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| 173,993 | `…b7b5e073ba3f` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| [173,998](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=173982&tree_to=174014&tree_height=173998&selected=00000000000003bf4a1e491c802eeec3f1fbf3c2c7299e7935c2b0f33b189651) | `…b0f33b189651` | 2012-04-02 | P2SH redeem-script failure | NMCbit | body |
| 174,005 | `…88e45c3799de` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| 174,012 | `…fa678a6e6bc0` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| 174,017 | `…c726993e0dd9` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| 174,051 | `…8f911945ec51` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| 174,057 | `…e7c2e9e25e5c` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| 174,061 | `…0aa2e6c85e21` | 2012-04-02 | P2SH redeem-script failure | unknown | inclusion |
| 174,065 | `…3581271cb371` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,067 | `…3850324175a3` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,076 | `…8a7554eb066c` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,090 | `…55aed2242d6b` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,094 | `…20f5cd00d157` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,102 | `…74d1b5c030f0` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,121 | `…4af3124170cb` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,162 | `…06c096cee331` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,174 | `…ccf50ed76b6d` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,182 | `…3950c4bdafa7` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,185 | `…9876c2b488d1` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,187 | `…80b583a78114` | 2012-04-03 | P2SH redeem-script failure | unknown | inclusion |
| 174,232 | `…a50ac94f6521` | 2012-04-04 | P2SH redeem-script failure | unknown | inclusion |
| 174,234 | `…22e472b90a19` | 2012-04-04 | P2SH redeem-script failure | unknown | inclusion |
| 174,242 | `…f733ee0d07fa` | 2012-04-04 | P2SH redeem-script failure | unknown | inclusion |
| 174,307 | `…ea36120ec3dd` | 2012-04-04 | P2SH redeem-script failure | unknown | inclusion |
| 174,313 | `…a320009af63e` | 2012-04-04 | P2SH redeem-script failure | unknown | inclusion |
| 174,330 | `…cc79933a5090` | 2012-04-04 | P2SH redeem-script failure | unknown | inclusion |
| 174,343 | `…8950ac1dd622` | 2012-04-05 | P2SH redeem-script failure | unknown | inclusion |
| 174,380 | `…8d451134aa55` | 2012-04-05 | P2SH redeem-script failure | unknown | inclusion |
| 174,388 | `…d3b14e488019` | 2012-04-05 | P2SH redeem-script failure | unknown | inclusion |
| 174,414 | `…53b3ea01f56c` | 2012-04-05 | P2SH redeem-script failure | unknown | inclusion |
| 174,452 | `…f9cf1003c0bc` | 2012-04-06 | P2SH redeem-script failure | unknown | inclusion |
| 174,506 | `…8d016897c332` | 2012-04-06 | P2SH redeem-script failure | unknown | inclusion |
| 174,531 | `…811f0512cd4a` | 2012-04-06 | P2SH redeem-script failure | unknown | inclusion |
| 174,593 | `…64b5fc22412f` | 2012-04-07 | P2SH redeem-script failure | unknown | inclusion |
| [174,605](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=174589&tree_to=174621&tree_height=174605&selected=000000000000068294db0526cb4a5520d21b9d4f271a34012e96784b3b3168c5) | `…784b3b3168c5` | 2012-04-07 | P2SH redeem-script failure | unknown | body |
| 174,702 | `…68c8f135e54f` | 2012-04-07 | P2SH redeem-script failure | unknown | inclusion |
| 174,772 | `…e54d21dee7b8` | 2012-04-08 | P2SH redeem-script failure | unknown | inclusion |
| 174,785 | `…1171c8cd8032` | 2012-04-08 | P2SH redeem-script failure | unknown | inclusion |
| 174,792 | `…1f7087803898` | 2012-04-08 | P2SH redeem-script failure | unknown | inclusion |
| 175,140 | `…2d3a2f01aa8c` | 2012-04-10 | P2SH redeem-script failure | unknown | inclusion |
| 175,227 | `…a45f7297e45d` | 2012-04-11 | P2SH redeem-script failure | unknown | inclusion |
| 175,240 | `…85a77db97c2d` | 2012-04-11 | P2SH redeem-script failure | unknown | inclusion |
| 175,245 | `…feeb5434fb57` | 2012-04-11 | P2SH redeem-script failure | unknown | inclusion |
| 175,261 | `…cfffec89309a` | 2012-04-11 | P2SH redeem-script failure | unknown | inclusion |
| 175,343 | `…6da4ef02b854` | 2012-04-12 | P2SH redeem-script failure | unknown | inclusion |
| 175,419 | `…f808084f44c3` | 2012-04-12 | P2SH redeem-script failure | unknown | inclusion |
| 175,423 | `…230aa4e281c0` | 2012-04-12 | P2SH redeem-script failure | unknown | inclusion |
| 175,451 | `…9d7e0bdbf726` | 2012-04-13 | P2SH redeem-script failure | unknown | inclusion |
| 175,488 | `…ac2293a835ff` | 2012-04-13 | P2SH redeem-script failure | unknown | inclusion |
| 175,517 | `…641db259332a` | 2012-04-13 | P2SH redeem-script failure | unknown | inclusion |
| 175,613 | `…abd92d44ac91` | 2012-04-14 | P2SH redeem-script failure | unknown | inclusion |
| 175,840 | `…883fc017dc91` | 2012-04-16 | P2SH redeem-script failure | unknown | inclusion |
| 175,848 | `…693ccfad03d8` | 2012-04-16 | P2SH redeem-script failure | unknown | inclusion |
| 175,888 | `…8ac4ec3798b1` | 2012-04-16 | P2SH redeem-script failure | unknown | inclusion |
| 175,926 | `…c38d350a746c` | 2012-04-16 | P2SH redeem-script failure | unknown | inclusion |
| 175,968 | `…e0910bab0805` | 2012-04-17 | P2SH redeem-script failure | unknown | inclusion |
| 175,998 | `…b6c95012abbd` | 2012-04-17 | P2SH redeem-script failure | unknown | inclusion |
| 176,210 | `…006aeabb91e0` | 2012-04-19 | P2SH redeem-script failure | unknown | inclusion |
| 176,897 | `…b1fcf0de7a2d` | 2012-04-23 | P2SH redeem-script failure | unknown | inclusion |
| 176,925 | `…dc03ac13d76a` | 2012-04-23 | P2SH redeem-script failure | unknown | inclusion |
| 177,050 | `…c1013bc6bea0` | 2012-04-24 | P2SH redeem-script failure | unknown | inclusion |
| 177,470 | `…986abb94ab19` | 2012-04-27 | P2SH redeem-script failure | unknown | inclusion |
| 177,525 | `…4bc884524fdf` | 2012-04-28 | P2SH redeem-script failure | unknown | inclusion |
| 177,896 | `…be438db392f3` | 2012-04-30 | P2SH redeem-script failure | unknown | inclusion |
| 178,119 | `…e81c4593ba40` | 2012-05-01 | P2SH redeem-script failure | unknown | inclusion |
| 179,218 | `…b1a7a1cbbcef` | 2012-05-08 | P2SH redeem-script failure | unknown | inclusion |
| 179,235 | `…51cc80bc3fc1` | 2012-05-08 | P2SH redeem-script failure | unknown | inclusion |
| 179,700 | `…8e0bfaf758da` | 2012-05-11 | P2SH redeem-script failure | unknown | inclusion |
| 179,781 | `…e6680971c578` | 2012-05-12 | P2SH redeem-script failure | unknown | inclusion |
| 179,890 | `…0ed289225cbe` | 2012-05-12 | P2SH redeem-script failure | unknown | inclusion |
| 180,227 | `…89fc4ee445d4` | 2012-05-15 | P2SH redeem-script failure | unknown | inclusion |
| 180,376 | `…93132d6d9812` | 2012-05-16 | P2SH redeem-script failure | unknown | inclusion |
| 180,402 | `…59d35da2022a` | 2012-05-16 | P2SH redeem-script failure | unknown | inclusion |
| 180,736 | `…0b9f6242293b` | 2012-05-19 | P2SH redeem-script failure | unknown | inclusion |
| 182,155 | `…5ea87e0a6b06` | 2012-05-29 | P2SH redeem-script failure | unknown | inclusion |
| 182,159 | `…e25767fe026a` | 2012-05-29 | P2SH redeem-script failure | unknown | inclusion |
| 182,195 | `…29582c5448f6` | 2012-05-30 | P2SH redeem-script failure | unknown | inclusion |
| 182,532 | `…54c3b2c16d2b` | 2012-06-01 | P2SH redeem-script failure | unknown | inclusion |
| 183,255 | `…d3d2891f5398` | 2012-06-06 | P2SH redeem-script failure | unknown | inclusion |
| 189,498 | `…187f7aa750b5` | 2012-07-17 | P2SH redeem-script failure | unknown | inclusion |
| [197,438](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=197422&tree_to=197454&tree_height=197438&selected=0000000000000307872ec2eb0eae2dca3ed9ce6af9e024412cb3ddfe8afd12a7) | `…ddfe8afd12a7` | 2012-09-06 | Coinbase overpayment | Eligius | body |
| [225,013](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=224997&tree_to=225029&tree_height=225013&selected=000000000000037f2cc0769d4244cf50f1cace4ab76b0b4adb31010e10150708) | `…010e10150708` | 2013-03-09 | BIP34 height: difficulty in height field | unknown | header/coinbase |
| [225,015](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=224999&tree_to=225031&tree_height=225015&selected=000000000000015437122b60d0a1d2ed7e1f98b5b292e886d6ca62042bba2035) | `…62042bba2035` | 2013-03-09 | BIP34 height: difficulty in height field | unknown | header/coinbase |
| [225,134](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=225118&tree_to=225150&tree_height=225134&selected=00000000000003abc9b545f105aec0a14cab2b65665f967b2527b61bb25e21bd) | `…b61bb25e21bd` | 2013-03-10 | BIP34 height: difficulty in height field | unknown | header/coinbase |
| [225,145](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=225129&tree_to=225161&tree_height=225145&selected=00000000000001a3aa38003bb99c2bb16dc48dfcf5542ddf86139e639ff51433) | `…9e639ff51433` | 2013-03-10 | BIP34 height: difficulty in height field | unknown | header/coinbase |
| [225,221](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=225205&tree_to=225237&tree_height=225221&selected=0000000000000386f943ff46dbf220fed2ef2ce55214d6fce868db21507ddc99) | `…db21507ddc99` | 2013-03-10 | BIP34 height: difficulty in height field | unknown | header/coinbase |
| [225,430](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=225414&tree_to=225446&tree_height=225430&selected=00000000000001468e0b21b62cd0b41ec317eeeaa5afc0a8df43c01180e57f7f) | `…c01180e57f7f` | 2013-03-11 | BIP34 height: difficulty in height field | unknown | header/coinbase |
| [225,430](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=225414&tree_to=225446&tree_height=225430&selected=000000000000017c4a0a7be4244a3b2c0dd41f884586ad8de78356a0994e8960) | `…56a0994e8960` | 2013-03-11 | BIP34 height: difficulty in height field | unknown | header/coinbase |
| [225,464](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=225448&tree_to=225480&tree_height=225464&selected=0000000000000085a485d05c96051ff43ea70b8868d7373df9de771ca65b52c9) | `…771ca65b52c9` | 2013-03-12 | BIP34 height: difficulty in height field | unknown | header/coinbase |
| [226,230](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=226214&tree_to=226246&tree_height=226230&selected=000000000000004cf2026785b16399bea2abab0f8b8a82d070ac0db40a06b3cb) | `…0db40a06b3cb` | 2013-03-16 | BIP34 height: difficulty in height field | unknown | header/coinbase |
| [226,845](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=226829&tree_to=226861&tree_height=226845&selected=00000000000000c37c3327de7555db3e3dbe91cbe0294e532f8a32574d5b997d) | `…32574d5b997d` | 2013-03-20 | BIP34 height: difficulty in height field | mmpool (reported) | header/coinbase |
| [226,895](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=226879&tree_to=226911&tree_height=226895&selected=000000000000030a6d0a4a0c91af3610843d170594eac75cc8a0e16390ba9559) | `…e16390ba9559` | 2013-03-20 | BIP34 height: difficulty in height field | mmpool (reported) | header/coinbase |
| [226,912](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=226896&tree_to=226928&tree_height=226912&selected=00000000000000a34d399a3cb82e222fad8e73e465b905e333ada1662c61e0e0) | `…a1662c61e0e0` | 2013-03-20 | BIP34 height: difficulty in height field | mmpool (reported) | header/coinbase |
| [229,388](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=229372&tree_to=229404&tree_height=229388&selected=00000000000000329b2b44eca61829f13c94bbafb35022f13e49ffff279e3f03) | `…ffff279e3f03` | 2013-04-03 | BIP34 height: wrong height | BTC Guild | header/coinbase |
| [229,388](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=229372&tree_to=229404&tree_height=229388&selected=000000000000008af04b94d8286fe0e8d0aea3b2f35e758ef1e73e153169fa58) | `…3e153169fa58` | 2013-04-03 | BIP34 height: wrong height | BTC Guild | header/coinbase |
| [229,388](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=229372&tree_to=229404&tree_height=229388&selected=00000000000001365d20401c25e9c8c1bc1570f99a943bc1575b20e16d77a18c) | `…20e16d77a18c` | 2013-04-03 | BIP34 height: wrong height | BTC Guild | header/coinbase |
| [229,388](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=229372&tree_to=229404&tree_height=229388&selected=00000000000001fb5262fee5a4b0e93f1274226980cc0893dcaa9dd9e1187f95) | `…9dd9e1187f95` | 2013-04-03 | BIP34 height: wrong height | BTC Guild | header/coinbase |
| [229,388](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=229372&tree_to=229404&tree_height=229388&selected=0000000000000239bfc9b6f400b5b02ab401077bdc470d082e3da34276925cc8) | `…a34276925cc8` | 2013-04-03 | BIP34 height: wrong height | BTC Guild | header/coinbase |
| [229,388](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=229372&tree_to=229404&tree_height=229388&selected=000000000000024fc7ce00ec89295323699886784960f68a04f4a4871b61caa8) | `…a4871b61caa8` | 2013-04-03 | BIP34 height: wrong height | BTC Guild | header/coinbase |
| [277,975](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=277959&tree_to=277991&tree_height=277975&selected=0000000000000000de6f0b2978aa2b268cb9a54c5de6d21f97d17c6b0ff0ac3f) | `…7c6b0ff0ac3f` | 2013-12-31 | Coinbase scriptSig above 100 bytes | GHash.IO | header/coinbase |
| [331,673](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=331657&tree_to=331689&tree_height=331673&selected=000000000000000010bcbb75dc17fce43da835bd26ccec95ed0d39570a51112a) | `…39570a51112a` | 2014-11-26 | BIP34 height: wrong height | yongchao34 | header/coinbase |
| [331,674](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=331658&tree_to=331690&tree_height=331674&selected=00000000000000000d610e393ffeed6b9494d54121f05f7a3905f940f0e0cf69) | `…f940f0e0cf69` | 2014-11-26 | BIP34 height: wrong height | lengguangxian | header/coinbase |
| [331,735](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=331719&tree_to=331751&tree_height=331735&selected=000000000000000010d43fb3f8d02cab156f333f2bfc172de9e6d87359118a1a) | `…d87359118a1a` | 2014-11-26 | BIP34 height: wrong height | AntPool | header/coinbase |
| 363,726 | `…8fc7efbcd5d0` | 2015-07-04 | Version below BIP66 minimum | unknown | header/coinbase |
| 363,731 | `…26d90c439d99` | 2015-07-04 | Version below BIP66 minimum | BTC Nuggets (address) | header/coinbase |
| 363,847 | `…909a4c549de5` | 2015-07-04 | Version below BIP66 minimum | unknown | header/coinbase |
| [363,967](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=363951&tree_to=363983&tree_height=363967&selected=00000000000000000954ed93eda1e79e8261137548fa9ccf4d516bb384a3660b) | `…6bb384a3660b` | 2015-07-05 | Version below BIP66 minimum | Bitsolo (address) | header/coinbase |
| [364,341](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=364325&tree_to=364357&tree_height=364341&selected=000000000000000012aac0664cd8b6cbc3ea485921a05f2c4340f928b0226d3c) | `…f928b0226d3c` | 2015-07-08 | Version below BIP66 minimum | unknown | header/coinbase |
| [367,047](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=367031&tree_to=367063&tree_height=367047&selected=00000000000000000f93ba8faf8bb018c7db642e30391748860cbfa5803a32a4) | `…bfa5803a32a4` | 2015-07-26 | Version below BIP66 minimum | mmpool | header/coinbase |
| [380,992](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=380976&tree_to=381008&tree_height=380992&selected=0000000000000000084ee972bfe620224e6893448a9001d2b1f236ede0423779) | `…36ede0423779` | 2015-10-28 | Timestamp below parent MTP | yndl | header/coinbase |
| [383,540](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=383524&tree_to=383556&tree_height=383540&selected=000000000000000009c55c7e380b7600a2966de1b79230c74212d9c45a91a50b) | `…d9c45a91a50b` | 2015-11-14 | BIP34 height: wrong height | Eligius | header/coinbase |
| [389,043](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=389027&tree_to=389059&tree_height=389043&selected=00000000000000000306ea979ad487157d2950081413eb9d2dca82060f1b89b2) | `…82060f1b89b2` | 2015-12-18 | Version below BIP65 minimum | nodeStratum | header/coinbase |
| [402,610](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=402594&tree_to=402626&tree_height=402610&selected=000000000000000003a1ce220ae97419cc4bdb5d70b90189b8f8a06b0b37e3a2) | `…a06b0b37e3a2` | 2016-03-14 | BIP34 height: wrong height | c63346109 | header/coinbase |
| [422,059](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=422043&tree_to=422075&tree_height=422059&selected=00000000000000000254ed1e8143f0bcd3c3564db07e7c35631e999d53e81fa7) | `…999d53e81fa7` | 2016-07-24 | BIP34 height: wrong height | ViaBTC | header/coinbase |
| [474,294](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=474278&tree_to=474310&tree_height=474294&selected=00000000000000000182acdf5657c93a0769dc6f9004047496b2e15efc6a4232) | `…e15efc6a4232` | 2017-07-05 | Omitted unconfirmed parent | 1Hash (reported) | body |
| [477,115](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=477099&tree_to=477131&tree_height=477115&selected=0000000000000000013ee4a86822d37a061732e04ee5f41fb77168f193363d1b) | `…68f193363d1b` | 2017-07-23 | Transaction ordering | 1Hash (reported) | body |
| 507,514 | `…d488d14055d0` | 2018-02-04 | Inputs already spent in parent block | AntPool | body |
| 509,557 | `…bd17c88da431` | 2018-02-17 | Inputs already spent in parent block | AntPool | body |
| 515,319 | `…23a2775bc613` | 2018-03-27 | Inputs already spent in parent block | AntPool | body |
| 534,339 | `…fc1ef933a0ba` | 2018-07-30 | Inputs already spent in parent block | AntPool | body |
| [543,804](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=543788&tree_to=543820&tree_height=543804&selected=0000000000000000000c958fe3563e7e3ecda8e35e6d6ecce4d5693cec1f1918) | `…693cec1f1918` | 2018-09-30 | Version below BIP65 minimum | BTC.COM | header/coinbase |
| [544,024](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=544008&tree_to=544040&tree_height=544024&selected=0000000000000000001ac59b46b44a9e525bc03a5cd2e138a8ae684445fa6ed8) | `…684445fa6ed8` | 2018-10-02 | Version below BIP65 minimum | BTC.COM | header/coinbase |
| [544,024](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=544008&tree_to=544040&tree_height=544024&selected=0000000000000000001ffb5988298bfc9f528f9a47e6062ebe8a01177af25d21) | `…01177af25d21` | 2018-10-02 | Version below BIP65 minimum | BTC.COM | header/coinbase |
| [544,600](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=544584&tree_to=544616&tree_height=544600&selected=000000000000000000188a6aecb603cb6a068ad236f925255a491124b5c5dc8a) | `…1124b5c5dc8a` | 2018-10-06 | Version below BIP65 minimum | BTC.COM | header/coinbase |
| [584,802](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=584786&tree_to=584818&tree_height=584802&selected=0000000000000000000b47042b90c6a893e6e5cdef70c92beefb88f4c5fa5a69) | `…88f4c5fa5a69` | 2019-07-10 | Coinbase overpayment | AntPool | body |
| [649,674](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=649658&tree_to=649690&tree_height=649674&selected=00000000000000000008c80c1f8c101f8aa1fabd59d63ab1350bd1d5dba425e6) | `…d1d5dba425e6` | 2020-09-23 | BIP34 height: missing script push | unknown | header/coinbase |
| [717,696](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=717680&tree_to=717712&tree_height=717696&selected=0000000000000000000045c5040bf46b4cd6c6f8f4004c149cd602e4e356e71c) | `…02e4e356e71c` | 2022-01-08 | Retarget not applied | ViaBTC | header/coinbase |
| [783,426](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=783410&tree_to=783442&tree_height=783426&selected=00000000000000000002ec935e245f8ae70fc68cc828f05bf4cfa002668599e4) | `…a002668599e4` | 2023-04-01 | Excessive sigops | F2Pool | body |
| [784,121](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=784105&tree_to=784137&tree_height=784121&selected=000000000000000000046a2698233ed93bb5e74ba7d2146a68ddb0c2504c980d) | `…b0c2504c980d` | 2023-04-06 | Excessive sigops | F2Pool | body |
| [789,038](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=789022&tree_to=789054&tree_height=789038&selected=0000000000000000000291349d44e756df07ce08d848df0ca0bbd9884af393ed) | `…d9884af393ed` | 2023-05-10 | BIP34 height: wrong height | AntPool | header/coinbase |
| 809,478 | `…e261e4f11853` | 2023-09-26 | Transaction ordering | MARA Pool | body |
| [946,213](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=946197&tree_to=946229&tree_height=946213&selected=00000000000000000000c3d95a4bdc068dfe0c6d1e7ad13045c6f570e58d9ed7) | `…f570e58d9ed7` | 2026-04-15 | Timestamp below parent MTP | F2Pool | header/coinbase |
| [957,780](https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from=957764&tree_to=957796&tree_height=957780&selected=0000000000000000000198e12592edbe83c84a78f75b3f8d67a3fe2075ef2ffb) | `…fe2075ef2ffb` | 2026-06-29 | Timestamp below parent MTP | F2Pool | header/coinbase |

All 143 established failures.
Dates are header dates, including the stale timestamps in the two 2026 F2Pool headers; the timeline separately marks their observation dates.
Linked heights open the header in the [merge-mining monitor](https://mmm.deadmanoz.xyz/), which holds every case with a merge-mining observation. {#tab:catalogue}
<!-- catalogue-table:end -->
:::

:::collapse{All 10 reported cases still lacking proof}{#reported-table}
A recovered header establishes identity and allows header checks, but not the body-dependent failure claimed by a report.
The linked ledger records source associations and missing evidence for each row.

<!-- reported-table:start -->
| Height | Hash suffix | Reported family | Header recovered | Missing evidence |
|---:|---|---|---|---|
| 197,701 | `…3c435ebc03f2` | Coinbase overpayment | no | header and body or sufficient authenticated components |
| 197,705 | `…34b4f8cd2dda` | Coinbase overpayment | no | header and body or sufficient authenticated components |
| 197,883 | `…145f12c2304d` | Coinbase overpayment | yes | other transaction and fee evidence |
| 212,048 | `…aea347c271b3` | Unspecified failure | no | header, rejection reason and authenticated evidence of a consensus failure |
| 363,997 | `…67e042a19b12` | Block version | no | 80-byte header |
| 364,261 | `…1665c74cfab2` | Block version | no | 80-byte header |
| 367,195 | `…dff8216cefc4` | Block version | no | 80-byte header |
| 386,682 | `…39a73b501cb6` | Block version | no | 80-byte header |
| 387,396 | `…d6c15d1d3ee3` | Block version | no | 80-byte header |
| 450,529 | `…f38d159565f5` | Oversized block | yes | body bytes establishing size violation |

All 10 reported cases whose claimed invalidity remains unproved.
Full identities and source associations are in the downloadable ledger. {#tab:uncatalogued}
<!-- reported-table:end -->
:::

## References

**Datasets, research and related posts**

- [bitcoin-data/invalid-blocks: the catalogue, its proofs and bodies, verification code and evidence notes](https://github.com/bitcoin-data/invalid-blocks)
- [bitcoin-data/stale-blocks: historical stale-block collection](https://github.com/bitcoin-data/stale-blocks)
- [bitcoin-data/mining-pools: coinbase tags and payout addresses](https://github.com/bitcoin-data/mining-pools)
- [Stifter, Schindler, Judmayer, Zamyatin, Kern & Weippl. Echoes of the Past: Recovering Blockchain Metrics From Merged Mining (FC 2019)](https://eprint.iacr.org/2018/1134.pdf)
- [NStifter/mergedmonitor: research archives](https://github.com/NStifter/mergedmonitor)
- [BTC Relay: July 2015 fork-header fixtures](https://github.com/ethereum/btcrelay/tree/master/test/headers/fork/20150704)
- [Eloipool: historical transaction-trimming code](https://github.com/luke-jr/eloipool/blob/01cdd426298feb8a3f55cec718155e027d096fcc/merklemaker.py)
- [Hathor: coinbase-height encoding fix](https://github.com/HathorNetwork/hathor-core/commit/1e2b658bb384534434fd27244fb41fe252d546fd)
- [Hathor: coinbase payout-script fix](https://github.com/HathorNetwork/hathor-core/commit/d9111f911485376cd70196e145b8854f479ad2f0)
- [Merge-mining research](https://github.com/deadmanoz/merge-mining-research)
- [Live merge-mining monitor](https://mmm.deadmanoz.xyz/)
- [Merge mining and AuxPoW: how it works](./merge-mining)

**Incident reports and historical records**

- [Value overflow incident (Bitcoin Wiki)](https://en.bitcoin.it/wiki/Value_overflow_incident)
- [P2SH-invalid transaction discussion (bitcoin-dev IRC, 4 April 2012)](https://buildingbitcoin.org/bitcoin-dev/log-2012-04-04.html)
- [P2SH transaction inclusion list (Blockchain.info, 15 June 2012 archive)](https://web.archive.org/web/20120615080519id_/http://blockchain.info:80/tx-index/3618498/4005d6bea3a93fb72f006d23e2685b85069d270cb57d15f0c057ef2d5e3f78d2)
- [P2SH case at height 189,498 (bitcoin-dev IRC, 17 July 2012)](https://buildingbitcoin.org/bitcoin-dev/log-2012-07-17.html)
- [Eligius coinbase-overpayment reports (bitcoin-dev IRC, 9 September 2012)](https://buildingbitcoin.org/bitcoin-dev/log-2012-09-09.html)
- [Eligius block list (18 September 2012 archive)](https://web.archive.org/web/20120918194744id_/http://eligius.st:80/~wizkid057/newstats/blocks.php)
- [P2SH-invalid transaction after a reorganisation (bitcoin-dev IRC, 28 November 2012)](https://buildingbitcoin.org/bitcoin-dev/log-2012-11-28.html)
- [Chris Double: coinbase-height mismatch discussion (bitcoin-dev IRC, 20 March 2013)](https://buildingbitcoin.org/bitcoin-dev/log-2013-03-20.html)
- [Chris Double: three lost blocks (BitcoinTalk, 20 March 2013)](https://bitcointalk.org/index.php?topic=154521.msg1646902#msg1646902)
- [Chris Double: Bitparking pool thread, merge mining disabled after three invalidated blocks (BitcoinTalk, 20 March 2013)](https://bitcointalk.org/index.php?topic=57148.msg1646921#msg1646921)
- [July 2015 chain forks (Bitcoin Wiki)](https://en.bitcoin.it/wiki/July_2015_chain_forks)
- [Some Miners Generating Invalid Blocks (Bitcoin.org, 4 July 2015)](https://bitcoin.org/en/alert/2015-07-04-spv-mining)
- [bfd: Reported version-2 block hashes (bitcoin-dev, 16 March 2017)](https://gnusha.org/pi/bitcoindev/48d3940ab1a2bd53c6e056ce7fbcd361@cock.lu/)
- [Bitcoin Unlimited oversized-block incident statement (29 January 2017)](https://bitco.in/forum/threads/buir-2017-01-29-statement-regarding-excessive-block-by-bitcoin-unlimited-software-29-jan-2017.1790/)
- [piotr_n: 1hash pool just mined an invalid block again (BitcoinTalk, July 2017)](https://bitcointalk.org/index.php?topic=2041607.0)
- [AntPool's coinbase overpayment at 584,802 (The Next Web, July 2019)](https://thenextweb.com/news/bitmain-bitcoin-invalid-block-150000-mining-reward-lost)
- [b10c: Invalid MARAPool block 809478](https://b10c.me/observations/07-invalid-block-809478/)
- [b10c: Invalid F2Pool blocks 783426 and 784121](https://b10c.me/observations/11-invalid-blocks-783426-and-784121/)
- [b10c: ViaBTC's mutated blocks without witness data](https://b10c.me/observations/10-viabtc-blocks-without-witness-data/)
- [b10c: Invalid mining jobs by AntPool & friends during forks](https://b10c.me/observations/14-antpool-and-friends-invalid-mining-jobs/)

**Specifications**

- [BIP 16: Pay to Script Hash](https://bips.dev/16/)
- [BIP 34: Block v2, Height in Coinbase](https://bips.dev/34/)
- [BIP 50: March 2013 Chain Fork Post-Mortem](https://bips.dev/50/)
- [BIP 65: OP_CHECKLOCKTIMEVERIFY](https://bips.dev/65/)
- [BIP 66: Strict DER signatures](https://bips.dev/66/)
- [BIP 141: Segregated Witness (Consensus layer)](https://bips.dev/141/)
- [BIP 152: Compact Block Relay](https://bips.dev/152/)
- [BIP 310: Stratum protocol extensions](https://bips.dev/310/)
- [BIP 320: nVersion bits for general purpose use](https://bips.dev/320/)
- [BIP 341: Taproot: SegWit version 1 spending rules](https://bips.dev/341/)
