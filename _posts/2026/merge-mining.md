---
title: 'Merge mining and AuxPoW: how it works'
excerpt: 'A walkthrough of the AuxPoW mechanism: how auxiliary chains like Namecoin reuse Bitcoin''s proof-of-work as their own'
coverImage: '/assets/blog/2026/merge-mining/merge-mining-cover.png'
date: '2026-05-13T00:00:00.000Z'
tags:
  - bitcoin
  - merge-mining
  - auxpow
  - explainer
author:
  name: deadmanoz
ogImage:
  url: '/assets/blog/2026/merge-mining/merge-mining-cover.png'
status: published
---

## Introduction

Merge mining is a technique that lets a chain other than Bitcoin reuse Bitcoin's _proof-of-work_ as its own.
It lets Bitcoin miners use the same hashing effort to mine one or more _auxiliary chains_ (Namecoin being the original and most well-known example), with no reduction in Bitcoin hashrate and only the additional requirement that miners or pools run auxiliary-chain software (e.g., a Namecoin node).
The arrangement is one-sided: an auxiliary chain's nodes carry the code to recognise and validate the shared work, while Bitcoin itself is unchanged and unaware any of it is happening.

Beginning with a brief history of where the idea came from, this post walks through how Bitcoin and auxiliary-chain blocks are linked.
It covers the merkle structure that lets multiple auxiliary chains piggyback on individual Bitcoin blocks, the _Auxiliary Proof-of-Work (AuxPoW)_ record carried by each auxiliary block, and the cryptographic checks an auxiliary node performs to validate a merge-mined auxiliary block.
A [companion post](./merge-mining-chains-and-pools) catalogues the chains that have adopted AuxPoW with Bitcoin as their parent and examines which mining pools embed merge-mining commitments in their coinbases.
Not every Bitcoin-merge-mined chain, however, uses AuxPoW; some commit through a different mechanism that lives in a coinbase output rather than the coinbase `scriptSig` (_`OP_RETURN` tag-based merge mining_).
We touch on that alternative approach in [a later section](#op_return-tag-based-merge-mining), though the bulk of this post focuses on AuxPoW merge mining.

This piece is a bit of a detour from my planned treatment of Bitcoin network monitoring topics, such as a continued examination of the [peer observer ecosystem](https://github.com/peer-observer) and a grounding in the network's important properties, but there is good reason for it.
Each AuxPoW chain that has merge-mined with Bitcoin holds, in its own permanent record, a copy of the Bitcoin block header whose proof-of-work was reused for each of its merge-mined blocks, including headers that Bitcoin's own [[canonical chain||The single true Bitcoin blockchain, as recognised by all Bitcoin nodes]] discarded.
More specifically, those AuxPoW chains are a side-channel into block propagation (one of those important network properties) and the stale blocks those propagation delays help create.
A follow-up post uses that side-channel to put numbers on a long-standing theoretical claim: that smaller mining pools produce more stale blocks, relative to their hashrate, than larger ones.
This post is the groundwork.

## A brief history

Merge mining is a Satoshi-era idea, first sketched on BitcoinTalk in late 2010 and realised a year later as part of Namecoin.
In mid-November 2010, a BitcoinTalk thread titled ["BitDNS and Generalizing Bitcoin"](https://bitcointalk.org/index.php?topic=1790.0) opened a discussion about whether Bitcoin's chain should host a DNS-like service for human-readable identifiers.
The first half of that title was the specific proposal; the second half, the broader question the thread quickly turned to: what else could a proof-of-work chain be used for, and where should those services live, on Bitcoin's chain or separately?

Satoshi weighed in [on 9 December 2010](https://bitcointalk.org/index.php?topic=1790.msg28696#msg28696), arguing that BitDNS should be a completely separate network with its own block chain, but that the two could share their proof-of-work:

> I think it would be possible for BitDNS to be a completely separate network and separate block chain, yet share CPU power with Bitcoin.
> The only overlap is to make it so miners can search for proof-of-work for both networks simultaneously.
>
> The networks wouldn't need any coordination.
> Miners would subscribe to both networks in parallel.
> They would scan SHA such that if they get a hit, they potentially solve both at once.
> A solution may be for just one of the networks if one network has a lower difficulty.
>
> [...]
>
> Instead of fragmentation, networks share and augment each other's total CPU power.
> This would solve the problem that if there are multiple networks, they are a danger to each other if the available CPU power gangs up on one.
> Instead, all networks in the world would share combined CPU power, increasing the total strength.
> It would make it easier for small networks to get started by tapping into a ready base of miners.

This idea was the nexus for what became merge mining.

[Namecoin](https://www.namecoin.org/) launched in April 2011 as the first chain to come out of the BitDNS thread.
Its early months were a case study in the problem Satoshi's reply had warned about: the chain ran with its own independent SHA-256d hashrate, small enough to be vulnerable on its own.
About six months later, in October 2011, the [merge-mining hard fork](https://web.archive.org/web/20211220001040/https://forum.namecoin.org/viewtopic.php?t=217) activated at Namecoin block 19,200.
[[In practice every Namecoin block||Strictly, Namecoin consensus still accepts standalone-mined blocks (no AuxPoW record, the auxiliary header's own hash satisfies `aux_target`) alongside AuxPoW ones. A flag bit in the auxiliary block header's `version` field selects between the two rules. No one has competitively self-mined Namecoin since the fork, so the AuxPoW path is what every post-fork block has actually used.]] from that height onwards has carried an AuxPoW record committing it to a Bitcoin parent block.
The [specification that emerged from that work](https://en.bitcoin.it/wiki/Merged_mining_specification), written primarily by Namecoin's early contributors, became the baseline for Bitcoin-parent AuxPoW chains.

## Two chains, one hash

Under that specification, [[two chains||Or more, as we shall discover]] advance in parallel from the same Bitcoin hashing effort, each with its own independent difficulty target.
Bitcoin's [[`parent_target`||The 256-bit difficulty target encoded in compact form in each Bitcoin block header's `nBits` field, retargeted every 2,016 blocks.]] is the threshold a candidate Bitcoin block header's hash must clear for the block to qualify as a [[valid Bitcoin block||Strictly, `parent_target` is just the proof-of-work hurdle. The block must also satisfy Bitcoin's other consensus rules (well-formed coinbase, matching merkle root, valid transaction signatures, and so on) to be accepted.]].
The auxiliary chain's [[`aux_target`||The 256-bit difficulty target the auxiliary chain expects of every AuxPoW block it accepts, encoded in the auxiliary block header and retargeted on the auxiliary chain's own schedule.]] is set independently of `parent_target` and almost always numerically much larger (i.e., easier to satisfy), so the chain produces blocks at its own intended rate.

![Layout of the 80-byte Bitcoin block header: 4 bytes `version`, 32 bytes `prev_block_hash`, 32 bytes `merkle_root`, 4 bytes `timestamp`, 4 bytes `nBits` (the compact-encoded `parent_target`), and 4 bytes `nonce`. Both Bitcoin and the auxiliary chain check the SHA-256d of these 80 bytes against their respective targets.](/assets/blog/2026/merge-mining/bitcoin-header-bytes.png){#fig:bitcoin-header-bytes}

Each candidate Bitcoin block has its 80-byte header ({@fig:bitcoin-header-bytes}) put through a single [[SHA-256d||Double SHA-256: apply SHA-256 to the input, then apply SHA-256 again to that 32-byte intermediate output, yielding the final 32-byte digest]] evaluation, and the resulting 32-byte digest is compared independently against both targets ({@fig:dual-target-check}).
For a merge-mining miner, three outcomes are possible.
1. If the hash exceeds `aux_target` (and therefore the lower `parent_target` too), the candidate is discarded and neither chain extends.
2. If the hash falls to or below `aux_target` but still above `parent_target`, the candidate is a valid auxiliary block, but Bitcoin rejects it.
3. If the hash is at or below `parent_target`, both bars are cleared at once: the candidate is a valid Bitcoin block (assuming the rest of consensus passes) and a valid auxiliary block.

![Three scenarios for a single SHA-256d hash output compared against both targets. Left panel: hash exceeds `aux_target`, valid for neither chain. Middle panel: hash falls between `parent_target` and `aux_target`, valid for the auxiliary chain only. Right panel: hash is at or below `parent_target`, valid for both Bitcoin and the auxiliary chain. Example hex values illustrate the inequality chain through their leading-zero counts.](/assets/blog/2026/merge-mining/merge-mining-dual-target-check.png){#fig:dual-target-check}

The third outcome splits further on Bitcoin's side: those candidates either become canonical Bitcoin blocks or stales that lost a chain race.
Because every accepted auxiliary block stores its parent header in an AuxPoW record (detailed in the next section), there are three categories of parent headers stored in the auxiliary chain ({@fig:merge-mining-flow}):

1. Canonical Bitcoin blocks (won their chain race; e.g., Block `B`)
2. Bitcoin stales (met `parent_target` but lost their chain race; e.g., the stale that lost to Block `B+1`)
3. Aux-only parent headers (hash met only `aux_target`; e.g., the parent header for NMC block `N+2`)

![Schematic flow of merge-mining attempts, adapted from [Zamyatin's 2017 thesis, Merged Mining: Analysis of Effects and Implications](https://repositum.tuwien.at/bitstream/20.500.12708/5239/2/Zamyatin%20Alexei%20-%202017%20-%20Merged%20mining%20analysis%20of%20effects%20and%20implications.pdf). Candidate parent headers either fail both targets, clear only `aux_target`, or clear `parent_target`. Of those that clear `parent_target`, one becomes a canonical Bitcoin block (Block `B`) while another loses the chain race to Block `B+1` and becomes a stale. All three retained outcomes (canonical, stale, aux-only) appear in AuxPoW records on the auxiliary chain.](/assets/blog/2026/merge-mining/merge-mining-flow.png){#fig:merge-mining-flow}

The stales are what make AuxPoW chains a side-channel into Bitcoin's PoW history.
This is the premise of Stifter _et al._'s 2018 paper [Echoes of the Past: Recovering Blockchain Metrics From Merged Mining](https://eprint.iacr.org/2018/1134.pdf), which used the AuxPoW records on merge-mined chains to reconstruct Bitcoin's historical stale block and fork rates, surfacing a non-negligible portion of stale blocks absent from the live monitoring record (this work will be revisited in detail in a future post).

## The coinbase commitment

On the Bitcoin (parent) side, the AuxPoW marker is a 44-byte blob inside the [[coinbase's `scriptSig`||Bitcoin consensus [caps it at 100 bytes total.](https://github.com/bitcoin/bitcoin/blob/master/src/consensus/tx_check.cpp#L49-L50)]] (coinbases without merge-mining simply don't carry it).
Thus Bitcoin [[commits to AuxPoW data (if present)||Any change to the marker bytes would invalidate the parent's proof-of-work, even though no Bitcoin consensus rule reads the marker.]] indirectly through the block header's `merkle_root`; see the [Reminder: from block header to coinbase scriptSig](#scriptsig-path) section below for the full details.

:::collapse{Reminder: from block header to coinbase scriptSig}{#scriptsig-path}
The block header is the 80-byte object whose hash is tested against `parent_target` and, when merge-mining, against `aux_target` too.
One of its six fields is `merkle_root`: the root of the merkle tree built from every transaction txid in the block body.
The coinbase transaction's txid is leaf 0 in that tree, and the coinbase transaction's first input contains the `scriptSig` field ({@fig:commitment-path}).
This is a "free-form" metadata area that miners use to record:
- The block height, as required by [BIP 34](https://github.com/bitcoin/bips/blob/master/bip-0034.mediawiki),
- An [[extranonce||The block header's 4-byte `nonce` field gives only ~4 billion attempts, exhaustible in milliseconds by modern ASICs. The extranonce is additional miner-controlled bytes in the coinbase `scriptSig`; incrementing it changes the coinbase txid, the merkle root, and the header hash, extending the search space. As such, it is effectively required]] that the mining hardware iterates on,
- The AuxPoW marker (optional; only when merge-mining), and
- The pool-identifying tags and any additional miner data (optional).

For more on the extranonce mechanism, see [learnmeabitcoin.com's excellent interactive nonce explainer](https://learnmeabitcoin.com/technical/block/nonce/).

![Commitment path from the coinbase input `scriptSig` into the Bitcoin block header. The `scriptSig` sits inside input 0 of the serialised coinbase transaction, the coinbase transaction is the first transaction in the block body, the coinbase txid and all following transaction txids are merkle leaves, and the resulting merkle root is stored in the 80-byte block header.](/assets/blog/2026/merge-mining/coinbase-scriptsig-path.png){#fig:commitment-path}

:::

The AuxPoW marker within the coinbase `scriptSig` has four fields as illustrated in {@fig:auxpow-marker}.
The first 4 bytes are the [[`0xFA BE 6D 6D` magic||Sometimes written as `0xFA BE m m` since `0x6D` is ASCII `m`. The spec also allows omitting the magic, in which case the `aux_merkle_root` must sit in the first 20 bytes of the `scriptSig`; this legacy form is rarely seen in practice.]], a fixed identifier that lets auxiliary-chain nodes easily locate the marker without ambiguity.
The next 32 bytes are the `aux_merkle_root`, the commitment that links this Bitcoin block to one or more auxiliary blocks.
The final 8 bytes are two little-endian `uint32` values: [[`merkle_size`||The number of slots in the aux merkle tree; must be a power of two.]] and [[`merkle_nonce`||A value intended to help miners place each auxiliary chain in the aux merkle tree. The field is broken for collision avoidance: if two chains clash for one nonce, they clash for all nonces at the same tree size.]].
Auxiliary-chain nodes use those two values to locate each chain's commitment within the merkle tree.
What that tree looks like on the auxiliary-chain side is the subject of [the next section](#the-merkle-slot-tree).

![Layout of the 44-byte AuxPoW marker in the parent coinbase's `scriptSig`. Four fields: a 4-byte magic constant `0xFA BE 6D 6D`, a 32-byte aux merkle root committing to one or more auxiliary block hashes, a 4-byte `merkle_size` declaring how many slots the merkle tree contains, and a 4-byte `merkle_nonce` used in the slot-mapping calculation. The marker sits alongside other coinbase scriptSig data such as the BIP 34 block height, the extranonce, and any pool-identifying tags.](/assets/blog/2026/merge-mining/auxpow-marker.png){#fig:auxpow-marker}

From Bitcoin's side, none of these 44 bytes are consensus-relevant.
Bitcoin's nodes never read the marker and have no way of knowing the block is also a valid merge-mined block somewhere else.
That is the whole reason merge mining is one-sided: an auxiliary chain can leverage Bitcoin without Bitcoin ever knowing about it.

## The merkle slot tree

The _merkle slot tree_ is the structure that lets multiple auxiliary chains piggyback on the same parent Bitcoin block at once.
Each participating chain occupies one position in a fixed-size merkle tree, and the single root of that tree is committed in the parent coinbase's AuxPoW marker as the 32-byte `aux_merkle_root` introduced in the previous section.
A "slot" is one such leaf position, indexed from 0 to `merkle_size - 1`, where `merkle_size` is a power of two also declared in the marker ({@fig:slot-tree}).

Each slot holds a 32-byte value: for an occupied slot, that value is the auxiliary block hash; for an unused slot, it is just [arbitrary 32-byte filler](https://en.bitcoin.it/wiki/Merged_mining_specification#Aux_work_merkle_tree), not another meaningful commitment.
The miner locks in the filler choice before computing the root, and the same filled-in tree backs every chain's commitment into this parent block.
The [Namecoin worked example](#worked-example) later in this post shows an actual filler value picked by AntPool.
The tree then hashes upwards, Bitcoin-style, using double SHA-256.
In the four-slot example of {@fig:slot-tree}, `h01 = SHA-256d(s0 || s1)`, `h23 = SHA-256d(s2 || s3)`, and `aux_merkle_root = SHA-256d(h01 || h23)`.
At each level, two 32-byte children are concatenated into a 64-byte input, and the hash output is again 32 bytes.

![The merkle slot tree, with a 4-slot example. The root, `aux_merkle_root`, is committed in the parent coinbase's AuxPoW marker (reproduced at top). Each slot is 32 bytes. Slot 1 holds Elastos's block hash (`chain_id` 1224); slot 2 holds Namecoin's (`chain_id` 1); the other slots are unused 32-byte filler. Each internal node, and finally the root, is SHA-256d over two 32-byte child values.](/assets/blog/2026/merge-mining/merge-mining-slot-tree.png){#fig:slot-tree}

Which slot a chain occupies is determined by its `chain_id` combined with the `merkle_nonce`.
The `chain_id` is fixed by the chain; there is no central `chain_id` registry, and apparently no real coordination on assignment either.
The closest thing is [BitcoinTalk thread 769073](https://bitcointalk.org/index.php?topic=769073.0), opened in 2014, three years after Namecoin's AuxPoW fork, as a catalogue of `chain_id`s (though it listed Namecoin's `chain_id` incorrectly until July 2015).
In practice this doesn't seem to have been a problem: the population of active AuxPoW chains is small, and a `chain_id` clash only bites when a single parent block commits to both colliding chains at once.

`merkle_nonce` was meant to be the miner's tuning knob for avoiding slot collisions when committing to multiple auxiliary chains at once, but [[the published formula only shifts colliding chains together||Changing the nonce changes the slot number, but not the equality relation between two colliding chain IDs at the same power-of-two tree size.]].
This failure is called out in the [Bitcoin Wiki Aux work merkle tree notes](https://en.bitcoin.it/wiki/Merged_mining_specification#Aux_work_merkle_tree) and in the [Nonce for merged mining chain merkle tree index](https://bitcointalk.org/index.php?topic=51069.0) BitcoinTalk thread.

The mapping process uses a deterministic [[linear congruential generator (LCG)||A simple deterministic random number generator. Both the miner and the auxiliary chain's verifier can run the same LCG to agree on each chain's slot without coordination.]] to decide placement (see the [Slot mapping details](#slot-mapping-details) section below).
It does not derive any auxiliary block hashes; the 32-byte values come from the auxiliary chains' block headers, and those hashes get committed into the slots.

:::collapse{Slot mapping details}{#slot-mapping-details}
The slot index is computed from `merkle_nonce` and `chain_id`, with all arithmetic on 32-bit unsigned integers (multiplications wrap modulo \(2^{32}\)).
Each `rand = rand * 1103515245 + 12345` line is one LCG step, using the multiplier (`1103515245`) and increment (`12345`) from [ANSI C's `rand()`](https://en.wikipedia.org/wiki/Linear_congruential_generator), but with 32-bit unsigned wraparound rather than ANSI C's mod 2^31.
The `chain_id` is mixed in between two iterations, and the final modulo reduces the 32-bit output to a slot index:

```
rand = merkle_nonce
rand = rand * 1103515245 + 12345
rand = rand + chain_id
rand = rand * 1103515245 + 12345
slot = rand mod merkle_size
```

The result is a slot index between 0 and `merkle_size - 1`.

However, if two chains' `chain_id`s collide for a given power-of-two `merkle_size`, changing `merkle_nonce` does not fix the collision; it only moves both chains together.
The miner must use a larger `merkle_size`, omit one chain, or rely on chain IDs that do not collide modulo the chosen tree size.
And because each chain's verifier independently runs the LCG to find its expected slot, a miner cannot silently put two chains at the same leaf: a verifier whose slot is occupied by another chain's commitment rejects the AuxPoW.
:::

The simplest case is `merkle_size = 1`, where a miner is committing to only one auxiliary chain.
The tree collapses to a single leaf: the chain's block hash sits at the root directly, and the `merkle_nonce` is irrelevant (the LCG always returns slot 0).

In practice, miners committing to multiple AuxPoW chains do so via a single shared slot tree: the same hashing effort can earn a block reward from every chain in the tree whose `aux_target` the resulting hash clears.
A pool mining Namecoin alongside Elastos and other AuxPoW chains picks a `merkle_size` to fit the chains it commits to, with each occupying the slot its `chain_id` resolves to.

Each participating chain ends up with a different proof through this one shared tree: its own slot, its own sibling hashes, its own bit-path up to the root.
The parent block, the coinbase marker, and the `aux_merkle_root` are common to all of them; the per-chain proof is what differs.
The [worked example](#worked-example) later in this post walks through such a tree in detail.

## The AuxPoW record

The [standard AuxPoW format](https://en.bitcoin.it/wiki/Merged_mining_specification#Aux_proof-of-work_block), originally specified by Namecoin and adopted byte-for-byte by most Bitcoin-parent AuxPoW chains, puts an AuxPoW record between the 80-byte auxiliary header and the block body's transaction list.
This AuxPoW record is a variable-sized structure with five fields, as shown in {@fig:auxpow-record}.

![Layout of the AuxPoW record carried by every auxiliary block. `coinbase_txn` and `parent_block_header` are copied parent-side data; `parent_block_hash` is a redundant derived hash. The other two fields (`coinbase_branch`, `blockchain_branch`) are merkle paths that let the auxiliary chain's verifier reconstruct the link to the parent's proof-of-work.](/assets/blog/2026/merge-mining/merge-mining-auxpow-record.png){#fig:auxpow-record}

Three fields are parent-side data carried into the auxiliary block.
`coinbase_txn` is the full serialised parent coinbase transaction; the verifier scans its `scriptSig` for the `0xFA BE 6D 6D` magic and reads the `aux_merkle_root` out of the bytes that follow.
[[`parent_block_hash`||This field is unnecessary for validation because the full parent header is already present in the same AuxPoW record; the [Bitcoin Wiki](https://en.bitcoin.it/wiki/Merged_mining_specification#Aux_proof-of-work_block) flags it as such.]] is a 32-byte convenience value that the verifier ignores.
Early Namecoin AuxPoW blocks even shipped it in inconsistent byte order (some in standard little-endian internal byte order, some reversed) without breaking validation.
`parent_block_header`, by contrast, is the field that actually drives validation: the verifier computes SHA-256d over its full 80 bytes and tests the result against `aux_target` to confirm the auxiliary block's proof-of-work.

The remaining two fields are compact merkle proofs, not copies of the full parent transaction tree or the full auxiliary slot tree.
They give the verifier just enough sibling hashes to fold a known starting hash up to the parent's transaction `merkle_root` (for `coinbase_branch`) and the `aux_merkle_root` (for `blockchain_branch`).

For `coinbase_branch`, the start hash is `txid(coinbase_txn)` and the expected root is the Bitcoin transaction `merkle_root` from `parent_block_header`.
This proves that the proof-of-work in `parent_block_header` was performed over a transaction merkle root consistent with a tree containing `coinbase_txn`. That coinbase carries the AuxPoW marker that commits to this auxiliary chain (and to any others sharing the same slot tree).

For `blockchain_branch`, the start hash is this auxiliary block's hash and the expected root is the `aux_merkle_root` found in the parent coinbase's AuxPoW marker.
This proves that the coinbase marker commits to this auxiliary block's hash (alongside any other chains' block hashes in the shared slot tree).

The two branch payloads carry the "middle part" of those two checks: the sibling hashes and the side masks needed to fold the start hash up to the expected root (see the [Merkle branch details](#merkle-branch-details) section below).
How these fields combine into a verification check is the subject of [the next section](#verification).

:::collapse{Merkle branch details}{#merkle-branch-details}
Both branches use the same three-input fold pattern:

- A _start hash_, fetched from surrounding AuxPoW data (it is never stored inside the branch payload).
- A _branch payload_: a CompactSize sibling count, the sibling hashes themselves, and a [[4-byte _side mask_||The 4 bytes cap each branch at 32 sibling hashes (one bit per tree level), so the proof can describe a tree of up to 2^32 leaves. Bitcoin's transaction tree and the AuxPoW slot tree both sit well within that ceiling in practice.]] whose role differs per branch.
- An _expected root_, also fetched from surrounding AuxPoW data.

The fold sets `current` to the start hash, then walks `branch_hash[]` one sibling at a time, reading the matching bit from the side mask starting at bit 0.
If the bit is 0, `current` sat on the left at that tree level and the step is `current = SHA-256d(current || sibling)`; if the bit is 1, `current` sat on the right and the step is `current = SHA-256d(sibling || current)`.
Read from bit 0 upward, the side mask is therefore the leaf-to-root path of the value being proved.
After the last sibling, `current` must equal the expected root.

The two branches differ in what each input refers to and in what the side mask encodes.

**`coinbase_branch`**

![`coinbase_branch` shown as a merkle proof through the parent Bitcoin transaction tree. The branch field carries the CompactSize length, the sibling hashes, and the 4-byte side mask; the coinbase txid and the expected parent header `merkle_root` come from surrounding AuxPoW data.](/assets/blog/2026/merge-mining/merge-mining-coinbase-branch.png){#fig:coinbase-branch}

- **Start hash**: `txid(coinbase_txn)`, the SHA-256d of the serialised parent coinbase transaction carried in this same AuxPoW record.
- **Expected root**: the Bitcoin transaction `merkle_root` from `parent_block_header`.
- **Side mask**: all four bytes are zero, because the coinbase is always at leaf 0 of the parent transaction tree, putting `current` on the left at every level.

A successful fold ends with `current` equal to the parent header's `merkle_root`.

**`blockchain_branch`**

![`blockchain_branch` shown as a merkle proof through the auxiliary merkle slot tree. The branch field carries the CompactSize length, the sibling hashes, and the 4-byte side mask (this chain's slot index); the auxiliary block hash and expected `aux_merkle_root` come from surrounding AuxPoW data.](/assets/blog/2026/merge-mining/merge-mining-blockchain-branch.png){#fig:blockchain-branch}

- **Start hash**: this auxiliary block's header hash.
- **Expected root**: the `aux_merkle_root` embedded in the parent coinbase's AuxPoW marker.
- **Side mask**: the four bytes hold _this chain's_ slot index in the slot tree, little-endian, so its binary digits are already the per-level left/right pattern the fold needs (bit 0 at the leaf level).
The mask is chain-specific: every other auxiliary chain merge-mined into the same parent Bitcoin block carries its own `blockchain_branch` (own start hash, own sibling hashes, own slot index), and they all fold up to the same shared `aux_merkle_root`.

The verifier also independently derives the expected slot index from `chain_id`, `merkle_nonce`, and `merkle_size`, and rejects the proof if it differs from the side-mask value.
When the slot tree has only one leaf (`merkle_size = 1`), the payload reduces to 5 bytes of zeros: [[`0x00 00 00 00 00`||One byte of CompactSize length (zero siblings) followed by a 4-byte side mask of all zeros. The Bitcoin Wiki [worked example](https://en.bitcoin.it/wiki/Merged_mining_specification#Example) shows this exact pattern.]].
The fold has no siblings to process, so the start hash is already the expected root.
A successful fold ends with `current` equal to the `aux_merkle_root` from the parent coinbase marker.
:::

## Verification

For an auxiliary chain's node, verification answers a single question: does this candidate AuxPoW block actually inherit the parent's proof-of-work?
The PoW link verification can be summarised as five checks, and the PoW link is valid only if all of them pass ({@fig:verification}).

![Five-step verification flowchart that an auxiliary chain node walks for each candidate AuxPoW block: (1) locate the AuxPoW marker in `coinbase_txn`'s `scriptSig` and extract `aux_merkle_root`, `merkle_size`, and `merkle_nonce`, (2) cross-check that the LCG-derived slot for this chain matches `blockchain_branch`'s side mask, (3) fold this aux block's hash up through `blockchain_branch` and confirm the reconstructed root matches the marker's `aux_merkle_root`, (4) fold the coinbase txid up through `coinbase_branch` and confirm the reconstructed root matches `parent_block_header.merkle_root`, (5) verify `SHA-256d(parent_block_header) ≤ aux_target`. All five must pass.](/assets/blog/2026/merge-mining/merge-mining-verification.png){#fig:verification}

The order below establishes identity first (steps 1 and 2) before walking the chain of commitments from the auxiliary block out to the parent's proof-of-work (steps 3 through 5).
Real implementations (e.g., Elastos's [`AuxPow.Check`](https://github.com/elastos/Elastos.ELA/blob/master/auxpow/auxpow.go), following the [Bitcoin Wiki specification](https://en.bitcoin.it/wiki/Merged_mining_specification)) sequence the same checks differently and also perform additional structural validation of the AuxPoW record.

1. **Locate the AuxPoW marker inside the parent coinbase**: [[scan||When the magic is present it must appear only once in the `scriptSig`, blocking an "equivocation attack" where a miner embeds different markers for different chains. The [legacy no-magic form](#the-coinbase-commitment) (aux merkle root in the first 20 bytes) is also permitted but rarely seen.]] `coinbase_txn`'s `scriptSig` for the `0xFA BE 6D 6D` magic, and read the embedded `aux_merkle_root`, `merkle_size`, and `merkle_nonce` from the bytes that follow.
2. **Cross-check the slot index**: independently derive the expected slot by running the [LCG](#slot-mapping-details) over `chain_id` and the marker's `merkle_nonce` and `merkle_size`, and confirm it matches the slot encoded in `blockchain_branch`'s side mask.
3. **Reconstruct `aux_merkle_root`**: starting from this auxiliary block's hash (SHA-256d of its 80-byte header), fold the hash up through `blockchain_branch` (using the side-mask bits validated in step 2 to position `current` left or right at each level), and confirm the resulting root matches the `aux_merkle_root` extracted from the marker in step 1.
4. **Reconstruct the parent block's transaction `merkle_root`**: compute the coinbase txid (SHA-256d of `coinbase_txn`) and fold it up through `coinbase_branch`, and confirm the resulting root matches the `merkle_root` field inside `parent_block_header`.
5. **Verify the proof-of-work**: compute SHA-256d of `parent_block_header` and check that the resulting hash is at or below `aux_target`.

Step 5's `aux_target` test, looser than Bitcoin's `parent_target`, is what admits aux-only parent headers (those clearing `aux_target` but not `parent_target`) into the auxiliary chain's record.
Combined with the canonical blocks and stales that clear both targets, the record collects all [three populations of parent headers](#two-chains-one-hash) the post identified earlier.

:::collapse{Worked example: Namecoin block 823,506}{#worked-example}
We walk through verification on a recent Namecoin block: [block 823,506](https://chainz.cryptoid.info/nmc/block.dws?3e78ac3489c58c087428a1536b1b93c656f846419dd78190d2fd05889c9f6d88.htm), mined by AntPool.
This is a typical modern AuxPoW block:
- `merkle_size = 16`: multiple AuxPoW chains committed via the slot tree,
- A 4-sibling `blockchain_branch`: one sibling per merkle level, \(\log_2(16) = 4\), and
- A 13-sibling `coinbase_branch`.

The relevant fields from the block JSON (annotated; the full record is at the link above; `chainindex` is the JSON name for the side mask):

```
{
  "hash":       "3e78ac34...9c9f6d88",                     // aux block (Namecoin) hash
  "auxpow": {
    "chainindex": 11,                                      // Namecoin's slot in the parent's slot tree
    "chainmerklebranch": [                                 // blockchain_branch siblings (4)
      "000000000000000000000000000000000000000000000000000000000000000a",
      "8ccfc263c108561c4e1c6c30b49fdab67c4ac12090291de80b9f07725c72717c",
      "ace26173348b3779777fdfd38835f76b2e5e0cf0f1e32b3c01fd9c6822c7c9b1",
      "a697adc4c5f4b32251e5ecd1aa16d038256e3750b8639c51df780745cc2db842"
    ],
    "merklebranch": [ /* 13 hashes - coinbase_branch siblings, omitted */ ],
    "tx": {
      "txid":      "c6cd5ec9...14e37cd5",                  // parent coinbase txid
      "vin":       [{"coinbase": "03ab770e...00000000"}],  // dissected below
      "blockhash": "00000000...20906c38"                   // parent Bitcoin block hash
    },
    "parentblock": "00000420...61514998"                   // serialised 80-byte parent header
  }
}
```

The parent coinbase `scriptSig`, dissected into fields:

```
"03ab770e"                                                         // BIP 34 push: parent height 948,139
"19" "4d696e656420627920416e74506f6f6c20"                          // 25-byte push containing a 17-byte tag: "Mined by AntPool "
     "87003601907790c0"                                            //   ...and 8 bytes pool extranonce
"fabe6d6d"                                                         // AuxPoW magic
"5a9c0198abca4e8c94a1ce47b0f09cf843e33a6a4d3aaf6b9240b08061d68a42" // aux_merkle_root (matches step 3 fold)
"10000000"                                                         // merkle_size = 16 (LE u32)
"00000000"                                                         // merkle_nonce = 0
"0000e66cf007010000000000"                                         // trailing scriptSig bytes (pool extras)
```

**Step 1 (locate marker in parent coinbase).** Inside the parent coinbase's `scriptSig`, the magic `fa be 6d 6d` sits at byte offset 30, after a BIP 34 height push and a 25-byte push containing the 17-byte ASCII tag `Mined by AntPool ` plus 8 bytes of pool extranonce.
The 32 bytes following the magic are `5a9c0198...61d68a42`, which we'll match against the fold result in step 3.
The trailing `10 00 00 00` and `00 00 00 00` give `merkle_size = 16` and `merkle_nonce = 0`.

**Step 2 (cross-check slot index).** Running the LCG over `chain_id = 1` (Namecoin), `merkle_nonce = 0`, and `merkle_size = 16` (the latter two from the marker bytes in step 1) returns 11, matching the side mask carried in `blockchain_branch`'s `chainindex` field.

**Step 3 (reconstruct `aux_merkle_root`).** Namecoin's slot in this block is 11 (validated in step 2), carried in the AuxPoW record's `chainindex` field (the JSON-friendly form of the 4-byte side mask at the tail of `blockchain_branch`).
That slot index doubles as the side mask for the four-sibling replay: slot 11 in binary is `1011`, so reading bit 0 (the LSB) first, the side bits at levels 0, 1, 2, 3 are `1, 1, 0, 1`.

We start `current` at the aux block header hash from the JSON's `hash` field, then apply four SHA-256d steps, each pairing `current` with the next sibling from `chainmerklebranch[]`:

```
current = 3e78ac34...9c9f6d88   (aux block header hash)

level 0 (bit 1, current on the right):
  current = SHA-256d(00000000...0000000a ‖ 3e78ac34...9c9f6d88)
          = 1ef8737d...e74dc89f

level 1 (bit 1, current on the right):
  current = SHA-256d(8ccfc263...5c72717c ‖ 1ef8737d...e74dc89f)
          = 3c11d081...44b313cf

level 2 (bit 0, current on the left):
  current = SHA-256d(3c11d081...44b313cf ‖ ace26173...22c7c9b1)
          = fe16c528...4a10d456

level 3 (bit 1, current on the right):
  current = SHA-256d(a697adc4...cc2db842 ‖ fe16c528...4a10d456)
          = 5a9c0198...61d68a42
```

The final `current`, `5a9c0198...61d68a42`, is the reconstructed `aux_merkle_root`, matching the `aux_merkle_root` extracted from the marker in step 1.

**Step 4 (reconstruct parent `merkle_root` and match).** The start hash is the coinbase txid, `c6cd5ec9...14e37cd5`.
The side mask is `0x00000000`, so at every level `current` is on the left and the sibling on the right (the coinbase is always leaf 0 regardless of how many transactions sit beside it).
The branch carries 13 siblings, consistent with a parent transaction merkle tree of 4,097 to 8,192 leaves. Folding all 13 in yields `d63208d5...3d0aa08d`, matching the `merkle_root` field of `parent_block_header`.

**Step 5 (verify PoW).** SHA-256d of `parent_block_header` reproduces the parent block hash.
Namecoin's `aux_target` at this height has compact form `0x1703e336`, which expands to a 32-byte target with nine leading zero bytes followed by `0x03 e3 36 00 ...`.
Lining up the hash and target as big-endian byte strings:

```
hash:    00 00 00 00 00 00 00 00 00 02 ...
target:  00 00 00 00 00 00 00 00 00 03 e3 36 ...
```

The first nine bytes are equal; at the tenth byte, the hash (`0x02`) is below the target (`0x03`), so the hash is below `aux_target` and the parent's work clears it.

That same hash, however, exceeds Bitcoin's `parent_target` at this height (compact `bits = 0x17021ff0`), making this parent _aux-only_ (the third category from [Two chains, one hash](#two-chains-one-hash)).
Bitcoin's canonical block at height 948,139 is a different hash (`000000000000000000018551...87613a79`); only Namecoin's AuxPoW record preserves the parent header here.

**Aside on the slot 10 filler.** The level-0 sibling, `00000000...0000000a`, is the value occupying slot 10 in this AntPool block's slot tree.
A genuinely occupied slot would carry another auxiliary chain's 32-byte block hash (high entropy throughout); this near-zero pattern is consistent with an unused slot.
:::

## `OP_RETURN` tag-based merge mining

AuxPoW is not the only way for a chain to reuse Bitcoin's proof-of-work.
Some chains instead embed a chain-specific marker in a dedicated `OP_RETURN` output in the parent's coinbase.
Unlike AuxPoW, where the data is embedded in the parent's coinbase transaction input (`scriptSig`), these markers live in the coinbase transaction outputs (`scriptPubKey`).

There doesn't appear to be a settled name for the technique, so we'll refer to it as _`OP_RETURN` tag-based merge mining_.
The [Mempool Research merge-mining report](https://research.mempool.space/merge-mining-report/) describes the common form as a zero-value `OP_RETURN` carrying a tag (usually ASCII) unique to the merge-mined chain.
A bare tag only marks the parent block as co-mined; it is only when the tag is followed by a payload (a hash of the aux chain's block, or similar) that the aux chain can verify Bitcoin's PoW for that specific block.

This should not be confused with _blind merge mining_ (BMM), the Drivechain ([BIP 300](https://github.com/bitcoin/bips/blob/master/bip-0300.mediawiki), [BIP 301](https://github.com/bitcoin/bips/blob/master/bip-0301.mediawiki)) concept where the miner does not run the sidechain node.
BIP 301 also uses an `OP_RETURN` commitment, so the difference is not the embedding location but the miner's relationship to the sidechain.

In `OP_RETURN` tag-based merge mining, each output is a coinbase `txout` whose `scriptPubKey` is `OP_RETURN <chain tag> <payload>`, where the tag is a short ASCII identifier and the payload's contents vary widely between chains: an aux block hash for direct PoW binding (e.g., [RSK](https://ips.rootstock.io/IPs/RSKIP92.html), tag `RSKBLOCK:`), accounting metadata for hashrate delegation (e.g., CoreDAO, tag `CORE`), an aux block hash and height tag for fork-aware cross-chain bridging (e.g., [Syscoin](https://github.com/syscoin/syscoin/blob/master/doc/release-notes/release-notes-5.0.0.md#4-auxpow-tags), tag `sys`), or other chain-specific data.

Since SegWit activated in 2017, almost every Bitcoin coinbase has already carried one `OP_RETURN` by default: per [BIP 141](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki#commitment-structure), every coinbase whose block contains a witness-bearing transaction must include an `OP_RETURN` with magic prefix `0xaa21a9ed` followed by a 32-byte commitment to the witness merkle root.
Bitcoin coinbases can carry [[multiple `OP_RETURN` outputs||Prior to Bitcoin Core v30, multiple `OP_RETURN` outputs in a single transaction were consensus-valid but non-standard, so they would not relay through nodes running default policy. Coinbases sidestep this: miners construct their own coinbases and need only consensus validity, not relay-standardness. v30 relaxed the standardness rule so multiple `OP_RETURN`s are now standard for ordinary transactions too.]], so tag-based merge-mining commitments simply add to that mandatory one.
The coinbase of [block 948,433](https://mempool.space/block/00000000000000000001144d36d598ad54dc664e6387ce1aae928117c44435dc), mined by SpiderPool, is one such case ({@fig:mempool-space-block-948433}):

```
OP_RETURN aa21a9ed7a379f...        SegWit witness commitment (BIP 141, mandatory)
OP_RETURN CORE 01 64db24a6...      CoreDAO hash-delegation metadata
OP_RETURN EXSAT 01 120f0803...     exSat synchronizer metadata
OP_RETURN RSKBLOCK: 6e48ff1e...    RSK merge-mining commitment
OP_RETURN sys 615097dc...          Syscoin merge-mining commitment
```

![The coinbase of block 948,433 as it appears on [mempool.space](https://mempool.space/block/00000000000000000001144d36d598ad54dc664e6387ce1aae928117c44435dc): multiple zero-value `OP_RETURN` outputs in the `scriptPubKey`s carrying the SegWit witness commitment, merge-mining commitments, and other project/protocol metadata, while the input `scriptSig` carries an AuxPoW marker, showing that this block is also a parent for AuxPoW chains (dissected below).](/assets/blog/2026/merge-mining/mempool-space-block-948433.png){#fig:mempool-space-block-948433}

Compared with AuxPoW, tag-based approaches avoid the shared tree, chain-ID coordination, the broken `merkle_nonce` collision-avoidance scheme, and the marker placement rule.
A miner participating in multiple such systems simply emits one coinbase `OP_RETURN` output for each system.

What these approaches give up is the shared verification model.
Each tag-based chain defines its own rule for what counts as a valid Bitcoin parent and how the parent header or Bitcoin block metadata is carried in its own format.
There is also no single specification document equivalent to the [Merged mining specification](https://en.bitcoin.it/wiki/Merged_mining_specification); each chain defines its own.

The two mechanisms coexist in the same Bitcoin coinbase because they live in different fields: AuxPoW commits via the input `scriptSig`, `OP_RETURN` tag-based approaches commit via output `scriptPubKey`s.
Bitcoin block [948,433](https://mempool.space/block/00000000000000000001144d36d598ad54dc664e6387ce1aae928117c44435dc) as examined above illustrates this ({@fig:mempool-space-block-948433}): alongside five `OP_RETURN` outputs (the SegWit witness commitment plus four project/protocol tags, including RSK/Syscoin merge-mining commitments and Core/exSat coordination metadata), the coinbase `scriptSig` carries an AuxPoW marker that, with `merkle_size = 8`, commits to up to eight auxiliary chains:

```
"03d1780e"                                                         // BIP 34 push: parent height 948,433
"045899fd69"                                                       // 4-byte push: pool extranonce (LE u32 = 0x69fd9958)
"537069646572506f6f6c2f3134372f"                                   // 15-byte ASCII tag: "SpiderPool/147/"
"fabe6d6d"                                                         // AuxPoW magic
"40c91d098550760af551762fa506da60fb1ed54256c9d5f9123816d8967111f9" // aux_merkle_root
"08000000"                                                         // merkle_size = 8 (LE u32)
"b9035e3f"                                                         // merkle_nonce (LE u32 = 0x3f5e03b9)
"b6f68743200090c94e12000000000000"                                 // trailing scriptSig bytes (pool extras)
```

That is, AuxPoW and tag-based commitments can reuse the same Bitcoin proof-of-work in the same parent block.
On the Namecoin side of this commitment, [Namecoin block 823,793](https://chainz.cryptoid.info/nmc/block.dws?9f982998fb47a657f7a7310de94bc932b03d6c9dfa500fe92ebfbb06a86b258a.htm) carries Bitcoin [948,433's](https://mempool.space/block/00000000000000000001144d36d598ad54dc664e6387ce1aae928117c44435dc) 80-byte header inside its AuxPoW record at slot 4 of the marker's 8-slot tree, exactly the side-channel introduced earlier in the post.
The full [mempool.space](https://mempool.space/block/00000000000000000001144d36d598ad54dc664e6387ce1aae928117c44435dc) view of this coinbase, with the AuxPoW magic highlighted in the `scriptSig`, is shown in the [full coinbase breakdown](#mempool-space-block-948433-details) below for reference.

:::collapse{Full coinbase breakdown of Bitcoin block 948,433}{#mempool-space-block-948433-details}

![Block 948,433 coinbase on mempool.space: `scriptSig` on the left (with the `fabe6d6d` AuxPoW magic highlighted), P2PKH reward output and five `OP_RETURN` outputs on the right.](/assets/blog/2026/merge-mining/mempool-space-block-948433-details.png)

:::

## Conclusion

AuxPoW gives an auxiliary chain a way to reuse Bitcoin's proof-of-work without any participation from Bitcoin itself.
This satisfies the idea Satoshi proposed in 2010: the parent network needs no coordination with any auxiliary chains, yet many chains can share the parent's hashing effort through a single coinbase commitment to a shared merkle slot tree of auxiliary block hashes.

A single SHA-256d evaluation of the parent header serves both sides.
The hash is tested against `parent_target` on Bitcoin's side and against `aux_target` on the auxiliary chain's side (almost always the easier threshold), with three possible outcomes: rejected, aux-only valid, or both parent and aux valid.

The AuxPoW specification makes this verifiable on the auxiliary side using three pieces.
A 44-byte AuxPoW marker in the parent coinbase `scriptSig` binds the parent block to that shared merkle slot tree of auxiliary block hashes.
An AuxPoW record on the auxiliary chain carries the parent coinbase, the parent header, and the merkle paths needed to verify that commitment.
A five-step verification rule then validates the PoW link regardless of whether Bitcoin's canonical chain ever accepts the parent block.

Together the three pieces let the auxiliary chain treat any candidate hash that clears `aux_target` as proof-of-work for its block, whether or not Bitcoin accepts the parent.
Every AuxPoW record also retains its full parent header, including headers Bitcoin's canonical chain discarded, making AuxPoW chains a side-channel into Bitcoin's PoW history.

`OP_RETURN` tag-based merge mining sits alongside AuxPoW as a lighter, per-chain alternative: a coinbase `OP_RETURN` output per chain rather than a shared `scriptSig` marker, with each chain free to define its own tag, payload format, and commitment semantics (e.g., PoW binding like AuxPoW, or another purpose such as delegation accounting or fork-aware bridge notarisation).
The two embedding locations coexist in the same coinbase without interfering ({@fig:mempool-space-block-948433}): AuxPoW commits via the input `scriptSig`, `OP_RETURN` tag-based approaches via the output `scriptPubKey`s.

A [companion post](./merge-mining-chains-and-pools) catalogues every chain that has actually deployed AuxPoW with Bitcoin as its parent, and examines which Bitcoin mining pools embed merge-mining commitments in their coinbases.

A separate follow-up post will use the side-channel AuxPoW creates (auxiliary chains preserving parent headers Bitcoin discarded as stale) to put numbers on a long-standing claim about block propagation: that smaller mining pools produce more stale blocks, relative to their hashrate, than larger ones.

## References

**Specifications and primary sources**

- [Merged mining specification (Bitcoin Wiki)](https://en.bitcoin.it/wiki/Merged_mining_specification)
- [Community catalogue of merge-mined chain IDs (BitcoinTalk thread 769073)](https://bitcointalk.org/index.php?topic=769073.0)
- [BitDNS and Generalizing Bitcoin (BitcoinTalk, November 2010)](https://bitcointalk.org/index.php?topic=1790.0)
- [Satoshi: BitDNS as a separate chain sharing proof-of-work (BitcoinTalk, 9 December 2010)](https://bitcointalk.org/index.php?topic=1790.msg28696#msg28696)
- [Namecoin merge-mining hard fork announcement, block 19,200 (Namecoin Forum, 2021 Wayback snapshot; the live forum has been down since May 2025)](https://web.archive.org/web/20211220001040/https://forum.namecoin.org/viewtopic.php?t=217)
- [Nonce for merged mining chain merkle tree index (BitcoinTalk)](https://bitcointalk.org/index.php?topic=51069.0)
- [Namecoin project site](https://www.namecoin.org/)
- [BIP 34: Block v2, Height in Coinbase](https://github.com/bitcoin/bips/blob/master/bip-0034.mediawiki)
- [BIP 141: Segregated Witness (Consensus layer)](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)
- [BIP 300: Hashrate Escrows (Drivechains)](https://github.com/bitcoin/bips/blob/master/bip-0300.mediawiki)
- [BIP 301: Blind Merged Mining](https://github.com/bitcoin/bips/blob/master/bip-0301.mediawiki)
- [RSKIP-92: Merkle proof serialization for merge-mined RSK blocks (Rootstock)](https://ips.rootstock.io/IPs/RSKIP92.html)
- [Syscoin 5.0.0 release notes: AuxPoW tags](https://github.com/syscoin/syscoin/blob/master/doc/release-notes/release-notes-5.0.0.md#4-auxpow-tags)

**Papers and long-form explainers**

- [Stifter, Schindler, Judmayer, Zamyatin, Kern & Weippl. Echoes of the Past: Recovering Blockchain Metrics From Merged Mining (FC 2019)](https://eprint.iacr.org/2018/1134.pdf)
- [Zamyatin, A. Merged Mining: Analysis of Effects and Implications (TU Wien diploma thesis, 2017)](https://repositum.tuwien.at/bitstream/20.500.12708/5239/2/Zamyatin%20Alexei%20-%202017%20-%20Merged%20mining%20analysis%20of%20effects%20and%20implications.pdf)
- [Judmayer, Zamyatin, Stifter, Voyiatzis & Weippl. Merged Mining: Curse or Cure? (CBT 2017)](https://eprint.iacr.org/2017/791.pdf)
- [Tari Labs University: Merged Mining Introduction](https://tlu.tarilabs.com/mining/MergedMiningIntroduction)
- [Mempool Research: Merge-mining report](https://research.mempool.space/merge-mining-report/)
- [BitMEX Research: The Growth of Bitcoin Merge Mining (2020)](https://blog.bitmex.com/the-growth-of-bitcoin-merge-mining/)
- [Sergio Demian Lerner: Merged mining (Part I) (Bitslog, 2022)](https://bitslog.com/2022/11/22/merged-mining-part-i/)
- [learnmeabitcoin: Nonce (interactive extranonce explainer)](https://learnmeabitcoin.com/technical/block/nonce/)
- [Linear congruential generator (Wikipedia)](https://en.wikipedia.org/wiki/Linear_congruential_generator)

**Reference implementations and worked-example data**

- [Namecoin Core: `src/auxpow.cpp` (the canonical C++ AuxPoW verification)](https://github.com/namecoin/namecoin-core/blob/master/src/auxpow.cpp)
- [Elastos.ELA: `auxpow/auxpow.go` (Go port of the same verification logic)](https://github.com/elastos/Elastos.ELA/blob/master/auxpow/auxpow.go)
- [Bitcoin Core: `src/consensus/tx_check.cpp` (coinbase `scriptSig` length limit)](https://github.com/bitcoin/bitcoin/blob/master/src/consensus/tx_check.cpp#L49-L50)
- [Namecoin block 823,506 (chainz.cryptoid.info)](https://chainz.cryptoid.info/nmc/block.dws?3e78ac3489c58c087428a1536b1b93c656f846419dd78190d2fd05889c9f6d88.htm)
- [Bitcoin block 948,433 (mempool.space)](https://mempool.space/block/00000000000000000001144d36d598ad54dc664e6387ce1aae928117c44435dc)
- [Namecoin block 823,793 (chainz.cryptoid.info)](https://chainz.cryptoid.info/nmc/block.dws?9f982998fb47a657f7a7310de94bc932b03d6c9dfa500fe92ebfbb06a86b258a.htm), the aux-chain block parented by Bitcoin block 948,433
