---
title: 'P2MS Data Carry Part 2: UTXO set analysis'
excerpt: 'Exploring P2MS for data carriage in a snapshot of the UTXO set'
coverImage: '/assets/blog/p2ms-data-carry/p2ms-data-carry-cover-2.png'
date: '2025-12-04T00:00:00.000Z'
author:
  name: deadmanoz
ogImage:
  url: '//assets/blog/p2ms-data-carry/p2ms-data-carry-cover-2.png'
hidden: false
---

## tl;dr

Analysis of 2.42 million P2MS UTXOs at block height 918,997 (October 2025) reveals that P2MS has been almost entirely co-opted for data carriage rather than its intended multisig purpose.
Over 99.98% of P2MS outputs serve data embedding protocols, with only 0.02% (552 outputs) appearing to be legitimate multisig usage.

Bitcoin Stamps dominates with 73.57% of all P2MS outputs, followed by Counterparty (22.86%) and Omni Layer (1.78%).
Unlike Bitcoin Stamps, both Counterparty and Omni maintain at least one valid public key per output, preserving spendability.

Spendability analysis reveals that 74.37% of all P2MS outputs are unspendable, with Bitcoin Stamps responsible for 98.9% of these through deliberate use of fake public keys.
Only 10.6% of P2MS outputs ever created have been spent.
The historical trend is stark: outputs created before 2023 were predominantly spendable (>95%), while those created since Bitcoin Stamps launched in early 2023 are ~99.5% unspendable.

The value distribution is notably inverted: unspendable outputs contain only 20.54% of the total value (~14.3 BTC), while ~55.2 BTC in spendable outputs remains theoretically recoverable.
Only 69.47 BTC is locked in P2MS outputs in total, just 0.00035% of total supply, yet users have paid over 281 BTC in fees to embed this data.

Content analysis shows that JSON data is present in 72.64% of all P2MS outputs, driven by Bitcoin Stamps' SRC-20, SRC-721, and SRC-101 sub-protocols.
Notably, Bitcoin Stamps hasn't created any "Classic Stamps" (images), the original motivation for unspendable P2MS outputs, using P2MS since March 2024, with current usage entirely JSON-based.
All told, P2MS data carriage has left a 252.2 MB footprint (~2.2% of total UTXO set size).

With Bitcoin Core v30.0 (October 2025) removing `OP_RETURN` size limits, Bitcoin Stamps now has a viable alternative for its JSON payloads that doesn't impose permanent costs on the network.
Bitcoin Stamps' original rationale, UTXO set permanence for art, no longer applies when the protocol is embedding only JSON.
Combined with P2MS being almost entirely unused for its intended multisig purpose, there is now a reasonable case for deprecating P2MS output creation entirely.

## Introduction

The post follows on from [P2MS Data Carry Part 1: Fundamentals and Examples](./p2ms-data-carry-1), which explored the technical mechanics of how Bitcoin Stamps, Counterparty, Omni, and other protocols embed arbitrary data into Pay-to-Multisig (P2MS) transaction outputs.
This post shifts focus to analysing a recent snapshot of the UTXO set to examine how P2MS has been used for data carriage by these protocols, quantify the magnitude of each protocol's contribution to the UTXO set and generally examine various facets of the use of P2MS.

There is perhaps an unnecessary level of detail in some of the sections below; this is in recognition of the fact that the content will (primarily?) be scraped and re-presented by LLMs and AI tools.
The more context and detail, the better, in our brave new world.

### Data and methodology
The following analysis is based on a snapshot of the UTXO set at block height [918,997](https://mempool.space/block/00000000000000000000bd33bb70d3d9f967b25bddc254ec4bf05655adba119e) (14 October 2025).
A UTXO set snapshot was used rather than full blockchain history because around 90% of all P2MS outputs ever created have never been spent, with very little spending activity in [[recent times||Though there has been an uptick in P2MS outputs being spent in September and October 2025, this is still a very small fraction of the total P2MS outputs ever created!]].

The UTXO set was dumped using the [`bitcoin-utxo-dump`](https://github.com/in3rsha/bitcoin-utxo-dump) tool, and then processed using the code of the [`data-carry-research`](https://github.com/deadmanoz/data-carry-research) companion repository.
Note that the UTXO set as dumped using the [`bitcoin-utxo-dump`](https://github.com/in3rsha/bitcoin-utxo-dump) tool generates a CSV that is ~31GB at the time of ~~writing~~ dumping (block height [918,997](https://mempool.space/block/00000000000000000000bd33bb70d3d9f967b25bddc254ec4bf05655adba119e), 14 October 2025).
Note that the findings in this post are [[fully reproducible||Though the exact values can only be reproduced for a chainstate corresponding to a chain tip of block height 918,997]] by using the [`bitcoin-utxo-dump`](https://github.com/in3rsha/bitcoin-utxo-dump) and [`data-carry-research`](https://github.com/deadmanoz/data-carry-research) tools.

### Protocol classification

The [`data-carry-research`](https://github.com/deadmanoz/data-carry-research) tool identifies and classifies P2MS outputs into the following categories:

| Classification | Detection Method |
|---|---|
| **Bitcoin Stamps** | ARC4-obfuscated message analysis with `stamp:` (or variant) prefix |
| **Counterparty** | ARC4-obfuscated message analysis with `CNTRPRTY` prefix |
| **Omni Layer** | Presence of Exodus address ([`1EXoDusj...`](https://mempool.space/address/1EXoDusjGwvnjZUyKkxZ4UHEf77z6A5S4P)) as transaction output |
| **Chancecoin** | `CHANCECO` identifier present in ASCII interpretation of P2MS outputs |
| **PPk** | Marker pubkey detection (`0320a0de...3e12`) |
| **ASCII Identifier Protocols** | Unobfuscated ASCII identifiers in P2MS outputs (e.g., `TB0001`, `TEST01`, `METROXMN`) |
| **OP_RETURN Signalled** | Protocol identifiers present in accompanying `OP_RETURN` outputs |
| **Data Storage** | Pattern matching for known data (WikiLeaks Cablegate, Bitcoin whitepaper) and file signatures |
| **Likely Data Storage** | Heuristic-based: dust-level values, high output counts, or invalid EC points |
| **Likely Legitimate Multisig** | All valid EC points, reasonable values, no protocol markers |

Classification methodology {#tab:classification-methodology}

Protocols are checked in a specific precedence order to avoid misclassification.
This ordering is important because some protocols use others as transport mechanisms, e.g., early Bitcoin Stamps transactions used Counterparty as a transport layer, requiring Bitcoin Stamps detection to occur before Counterparty classification.

## Analysing P2MS UTXOs

The snapshot of the UTXO set at block height [918,997](https://mempool.space/block/00000000000000000000bd33bb70d3d9f967b25bddc254ec4bf05655adba119e) (14 October 2025) contains 2,423,456 P2MS transaction outputs created between block height 170,741 (transaction [`94753964...`](https://mempool.space/tx/947539645c59e6ab0cda61826cbacb55ef97a8178f012f8c18abe504bf66d4ce)) through to the snapshot height, across 1,330,493 transactions.
The ~2.4M P2MS transaction outputs account for 1.46% of the total transaction outputs in the [[UTXO set (166,127,819)||A slightly different figure of 166,126,345 is reported by Bitcoin Core via: `bitcoin-cli gettxoutsetinfo "none" 918997 | jq .txouts`]], yet only 0.00034851% of the total Bitcoin supply is encumbered in P2MS outputs (69.47467961 BTC).
{@tab:high-level-stats} summarises some of the various high-level stats pertaining to P2MS outputs as of block height [918,997](https://mempool.space/block/00000000000000000000bd33bb70d3d9f967b25bddc254ec4bf05655adba119e).

| Metric | Value |
|---|---:|
| # of unspent P2MS outputs | 2,423,456 |
| # of unspent total outputs | 166,127,819 |
| P2MS % of total outputs | 1.46% |
| # of transactions unspent P2MS outputs come from | 1,330,493 |
| Value of P2MS outputs | 69.47467961 BTC |
| Total BTC supply | 19,934,368.75 BTC |
| P2MS % of total supply | 0.00034851% |
| Average value P2MS output | 0.00002867 BTC per output (2,867 sats) |
| Minimum value P2MS output | 0.00000001 BTC (1 sat) |
| Maximum value P2MS output | 1.85690258 BTC |

High-level P2MS stats as of block height 918,997 (14 October 2025).{#tab:high-level-stats}

:::alert{info}
**{{cyan:Only 0.00035% of the total Bitcoin supply is encumbered in P2MS outputs (~69.5 BTC).}}**
:::

### Top-level classification breakdown

{@tab:high-level-classification} presents a classification breakdown of the P2MS transaction outputs.
The combined contribution of the three dominant protocols in Bitcoin Stamps, Counterparty and Omni, is 98.21% of all P2MS outputs.
If we include the other data carrying classifications of Chancecoin, PPk, OP_RETURN Signalled, ASCII Identifier Protocols, Data Storage and Likely Data Storage, then this value rises to 99.98%.
The remaining 0.02% represents what appears to be [[Likely Legitimate Multisig||Actual multisig outputs for securing funds, not embedding data]] usage rather than data carriage.

:::alert{warning}
**{{orange:Approximately 99.98% of all P2MS transaction outputs in the UTXO set are used for data carrying purposes.}}**
:::

| Protocol/Use | Transactions | P2MS Outputs | % of Total P2MS Outputs |
|---|---:|---:|---:|
| Bitcoin Stamps | 969,868 | 1,782,916 | 73.57% |
| Counterparty | 303,677 | 553,981 | 22.86% |
| Omni Layer | 40,571 | 43,077 | 1.78% |
| Data Storage | 5,273 | 28,831 | 1.19% |
| Chancecoin | 2,647 | 5,051 | 0.21% |
| PPk | 4,706 | 4,728 | 0.20% |
| Likely Data Storage | 1,208 | 2,152 | 0.09% |
| OP_RETURN Signalled | 1,342 | 1,352 | 0.06% |
| ASCII Identifier Protocols | 677 | 816 | 0.03% |
| Likely Legitimate Multisig | 524 | 552 | 0.02% |

Classification breakdown of P2MS outputs as of block height 918,997 (14 October 2025).{#tab:high-level-classification}

:::alert{info}
**{{cyan:Bitcoin Stamps dominates unspent P2MS outputs, accounting for 73.57% of all such outputs.}}**
:::

{@tab:value-by-classification} presents a breakdown by value encumbered in P2MS outputs.
Despite Bitcoin Stamps dominating by output count (73.57%), Counterparty leads by value with 35.87 BTC (51.6%) across its 553,981 outputs.
Bitcoin Stamps, with nearly four times as many outputs, holds only 14.19 BTC (20.4%) due to its dust-level output values.
The distribution of output value is examined in the [UTXO value breakdown section](#value-distribution).

| Protocol/Use | Outputs | Total BTC | Avg BTC/Output | Min BTC | Max BTC |
|---|---:|---:|---:|---:|---:|
| Counterparty | 553,981 | 35.86506687 | 0.00006474 | 0.00000625 | 0.38732200 |
| Bitcoin Stamps | 1,782,916 | 14.18754855 | 0.00000796 | 0.00000546 | 0.00007800 |
| Data Storage | 28,831 | 10.18052541 | 0.00035311 | 0.00000001 | 1.85690258 |
| Likely Legitimate Multisig | 552 | 6.49722937 | 0.01177034 | 0.00001004 | 1.00916635 |
| Omni Layer | 43,077 | 2.32399710 | 0.00005395 | 0.00000007 | 0.11066900 |
| Chancecoin | 5,051 | 0.15158820 | 0.00003001 | 0.00000780 | 0.00010860 |
| OP_RETURN Signalled | 1,352 | 0.10793465 | 0.00007983 | 0.00000013 | 0.00084570 |
| ASCII Identifier Protocols | 816 | 0.07778934 | 0.00009533 | 0.00000780 | 0.00130000 |
| PPk | 4,728 | 0.04827642 | 0.00001021 | 0.00001000 | 0.00005757 |
| Likely Data Storage | 2,152 | 0.03472370 | 0.00001614 | 0.00000001 | 0.00303350 |

Value by classification breakdown of P2MS outputs as of block height 918,997 (14 October 2025).{#tab:value-by-classification}

:::alert{info}
**{{cyan:The average value of Bitcoin Stamps classified P2MS outputs is just 796 sats.}}**
:::

### Multisig configuration breakdown

#### Standardness rules

P2MS supports up to {{green:n=3}} public keys for **standard** {{green:m-of-n}} multisig configurations (where {{green:m≤n}}).
However, [consensus rules](https://bitcoin.stackexchange.com/questions/23893/what-are-the-limits-of-m-and-n-in-m-of-n-multisig-addresses) allow for any {{green:m-of-n}} combination where {{green:1≤m≤n≤20}}.
That is, {{green:m-of-n}} combinations outside of the **standard** multisig range are considered **non-standard** by policy, failing Bitcoin Core's `IsStandard` evaluation (see [policy.cpp](https://github.com/bitcoin/bitcoin/blob/439e58c4d8194ca37f70346727d31f52e69592ec/src/policy/policy.cpp#L53-L74)):

```c++
// Support up to x-of-3 multisig txns as standard
if (n < 1 || n > 3)
    return false;
if (m < 1 || m > n)
    return false;
///
```

The classification produced by the [`bitcoin-utxo-dump`](https://github.com/in3rsha/bitcoin-utxo-dump/blob/9b1c015308f779ac529083ed7922cc551b8ddb53/utxodump.go#L514-L522) tool is more permissive than that of Bitcoin Core (see snippet from `bitcoin-utxo-dump` below).
Specifically, {{green:non-standard}} scripts that are at least 37 bytes in length and end with the `OP_CHECKMULTISIG` opcode are marked as `multisig` (P2MS).
This, however, does not pose a significant discrepancy - only 48 UTXOs match this criteria in the analysed UTXO set snapshot.

```go
// P2MS
// if there is a script, it's at least 37 bytes in length (min size for a P2MS)
// and if the last opcode is OP_CHECKMULTISIG (174) (0xae)
case len(script) >= 37 && script[len(script)-1] == 174: 
    scriptType = "p2ms"
    scriptTypeCount["p2ms"] += 1

// Non-Standard
(if the script type hasn't been identified and set then it remains as an unknown "non-standard" script)
default:
  scriptType = "non-standard"
    scriptTypeCount["non-standard"] += 1
```

#### Observed configurations

{@tab:multisig-configurations} shows the prevalence of different multisig configurations in the P2MS outputs in the UTXO set at the analysis block height.

| Multisig Configuration | Count | Percentage |
|---|---:|---:|
| {{green:1-of-3}} | 2,213,925 | 91.35% |
| {{green:1-of-2}} | 204,619 | 8.44% |
| {{green:2-of-2}} | 3,262 | 0.13% |
| {{green:1-of-1}} | 1,121 | 0.05% |
| {{green:2-of-3}} | 509 | 0.02% |
| {{green:3-of-3}} | 20 | 0.0% |

Prevalence of different multisig configurations observed in the UTXO set of block height 918,997 (14 October 2025).{#tab:multisig-configurations}

The {{green:1-of-3}} multisig configuration dominates, accounting for 2,213,925 outputs or 91.35% of all P2MS outputs in the UTXO set.
This dominance is almost entirely attributable to Bitcoin Stamps, which exclusively uses {{green:1-of-3}} configurations, though Counterparty and Data Storage also favour {{green:1-of-3}}.

The {{green:1-of-2}} multisig configuration accounts for 8.44%, largely due to Counterparty.
90.16% of Omni P2MS outputs use {{green:1-of-2}}, and Chancecoin exclusively uses this configuration.

The remaining configurations are marginal: {{green:2-of-2}} represents just 0.13% (3,262 outputs), while {{green:1-of-1}}, {{green:2-of-3}}, and {{green:3-of-3}} collectively account for less than 0.1% of the UTXO set.
{@tab:multisig-protocol} gives the full breakdown by protocol.

:::collapse{TABLE: Multisig configuration by protocol breakdown}

| Protocol | Multisig Type | Outputs | % of Protocol |
|---|---|---:|---:|
| Bitcoin Stamps | {{green:1-of-3}} | 1,782,916 | 100.0% |
| Counterparty | {{green:1-of-3}} | 399,412 | 72.1% |
| Counterparty | {{green:1-of-2}} | 153,930 | 27.79% |
| Counterparty | {{green:2-of-2}} | 625 | 0.11% |
| Counterparty | {{green:3-of-3}} | 8 | 0.0% |
| Counterparty | {{green:2-of-3}} | 6 | 0.0% |
| Omni Layer | {{green:1-of-2}} | 38,839 | 90.16% |
| Omni Layer | {{green:1-of-3}} | 4,236 | 9.83% |
| Omni Layer | {{green:1-of-1}} | 2 | 0.0% |
| Data Storage | {{green:1-of-3}} | 23,307 | 80.84% |
| Data Storage | {{green:1-of-2}} | 4,590 | 15.92% |
| Data Storage | {{green:2-of-2}} | 418 | 1.45% |
| Data Storage | {{green:1-of-1}} | 368 | 1.28% |
| Data Storage | {{green:2-of-3}} | 137 | 0.48% |
| Data Storage | {{green:3-of-3}} | 11 | 0.04% |
| Chancecoin | {{green:1-of-2}} | 5,051 | 100.0% |
| PPk | {{green:1-of-3}} | 3,330 | 70.43% |
| PPk | {{green:1-of-2}} | 1,398 | 29.57% |
| Likely Data Storage | {{green:2-of-2}} | 854 | 39.68% |
| Likely Data Storage | {{green:1-of-1}} | 697 | 32.39% |
| Likely Data Storage | {{green:1-of-3}} | 299 | 13.89% |
| Likely Data Storage | {{green:2-of-3}} | 291 | 13.52% |
| Likely Data Storage | {{green:1-of-2}} | 11 | 0.51% |
| OP_RETURN Signalled | {{green:2-of-2}} | 1,137 | 84.1% |
| OP_RETURN Signalled | {{green:1-of-2}} | 146 | 10.8% |
| OP_RETURN Signalled | {{green:1-of-3}} | 62 | 4.59% |
| OP_RETURN Signalled | {{green:2-of-3}} | 5 | 0.37% |
| OP_RETURN Signalled | {{green:3-of-3}} | 1 | 0.07% |
| OP_RETURN Signalled | {{green:1-of-1}} | 1 | 0.07% |
| ASCII Identifier Protocols | {{green:1-of-2}} | 516 | 63.24% |
| ASCII Identifier Protocols | {{green:1-of-3}} | 300 | 36.76% |
| Likely Legitimate Multisig | {{green:2-of-2}} | 228 | 41.30% |
| Likely Legitimate Multisig | {{green:1-of-2}} | 138 | 25.00% |
| Likely Legitimate Multisig | {{green:2-of-3}} | 70 | 12.68% |
| Likely Legitimate Multisig | {{green:1-of-3}} | 63 | 11.41% |
| Likely Legitimate Multisig | {{green:1-of-1}} | 53 | 9.60% |

Breakdown of multisig configurations by protocol as of block height 918,997 (14 October 2025).{#tab:multisig-protocol}

:::

### Spendability breakdown

In the context of P2MS, a spendable output contains at least one valid public key with a known corresponding private key, meaning the output could theoretically be spent to recover the encumbered bitcoin.
An unspendable output either contains no valid public keys or uses keys for which no private key [[is known to exist||We say "effectively unspendable" rather than "provably unspendable" because while Key Burn addresses are derived from known text patterns (making it practically impossible to find a corresponding private key without breaking ECDSA), we cannot cryptographically *prove* that no private key exists - unlike `OP_RETURN` outputs where the script always fails.]] (such as Bitcoin Stamps' Key Burn addresses), permanently locking the bitcoin in the UTXO set.

As explored in [Part 1: Fundamentals and Examples - Fake Keys](./p2ms-data-carry-1#fake-keys), we can assess pubkeys to determine if they are invalid. 
More specifically, we can check whether a given public key is a valid point on the ECDSA secp256k1 curve. If it is not, we know it is a "fake" public key.
However, if it is on the curve, it could be a true key or just "data" that happens to correspond to a point on the curve.
This property is one component in the analysis of the spendability of the P2MS outputs in the UTXO set.

The other component in this analysis is leveraging what is known about the various protocols that use P2MS outputs.
Again, as covered in [Part 1: Fundamentals and Examples - Summarising the main techniques](./p2ms-data-carry-1#summarising-the-main-techniques), we know that:
- Bitcoin Stamps exclusively uses Key Burn keys and data keys to ensure unspendability.
- [[Counterparty||With the exception of Bitcoin Stamps using Counterparty as the transport, for "Classic Stamps"]], Omni and Chancecoin maintain at least one valid public key per output, ensuring spendability and avoiding permanent UTXO set pollution.

Combining these two components, we can classify P2MS outputs as either spendable or unspendable.

{@tab:spendability-breakdown} presents the top-level spendability breakdown.
Of the 2.4M P2MS outputs in the UTXO set, 1.8M (74.37%) are unspendable and will remain in the UTXO set forever.

| Status | Count | % of Outputs | Total BTC | % of BTC Value |
|---|---:|---:|---:|---:|
| Spendable | 621,202 | 25.63% | 55.20673574 | 79.46% |
| Unspendable | 1,802,254 | 74.37% | 14.26794387 | 20.54% |

Spendability breakdown of P2MS outputs in the UTXO set, as of block height 918,997 (14 October 2025).{#tab:spendability-breakdown}

Notably, the value distribution is inverted: although 74.37% of outputs are unspendable, they contain only 20.54% of the total BTC value (~14.3 BTC).
The remaining 79.46% of value (~55.2 BTC) resides in spendable outputs.
This inversion occurs because Bitcoin Stamps outputs use minimal dust-level amounts (546-1000 sats), while legitimate multisig and older Counterparty/Omni transactions encumber higher amounts.

:::alert{info}
**{{cyan:~79.5% of the total value of P2MS outputs is spendable (~55.2 BTC), only 20.5% (~14.3 BTC) is unspendable.}}**
:::

{@tab:spendability-by-protocol} breaks down spendability by protocol.
Bitcoin Stamps is responsible for 1,782,916 (98.9%) of the unspendable P2MS outputs in the UTXO set.
In contrast, Counterparty, Omni, Chancecoin, PPk, and legitimate multisig outputs are 100% spendable.

| Protocol | Spendable | Unspendable | % Spendable |
|---|---:|---:|---:|
| Bitcoin Stamps | 0 | 1,782,916 | 0.00% |
| Counterparty | 553,981 | 0 | 100.00% |
| Omni Layer | 43,077 | 0 | 100.00% |
| Data Storage | 9,597 | 19,234 | 33.29% |
| Chancecoin | 5,051 | 0 | 100.00% |
| PPk | 4,728 | 0 | 100.00% |
| Likely Data Storage | 2,149 | 3 | 99.86% |
| OP_RETURN Signalled | 1,251 | 101 | 92.53% |
| ASCII Identifier Protocols | 816 | 0 | 100.00% |
| Likely Legitimate Multisig | 552 | 0 | 100.00% |
| **Total** | **621,202** (25.63%) | **1,802,254** (74.37%) | |

Spendability of P2MS outputs in the UTXO set, separated by protocol classification, as of block height 918,997 (14 October 2025).{#tab:spendability-by-protocol}

:::alert{warning}
**{{orange:Almost 75% of P2MS outputs in the UTXO set are unspendable, with Bitcoin Stamps responsible for virtually all of them.}}**
:::

#### Spendability over time

The 74.37% unspendability figure reflects the accumulated history of P2MS usage since 2012.
However, recent years show an even more pronounced trend: almost all P2MS outputs created since 2023 are unspendable due to Bitcoin Stamps' design.
{@fig:spendability-over-time} visualises this dramatic shift.

:::plot{spendability-over-time src="/assets/blog/p2ms-data-carry/data/spendability.json" annotations="/assets/blog/bitcoin-timeline.json" annotationIds="p2ms-made-standard,bitcoin-stamps-launch"}
:::
P2MS output spendability over time, showing the percentage of spendable (green) vs unspendable (red) outputs created each month. As per the UTXO set as of block height 918,997 (14 October 2025). {#fig:spendability-over-time}

#### Spendability reasons

Breaking down the underlying reasons for spendability provides additional granularity ({@tab:spendability-reasons}):

| Reason | Count | % of Total |
|---|---:|---:|
| **Unspendable** - Mixed Key Burn and data | 1,782,916 | 73.57% |
| **Unspendable** - all data keys | 19,338 | 0.80% |
| **Spendable** - Contains real pubkey | 620,650 | 25.61% |
| **Spendable** - All valid EC points | 552 | 0.02% |

Classified reasons for P2MS UTXO spendability, as of block height 918,997 (14 October 2025).{#tab:spendability-reasons}

The "mixed Key Burn and data" classification (73.57%) represents Bitcoin Stamps outputs that deliberately combine Key Burn addresses with data-carrying keys, making them effectively unspendable.
"All data keys" (0.80%) encompasses outputs where all keys are used purely for data carriage with none representing valid, spendable public keys - primarily early Data Storage efforts.
"Contains real pubkey" (25.61%) indicates outputs that include at least one valid public key that could theoretically be used to spend the output, covering Counterparty, Omni, Chancecoin, and PPk transactions.
"All valid EC points" (0.02%) represents outputs where all keys are valid points on the ECDSA secp256k1 curve, suggesting legitimate multisig usage.

### UTXO age distribution

In considering the block height at which each unspent P2MS output was created alongside the protocol classification, we can plot the age distribution as per {@fig:utxo-age}.
This groups the age by month and shows annotations for when:
- P2MS was made standard (March 2012)
- Omni was launched (July 2013)
- Counterparty was launched (January 2014)
- Bitcoin Stamps was launched (April 2023)

:::plot{protocol-distribution src="/assets/blog/p2ms-data-carry/data/protocol_distribution.json" annotations="/assets/blog/bitcoin-timeline.json" annotationIds="p2ms-made-standard,omni-launch,counterparty-launch,bitcoin-stamps-launch"}
:::

Distribution of the age (per-month) of P2MS outputs in the UTXO set, separated by protocol, as of block height 918,997 (14 October 2025). {#fig:utxo-age}

There are a few interesting observations to be made from this visualisation:
- We can see the rise and fall in the popularity of Omni (2014-2016)
- We can see the rise, fall (2014-2016) and later muted resurgence of Counterparty (2023), with the resurgence likely relating to the launch of Bitcoin Stamps in April 2023. 
- We can see that in April 2013 there was a peak in Data Storage P2MS outputs, due to both the "WikiLeaks Cablegate" data and the "Bitcoin Whitepaper" being embedded in P2MS outputs in this month.

### Data content type breakdown

With support for the detection, deobfuscation, parsing and interpretation of various protocols implemented in [`data-carry-research`](https://github.com/deadmanoz/data-carry-research), we can consider the type of data that is embedded in P2MS UTXOs.
{@tab:content-types} shows the distribution of detected content types across P2MS transactions and outputs.

| Content Type | Transactions | % of total transactions | Outputs | % of total outputs |
|---|---:|---:|---:|---:|
| application/json | 966,455 | 72.64% | 1,708,561 | 71.83% |
| application/octet-stream | 353,953 | 26.60% | 590,289 | 24.82% |
| image/png | 3,343 | 0.25% | 49,806 | 2.09% |
| image/svg+xml | 133 | 0.01% | 9,681 | 0.41% |
| image/gif | 603 | 0.05% | 9,610 | 0.40% |
| text/plain | 3,018 | 0.23% | 4,105 | 0.17% |
| image/jpeg | 60 | <0.01% | 2,634 | 0.11% |
| application/zlib | 1,062 | 0.08% | 2,144 | 0.09% |
| text/html | 25 | <0.01% | 1,035 | 0.04% |
| image/webp | 19 | <0.01% | 530 | 0.02% |
| image/bmp | 25 | <0.01% | 151 | 0.01% |
| text/x-python | 1 | <0.01% | 23 | <0.01% |
| text/javascript | 2 | <0.01% | 14 | <0.01% |
| application/gzip | 1 | <0.01% | 2 | <0.01% |

Content type distribution across P2MS transactions and outputs as of block height 918,997 (14 October 2025).{#tab:content-types}

Takeaways from this breakdown include:
- The dominant content type is `application/json` (~72%), primarily from the "SRC-20", "SRC-721", and "SRC-101" sub-protocols of Bitcoin Stamps, all of which use JSON-formatted messages.
- Raw binary data (`application/octet-stream`) accounts for ~25%, representing binary data formats like Counterparty, Omni Layer, Chancecoin and PPk.
- Plain text (`text/plain`) represents less than 0.25%, encompassing human-readable messages embedded in P2MS outputs.
- Image formats (`image/png`, `image/svg+xml`, `image/gif`, `image/jpeg`, `image/webp`, `image/bmp`) show significant divergence between transaction and output counts.
PNG images appear in only 3,343 transactions yet span 49,806 outputs, reflecting how images are encoded across many P2MS outputs per transaction.
Collectively, image formats represent approximately 3% of outputs but only 0.31% of transactions.

### Data size breakdown

Given the commentary that appears whenever discussing the UTXO set, another natural question to ask about the P2MS outputs is "what is the data size of the P2MS outputs"? 
At the highest level, we can answer this question by simply considering the full size of each P2MS script.
For example, a "typical" {{green:1-of-3}} P2MS output script with 33-byte compressed public keys has a size of 105 bytes: 

- `OP_1` - 1 byte 
- `OP_PUSHBYTES_33 <33-byte pubkey>` - 1 + 33 bytes
- `OP_PUSHBYTES_33 <33-byte pubkey>` - 1 + 33 bytes
- `OP_PUSHBYTES_33 <33-byte pubkey>` - 1 + 33 bytes
- `OP_3` - 1 byte
- `OP_CHECKMULTISIG` - 1 byte

1 + 33 + 1 + 33 + 1 + 33 + 1 + 1 = 105 bytes.

| M-of-N | Keys | Script size | Outputs | Total Data Size | % of Total |
|---|---|---:|---:|---:|---:|
| {{green:1-of-3}} | CCC | 105 B | 2,123,648 | 223.0 MB | 87.63% |
| {{green:1-of-2}} | CC | 71 B | 177,783 | 12.6 MB | 7.34% |
| {{green:1-of-3}} | CCU | 137 B | 73,426 | 10.1 MB | 3.03% |
| {{green:1-of-3}} | UUU | 201 B | 16,835 | 3.4 MB | 0.69% |
| {{green:1-of-2}} | CU | 103 B | 26,690 | 2.7 MB | 1.10% |
| {{green:2-of-2}} | CC | 71 B | 3,241 | 230 KB | 0.13% |
| {{green:1-of-1}} | U | 69 B | 752 | 52 KB | 0.03% |
| {{green:2-of-3}} | CCC | 105 B | 482 | 51 KB | 0.02% |
| {{green:1-of-2}} | UU | 135 B | 146 | 20 KB | 0.01% |
| {{green:1-of-1}} | C | 37 B | 369 | 14 KB | 0.02% |
| {{green:2-of-3}} | UUU | 201 B | 22 | 4.4 KB | <0.01% |
| {{green:1-of-3}} | CUU | 169 B | 16 | 2.7 KB | <0.01% |
| {{green:3-of-3}} | CCC | 105 B | 20 | 2.1 KB | <0.01% |
| {{green:2-of-2}} | UU | 135 B | 11 | 1.5 KB | <0.01% |
| {{green:2-of-2}} | CU | 103 B | 10 | 1.0 KB | <0.01% |
| {{green:2-of-3}} | CCU | 137 B | 5 | 685 B | <0.01% |
| **Total** | | | **2,423,456** | **252.2 MB** | **100.00%** |

P2MS multisig configurations in the UTXO set showing key combinations, script sizes, and total data footprint. C = compressed keys (33 bytes), U = uncompressed keys (65 bytes).{#tab:multisig-script-sizes}

{@tab:multisig-script-sizes} reveals that the total data size of all P2MS outputs in the UTXO set is 252.2 MB, with {{green:1-of-3}} multisig with compressed keys accounting for 223 MB (87.63%) of this data footprint alone.
Note that the entire UTXO set at block height 918,997 is approximately 11.4 GB in size, meaning P2MS outputs account for ~2.2% of the total UTXO set size, despite only representing 1.46% of the total outputs.

As a point of reference, according to BitMEX Research on [Ordinals - Impact on Node Runners](https://www.bitmex.com/blog/ordinals-impact-on-node-runners), Ordinal images and other data take up around 30GB of blockchain space as of September 2025, with an additional ~27GB used by BRC-20 related transactions.
So the contribution of P2MS outputs to the overall UTXO set size is relatively minor in comparison, though the effectively unspendable nature of much of the P2MS data does raise questions about UTXO set bloat and long-term sustainability.

### Transaction size distribution

While the previous section examined the size of individual P2MS outputs, it's also informative to consider the size of entire transactions that contain P2MS outputs.
Transaction size directly determines block space consumption and, consequently, the fees paid by users of these data-carrying protocols.

{@fig:tx-size-distribution} shows the distribution of transaction sizes across the 1.33 million transactions relating to the unspent P2MS outputs.
The overwhelming majority of transactions (1.17M, or 88%) fall within the 250-500 byte range, reflecting the typical size of P2MS transactions used by Bitcoin Stamps and Counterparty.

:::plot{tx-size-distribution src="/assets/blog/p2ms-data-carry/data/tx_sizes.json"}
:::
Distribution of P2MS transaction sizes, as of block height 918,997 (14 October 2025). {#fig:tx-size-distribution}

### UTXO value breakdown

#### Value distribution

{@fig:value-distribution} shows the distribution of P2MS output values across different ranges, with protocol-specific breakdowns available via the legend. 
This figure reveals the following insights:
- **A mode at 546-1K sats**: 1.82M outputs (75% of all P2MS outputs), almost entirely attributable to Bitcoin Stamps.
This is just above the 546 sat dust threshold, obviously motivated by ensuring transaction standardness while minimising the cost of data embedding.
- **A mode at 5K-10K sats**: a secondary peak of ~402K outputs, dominated by Counterparty transactions.
- **Sub-dust range (0-546 sats) contains 16,861 outputs**: Data Storage accounting for nearly all of them (16,847).
This is explored in the following.

:::plot{value-distribution src="/assets/blog/p2ms-data-carry/data/value_distribution.json"}
:::
P2MS UTXO Value Distribution by protocol and value range {#fig:value-distribution}

#### Dust threshold analysis

The value of UTXOs is relevant in the context of dust limits, as outputs below the dust threshold are non-standard and would not be relayed by most Bitcoin nodes were they to appear in a transaction.
It might seem that the dust limit for P2MS outputs depends on the multisig configuration and key types used, but this is only true for the creation, and not spending, of P2MS outputs.
The following unpacks how Bitcoin Core calculates the dust threshold for outputs; we'll find that the dust threshold to spend P2MS outputs is 546 sats, ing spending to a non-segwit output (e.g., P2PKH), or 294 sats, in spending to a segwit output (e.g., P2WPKH), _**regardless of the multisig configuration or key types used**_.

:::collapse{Bitcoin Core Policy & Dust Threshold Calculation}
Each output is checked whether it is dust via [`IsDust`](https://github.com/bitcoin/bitcoin/blob/a14e7b9dee9145920f93eab0254ce92942bd1e5e/src/policy/policy.cpp#L65), with the output value evaluated against the dust threshold ([`GetDustThreshold`](https://github.com/bitcoin/bitcoin/blob/a14e7b9dee9145920f93eab0254ce92942bd1e5e/src/policy/policy.cpp#L26)). 
Both of these methods require a value for the `dustRelayFeeIn` argument; this is `DUST_RELAY_TX_FEE` which has a current value of 3000 sat/kvB (set [here](https://github.com/bitcoin/bitcoin/blob/a14e7b9dee9145920f93eab0254ce92942bd1e5e/src/policy/policy.h#L64)).

```c++
CAmount GetDustThreshold(const CTxOut& txout, const CFeeRate& dustRelayFeeIn)
{
    // "Dust" is defined in terms of dustRelayFee,
    // which has units satoshis-per-kilobyte.
    // If you'd pay more in fees than the value of the output
    // to spend something, then we consider it dust.
    // A typical spendable non-segwit txout is 34 bytes big, and will
    // need a CTxIn of at least 148 bytes to spend:
    // so dust is a spendable txout less than
    // 182*dustRelayFee/1000 (in satoshis).
    // 546 satoshis at the default rate of 3000 sat/kvB.
    // A typical spendable segwit P2WPKH txout is 31 bytes big, and will
    // need a CTxIn of at least 67 bytes to spend:
    // so dust is a spendable txout less than
    // 98*dustRelayFee/1000 (in satoshis).
    // 294 satoshis at the default rate of 3000 sat/kvB.
    if (txout.scriptPubKey.IsUnspendable())
        return 0;

    size_t nSize = GetSerializeSize(txout);
    int witnessversion = 0;
    std::vector<unsigned char> witnessprogram;

    // Note this computation is for spending a Segwit v0 P2WPKH output (a 33 bytes
    // public key + an ECDSA signature). For Segwit v1 Taproot outputs the minimum
    // satisfaction is lower (a single BIP340 signature) but this computation was
    // kept to not further reduce the dust level.
    // See discussion in https://github.com/bitcoin/bitcoin/pull/22779 for details.
    if (txout.scriptPubKey.IsWitnessProgram(witnessversion, witnessprogram)) {
        // sum the sizes of the parts of a transaction input
        // with 75% segwit discount applied to the script size.
        nSize += (32 + 4 + 1 + (107 / WITNESS_SCALE_FACTOR) + 4);
    } else {
        nSize += (32 + 4 + 1 + 107 + 4); // the 148 mentioned above
    }

    return dustRelayFeeIn.GetFee(nSize);
}
```

As can be observed in the code snippet, `GetDustThreshold` calculates the serialised size of the output and then adds 148 to it, to establish a size for fee calculation.
As the comment suggests, this 148 bytes is an assumption of the size of the `scriptSig` needed to spend the output and represents the spending of a typical P2PKH input:
- 32 bytes: `txid` (references the previous output's transaction)
- 4 bytes: `vout` (index of the output within that transaction)
- 1 byte: `scriptSig` length
- 107 bytes: typical `scriptSig` size, e.g. `OP_PUSHBYTES_72` `<72-byte-sig>` `OP_PUSHBYTES_33` `<33-byte-compressed-key>`
- 4 bytes: `sequence`

Although this fixed input size is used for all non-segwit inputs, it's worth considering what the input size would look like to spend a P2MS output. 
We'd have the common elements of `txid` (32 bytes), `vout` (4 bytes), `scriptSig` length (1 byte), and `sequence` (4 bytes), for 41 bytes. 
The `scriptSig` is where we'd see variation depending on the number of required signatures ({{green:m}}) in the {{green:m-of-n}} multisig configuration. 
Note that there is an `OP_0` dummy element to address the extra stack element consumed by `OP_CHECKMULTISIG` and `OP_CHECKMULTISIGVERIFY`, as per [BIP-147](https://github.com/bitcoin/bips/blob/master/bip-0147.mediawiki), and [[we assume the mid-point 72-bytes for a signature||A DER-encoded signature can be between 71 and 73-bytes]].

| Multisig configuration | `scriptSig` breakdown | `scriptSig` size (bytes) | Total size (bytes) |
|---|---|---:|---:|
| {{green:1-of-n}} | 1 (`OP_0`) + 1 (`OP_PUSHBYTES_72`) + 72 (`<signature>`)) |  74 | 115 |
| {{green:2-of-n}} | 1 (`OP_0`) + 2 * (1 (`OP_PUSHBYTES_72`) + 72 (`<signature>`)) |  147 | 188 |
| {{green:3-of-n}} | 1 (`OP_0`) + 3 * (1 (`OP_PUSHBYTES_72`) + 72 (`<signature>`)) |  220 | 261 |

As for a serialised P2MS output, we would have something like the following in the typical case (involving compressed public keys):
- 8 bytes: `amount`
- 1 byte: `scriptPubKey` length
- 1 byte: `OP_m`, for the {{green:m}} in {{green:m-of-n}}
- 34 * {{green:n}} bytes: {{green:n}} * (1 (`OP_PUSHBYTES_33`) + 33 (`<33-byte-compressed-key>`))
- 1 byte: `OP_n`, for the {{green:n}} in {{green:m-of-n}}
- 1 byte: `OP_CHECKMULTISIG`

Because the dust threshold is calculated based on the total size of the output plus an assumed fixed size of 148 bytes for the input, the dust threshold only depends on {{green:n}}, the number of keys in the multisig configuration, and NOT on {{green:m}}, the number of required signatures.

| Multisig configuration | Output size (vbytes) | `nSize` (vbytes) | Dust Threshold (sats) |
|---|---:|---:|---:|
| {{green:m-of-1}} | 46 | 194 | 582 |
| {{green:m-of-2}} | 80 |  228 | 684 |
| {{green:m-of-3}} | 114 |  262 | 786 |

When spending P2MS UTXOs, the minimum output value **is determined by the destination output type**—546 sats for P2PKH or 294 sats for P2WPKH—regardless of the P2MS configuration being spent.
This is because the dust threshold calculation uses the fixed 148-byte input size assumption.
For example, spending a P2MS UTXO to create a P2PKH output requires the P2MS UTXO to have sufficient value to cover the 546 sat minimum plus transaction fees.

:::

Having established the theoretical dust thresholds, we can now examine how many P2MS outputs actually fall below these thresholds. {@tab:dust-analysis} shows the breakdown by protocol.

| Protocol | Total | <294 sats | <546 sats | ≥546 sats |
|---|---:|---:|---:|---:|
| Bitcoin Stamps | 1,782,916 | 0 (0%) | 0 (0%) | 1,782,916 (100%) |
| Counterparty | 553,981 | 0 (0%) | 0 (0%) | 553,981 (100%) |
| Omni Layer | 43,077 | 3 (0%) | 3 (0%) | 43,074 (100%) |
| Data Storage | 28,831 | 16,847 (58%) | 16,847 (58%) | 11,984 (42%) |
| Chancecoin | 5,051 | 0 (0%) | 0 (0%) | 5,051 (100%) |
| PPk | 4,728 | 0 (0%) | 0 (0%) | 4,728 (100%) |
| Likely Data Storage | 2,152 | 10 (<1%) | 10 (<1%) | 2,142 (99%) |
| OP_RETURN Signalled | 1,352 | 1 (0%) | 1 (0%) | 1,351 (100%) |
| ASCII Identifier Protocols | 816 | 0 (0%) | 0 (0%) | 816 (100%) |
| Likely Legitimate Multisig | 552 | 0 (0%) | 0 (0%) | 552 (100%) |
| **Total** | **2,423,456** | **16,861 (0.7%)** | **16,861 (0.7%)** | **2,406,595 (99.3%)** |

Dust threshold analysis of P2MS UTXOs as of block height 918,997 (14 October 2025).{#tab:dust-analysis}

The results reveal that 99.3% of P2MS outputs are at or above the 546 sat threshold, meaning they are not considered dust for spending purposes.
Only 16,861 outputs (0.7%) fall below the dust threshold, and notably all of these are below 294 sats (dust for all destination types).

The Data Storage category is the clear outlier, with 58% of its outputs (16,847) below the dust threshold.
These sub-dust outputs largely correspond to the data embedding efforts of 2013.

### Fee breakdown

Beyond the value locked in P2MS outputs, users have paid substantial transaction fees to embed data using this script type. {@tab:fee-breakdown} shows the total fees paid by each protocol classification, for all transactions creating unspent P2MS outputs.

| Protocol | Fees (BTC) | % of Total | Avg Fee/TX (sats) | Avg Fee/Byte (sat/byte) |
|---|---:|---:|---:|---:|
| Bitcoin Stamps | 218.50505161 | 77.67% | 22,529 | 61.06 |
| Counterparty | 47.58227325 | 16.91% | 15,669 | 32.64 |
| Omni Layer | 8.87842992 | 3.16% | 21,884 | 48.74 |
| Data Storage | 5.54695739 | 1.97% | 105,195 | 29.17 |
| Likely Data Storage | 0.22754496 | 0.08% | 18,837 | 23.80 |
| ASCII Identifier Protocols | 0.14692917 | 0.05% | 21,703 | 51.78 |
| Likely Legitimate Multisig | 0.14583943 | 0.05% | 27,832 | 80.91 |
| Chancecoin | 0.11400933 | 0.04% | 4,307 | 10.36 |
| OP_RETURN Signalled | 0.08389254 | 0.03% | 6,251 | 15.54 |
| PPk | 0.06092428 | 0.02% | 1,295 | 3.75 |
| **Total** | **281.29185188** | **100%** | **21,143** | |

Fee breakdown of P2MS UTXOs by protocol classification as of block height 918,997 (14 October 2025).{#tab:fee-breakdown}

Bitcoin Stamps dominates fee expenditure at 218.5 BTC (77.7% of all P2MS-related fees), reflecting both its transaction volume and its emergence during higher fee environments in 2023.
{@fig:stamps-weekly-fees} shows the weekly distribution of Bitcoin Stamps fees since the protocol's launch.

:::alert{info}
**{{cyan:Over 281 BTC has been spent on transaction fees to embed data in P2MS outputs, with Bitcoin Stamps accounting for ~78%.}}**
:::

The Data Storage category shows the highest average fee per transaction at 107,034 sats due to the larger transaction sizes required for bulk data embedding (e.g., "WikiLeaks Cablegate" files, "Bitcoin Whitepaper").
Conversely, PPk transactions paid the lowest fees at just 1,295 sats average, a result of both the protocol's age (operating during lower fee periods) and its small payload sizes.

## P2MS UTXOs by protocol/use
The following sections provide deeper analysis of the major protocols, including covering the various sub-protocols or variants where applicable.
If you don't care for the details, e.g., of the various Counterparty or Omni message types, I recommend just reading the Bitcoin Stamps section immediately following, and then skip ahead to the [summary section - "What to make of all this?"](#what-to-make-of-all-this).

### Bitcoin Stamps
As briefly covered in [Part 1](./p2ms-data-carry-1#bitcoin-stamps-sub-protocols), the primary indicator of a Bitcoin Stamp is the presence of designated "Key Burn" in the third pubkey position of a {{green:1-of-3}} multisig.
In the classification system, after Key Burn detection, data is extracted from the first two pubkeys and ARC4-decrypted using the first input's txid as the key.
The decrypted payload must contain a `stamp:` (or variant) signature to confirm validity.

Variant classification then proceeds in priority order: compressed data (ZLIB/GZIP) is identified first, followed by image formats (PNG, GIF, JPEG, WebP, SVG, BMP, PDF) which constitute the "Classic" variant.
JSON payloads are parsed for protocol markers such as `"p":"src-20"` ("SRC-20" - fungible tokens), `"p":"src-721"` ("SRC-721" - non-fungible tokens) and `"p":"src-101"` ("SRC-101" - naming service). HTML documents and generic binary data fall into subsequent categories. 

The system also distinguishes between "Pure" Bitcoin Stamps (direct P2MS encoding) and those embedded within Counterparty transport, which exhibit both `CNTRPRTY` and `stamp:` signatures in the decrypted payload.

{@tab:stamps-variants} shows the composition of P2MS outputs associated with Bitcoin Stamps in the UTXO set.

| Variant | Transactions | P2MS outputs | Avg outputs/TX | % of total outputs |
|---|---:|---:|---:|---:|
| SRC-20| 933,026 | 1,604,238 | 1.72 | 89.98% |
| SRC-721 | 29,289 | 88,550 | 3.02 | 4.97% |
| Classic (images) | 4,181 | 72,243 | 17.28 | 4.05% |
| SRC-101 | 2,135 | 13,767 | 6.45 | 0.77% |
| Compressed | 1,059 | 2,134 | 2.02 | 0.12% |
| HTML | 25 | 1,035 | 41.40 | 0.06% |
| Data | 82 | 820 | 10.00 | 0.05% |
| Unknown | 71 | 129 | 1.82 | 0.01% |
| **Total** | **969,868** | **1,782,916** | **1.84** | **100.00%** |

Bitcoin Stamps sub-protocol composition as of block height 918,997 (14 October 2025).{#tab:stamps-variants}

"SRC-20" tokens dominate at ~90% of Bitcoin Stamps P2MS outputs, reflecting the protocol's primary use for "fungible token operations". "SRC-20" is a JSON-only protocol, so all "SRC-20" P2MS outputs contain JSON data like the following (as decoded in [Part 1](./p2ms-data-carry-1#data-carrying-in-p2ms-a-bitcoin-stamps-example)):
```json
stamp: {
	"p":"src-20",
	"op":"transfer",
	"tick":"BMWK",
	"amt":"1000"
}
```

"SRC-721", accounting for ~5% of Bitcoin Stamps P2MS outputs, is also JSON-only, as is "SRC-101" (~0.8% of outputs).
With "SRC-20", "SRC-721", and "SRC-101" all being JSON-based, the vast majority of Bitcoin Stamps P2MS outputs contain JSON data, explaining why `application/json` dominates the overall content type distribution at 72.64% (as covered in the [content type breakdown](#data-content-type-breakdown)).

"Classic Stamps", the original Bitcoin Stamps protocol that encodes images directly into P2MS outputs, accounts for ~4% of Bitcoin Stamps P2MS outputs.
Approximately 4,200 images, predominantly PNGs and GIFs have been embedded using "Classic Stamps", though there are many more images stored on-chain by Bitcoin Stamps using other techniques and script types such as OLGA and P2TR.

**"Classic Stamps"**:
- PNG images: 3,342 (80%)
- GIF animations: 603 (14%)
- SVG graphics: 130 (3%)
- JPEG images: 60 (1%)
- Other formats: 44 (1%)

Bitcoin Stamps utilises two distinct transport mechanisms, as summarised in {@tab:stamps-transport}.
Counterparty was the original transport layer for Bitcoin Stamps, but given the significant overhead, a native Bitcoin Stamps transport mechanism was later developed and introduced.
The overheads of Counterparty were explored in [Part 1](./p2ms-data-carry-1#summarising-the-main-techniques).

| Transport Method | Transactions | Percentage |
|---|---:|---:|
| Counterparty | 78,263 | 8.1% |
| "Pure" Bitcoin Stamps | 891,605 | 91.9% |

Bitcoin Stamps transport mechanism breakdown.{#tab:stamps-transport}

Despite the relatively low value locked in outputs (14.19 BTC), Bitcoin Stamps users have demonstrated their willingness to pay for the "permanence guarantee".
For example, with the protocol having emerged during the 2023 Ordinals/Inscriptions hype, the fact that 
people chose to use Bitcoin Stamps over Ordinals/Inscriptions can perhaps be seen as a preference for permanence over lower cost.

Although the average value per Bitcoin Stamps P2MS output is just 796 sats ({@tab:stamps-economics}), with the average size of a Classic Stamp being 17.32 outputs per transaction ({@tab:stamps-variants}), the average cost per Classic Stamp transaction is ~13,787 sats just for the outputs alone, plus transaction fees.
On the matter of fees, Bitcoin Stamps users have paid approximately 218.50 BTC in transaction fees to embed data using P2MS outputs since the protocol's inception.

| Metric | Value |
|---|---:|
| Total BTC in P2MS outputs | ~14.19 BTC |
| Average value per output | 796 sats |
| Minimum value | 546 sats (dust limit) |
| Maximum value | 7,800 sats |
| Total fees paid | ~218.50 BTC |

Economic metrics for Bitcoin Stamps P2MS outputs.{#tab:stamps-economics}

:::plot{stamps-weekly-fees src="/assets/blog/p2ms-data-carry/data/stamps_weekly_fees.json" annotations="/assets/blog/bitcoin-timeline.json" annotationIds="bitcoin-stamps-launch"}
:::
Bitcoin Stamps weekly fee expenditure from protocol inception (April 2023) through October 2025. The average sats/vbyte trace (green) is available via the legend. {#fig:stamps-weekly-fees}

{@fig:stamps-weekly-fees} shows the weekly distribution of these fees over time.
The chart displays total weekly fees (bars) alongside average fee per transaction (blue line) on a secondary axis.

This data reveals:
- **Peak activity in late 2023**: Weekly fees peaked at over 51 BTC during the week of 14 December 2023, coinciding with broader network congestion and high demand for block space (see {@fig:mempool-3y}).
During this period, average fees per transaction reached approximately 167,500 sats ([[~US$70 at the time!||The price of Bitcoin was ~US$43K]]).
- **Majority of fees paid over a handful of weeks**: ~66% of all Bitcoin Stamps fees were paid during just 10 weeks between November 2023 and February 2024, so simply considering the total fees paid can be misleading without temporal context.

![Figure: Bitcoin mempool size (in MvB) from November 2022 to November 2025, showing periods of elevated congestion. From [mempool.space](https://mempool.space/graphs/mempool#3y)](/assets/blog/p2ms-data-carry/mempool-graph-3y-1764302242.svg){#fig:mempool-3y}

The "Stamp" in Bitcoin Stamps is (presumably) a backronym: Secure Tradeable Artifacts Maintained Permanently.
And the original motivation was [_"Storing 'Art on the Blockchain' as a method of achieving permanence"_](https://github.com/mikeinspace/stamps/blob/main/BitcoinStamps.md).
Yet we've seen that the dominant use case for Bitcoin Stamps is fungible token operations ("SRC-20"), which arguably diverges from the original intent of "art".

{@fig:stamps-variant-temporal} explores how the distribution of Bitcoin Stamps variants (those utilising P2MS) has evolved over time.
It's clear that the "art" use case ("Classic Stamps") has not been seen since March 2024, with only "SRC-20" and "SRC-101" seeing use in 2025.
This is important context if one were to consider if the continued use of P2MS outputs by Bitcoin Stamps is justified, especially given their deliberately unspendable design.
This is discussed further in the [summary section](#what-to-make-of-all-this).

:::plot{stamps-variant-temporal src="/assets/blog/p2ms-data-carry/data/stamps_variant_temporal.json"}
:::
Weekly distribution of Bitcoin Stamps variants by output count. {#fig:stamps-variant-temporal}

### Counterparty

Counterparty is the second largest contributor to P2MS outputs in the UTXO set, accounting for ~23% of all such outputs. 
Unlike Bitcoin Stamps' deliberately unspendable outputs, every Counterparty P2MS output contains, in theory, at least one valid public key, ensuring spendability and avoiding permanent UTXO set inclusion.
~35.86 BTC is currently locked in Counterparty P2MS outputs.

The 8-byte `CNTRPRTY` prefix identifies Counterparty messages after successful ARC4 decryption (again, the full process has been explored in [Part 1](./p2ms-data-carry-1#counterparty)).
Although there are 20+ different Counterparty protocol message types, they have been consolidated into 7 semantically meaningful high-level variants for the purposes of analysis:
1. **Counterparty Issuance** - Issuance, Fair Minter, Fair Mint
2. **Counterparty Transfer** - Send, Enhanced Send, Multi-Party, Multi-Asset (MPMA), Sweep, Dividend
3. **Counterparty DEX** - Decentralised Exchange: Order, BTC Pay, Dispenser, Cancel
4. **Counterparty Oracle** - Broadcast
5. **Counterparty Gaming** - Bet, Rock-Paper-Scissors (RPS), RPS Resolve
6. **Counterparty Utility** - UTXO, Attach, Detach
7. **Counterparty Destruction** - Asset destruction: Destroy, Burn

| Variant | Transactions | P2MS Outputs | Description |
|---------|-------------:|-------------:|-------------|
| Counterparty Transfer | 188,423 | 195,174 | Token transfers between addresses |
| Counterparty Issuance | 72,835 | 283,160 | Creating new tokens/assets |
| Counterparty DEX | 33,298 | 52,542 | Decentralised exchange operations |
| Counterparty Oracle | 7,811 | 20,293 | Price feeds and data broadcasts |
| Counterparty Gaming | 1,242 | 2,519 | Betting and game-related operations |
| Counterparty Utility | 60 | 263 | UTXO management (attach/detach) |
| Counterparty Destruction | 8 | 30 | Burning/destroying tokens |
| **Total** | **303,677** | **553,981** | |

Breakdown of Counterparty variants observed in P2MS UTXOs, as of block height 918,997 (14 October 2025).{#tab:counterparty-variants}

Counterparty uses two primary multisig configurations:
- {{green:1-of-3}}: 72.10% of outputs
- {{green:1-of-2}}: 27.79% of outputs

The remaining configurations ({{green:2-of-2}}, {{green:2-of-3}}, {{green:3-of-3}}) account for 0.11% of all Counterparty P2MS UTXOs.


### Omni
Omni is a distant third in terms of P2MS UTXO contribution, accounting for ~1.8% of all such outputs.
Similar to Counterparty, every Omni P2MS output contains at least one valid public key, ensuring spendability and avoiding permanent UTXO set inclusion.
All 43,077 Omni P2MS outputs are spendable and ~2.32 BTC is currently locked in Omni P2MS outputs.

Omni transactions are identified by the presence of the Exodus address ([`1EXoDusj...`](https://mempool.space/address/1EXoDusjGwvnjZUyKkxZ4UHEf77z6A5S4P)) as a transaction output.
Once the Exodus address is confirmed, the Omni payload is extracted from the P2MS outputs using the process described in [Part 1](./p2ms-data-carry-1#omni-formerly-mastercoin).
If deobfuscation is not successful, the transaction and P2MS outputs are marked as "Omni Failed Deobfuscation", otherwise the message type is parsed and classified accordingly.

Like Counterparty, Omni has 20+ message types, which can be consolidated into a smaller number of high-level variants for analysis:
1. **Omni Transfer** - SimpleSend, RestrictedSend, SendAll, SendNonFungible (types 0, 2, 4, 5)
2. **Omni Issuance** - CreatePropertyFixed, CreatePropertyVariable, PromoteProperty, CreatePropertyManual, GrantPropertyTokens (types 50, 51, 52, 54, 55)
3. **Omni DEX** - TradeOffer, AcceptOfferBTC, MetaDEXTrade, MetaDEXCancelPrice, MetaDEXCancelPair, MetaDEXCancelEcosystem (types 20, 22, 25-28)
4. **Omni Failed Deobfuscation** - Exodus address present but deobfuscation failed
5. **Omni Destruction** - RevokePropertyTokens (type 56)
6. **Omni Administration** - CloseCrowdsale, ChangeIssuerAddress, EnableFreezing, DisableFreezing, FreezePropertyTokens, UnfreezePropertyTokens (types 53, 70, 71, 72, 185, 186)
7. **Omni Distribution** - SendToOwners (type 3)

| Variant | Transactions | Outputs | Description |
|---------|-------------:|--------:|-------------|
| Omni Transfer | 37,421 | 37,432 | Token transfers between addresses |
| Omni Issuance | 1,198 | 3,689 | Creating new tokens/assets |
| Omni DEX | 1,857 | 1,857 | Decentralized exchange operations |
| Omni Failed Deobfuscation | 52 | 56 | Transactions that couldn't be decoded |
| Omni Destruction | 24 | 24 | Burning/destroying tokens |
| Omni Administration | 17 | 17 | Token management operations |
| Omni Distribution | 2 | 2 | Dividend/airdrop distributions |
| **Total** | **40,571** | **43,077** | |

Breakdown of Omni variants observed in P2MS UTXOs, as of block height 918,997 (14 October 2025).{#tab:omni-variants}

Omni primarily uses the {{green:1-of-2}} multisig configuration, accounting for 90.16% of outputs, with the remaining 9.83% using {{green:1-of-3}} (though there are 2 Omni UTXOs that use the odd {{green:1-of-1}} configuration).

### Chancecoin

Chancecoin was a gambling-focused protocol that operated on Bitcoin from 2014-2015, using P2MS outputs for its message encoding.
Like Counterparty and Omni, Chancecoin maintains at least one valid public key per output, ensuring spendability.
~0.15 BTC remains locked in Chancecoin P2MS outputs, all of which appears spendable.

Chancecoin message types can be consolidated into the following variants:
1. **Chancecoin Roll** - Dice roll results (ID 14)
2. **Chancecoin Bet** - Gambling bets (ID 40/41)
3. **Chancecoin Send** - Token transfers (ID 0)
4. **Chancecoin Order** - DEX order placement (ID 10)
5. **Chancecoin Cancel** - Order cancellation (ID 70)
6. **Chancecoin BTCPay** - BTC payment for DEX trades (ID 11)

| Variant | Transactions | Outputs | Description |
|---------|-------------:|--------:|-------------|
| Chancecoin Roll | 1,912 | 3,824 | Dice roll results |
| Chancecoin Bet | 368 | 736 | Gambling bets placed |
| Chancecoin Send | 252 | 252 | Token transfers between addresses |
| Chancecoin Order | 65 | 130 | DEX order placement |
| Chancecoin Cancel | 41 | 82 | Order cancellation |
| Chancecoin BTCPay | 9 | 27 | BTC payment for DEX trades |
| **Total** | **2,647** | **5,051** | |

Breakdown of Chancecoin variants observed in P2MS UTXOs, as of block height 918,997 (14 October 2025).{#tab:chancecoin-variants}

Chancecoin exclusively uses the {{green:1-of-2}} multisig configuration (100% of outputs).

### PPk

PPk was a decentralised identity and naming protocol that operated on Bitcoin, using P2MS and `OP_RETURN` outputs for message encoding.
PPk aimed to provide a decentralised alternative to DNS and digital identity systems.

PPk transactions are identified by a distinctive marker pubkey (`0320a0de...3e12`) that must appear in the second position of a P2MS output.
Once detected, variant classification examines the combined P2MS and `OP_RETURN` data:
- **PPk Profile**: transactions carry JSON payloads using a "RT" (Resource Tag) and a type–length–value (TLV) structure
- **PPk Registration**: transactions contain quoted numeric strings like "315"
- **PPk Message**: transactions contain promotional text with "PPk" substrings or ≥80% printable ASCII
- **PPk Unknown**: Unrecognised PPk message types that don't fit the above patterns.

| Variant | Transactions | Outputs | Description |
|---------|-------------:|--------:|-------------|
| PPk Message | 2,031 | 2,051 | General protocol messages |
| PPk Profile | 2,003 | 2,003 | Identity/profile data storage |
| PPk Unknown | 478 | 480 | Unrecognised PPk message types |
| PPk Registration | 194 | 194 | Name/identity registration |
| **Total** | **4,706** | **4,728** | |

Breakdown of PPk variants observed in P2MS UTXOs, as of block height 918,997 (14 October 2025).{#tab:ppk-variants}

PPk uses two multisig configurations:
- {{green:1-of-3}}: 70.43% of outputs
- {{green:1-of-2}}: 29.57% of outputs

All 4,728 PPk P2MS outputs appear spendable and only a small amount of value, ~0.05 BTC, is locked in them.

### OP_RETURN Signalled

The OP_RETURN Signalled classification captures transactions where an `OP_RETURN` output contains a protocol identifier, but the transaction also includes P2MS outputs.
Often the `OP_RETURN` serves as a protocol identifier, with P2MS outputs providing additional data capacity for the protocol's payload.

| Variant | Transactions | Outputs | Description |
|---------|-------------:|--------:|-------------|
| Protocol47930 | 742 | 742 | Unknown protocol with identifier `47930` |
| Generic ASCII | 362 | 372 | ASCII text identifiers without known protocol mapping |
| `CLIPPERZ` | 238 | 238 | Clipperz password manager backup protocol |
| **Total** | **1,342** | **1,352** | |

Breakdown of OP_RETURN Signalled variants observed in P2MS UTXOs, as of block height 918,997 (14 October 2025).{#tab:opreturn-signalled-variants}

The largest category is "Protocol47930" (54.9%), representing transactions featuring the `0xbb3a` marker (47930 in decimal).
"Generic ASCII" (27.5%) captures various ASCII-based identifiers that don't match known protocols, examples include `CC` (138 outputs), `8EC=` (104 outputs) and `DEVCHA` (30 outputs).
"CLIPPERZ" (17.6%) corresponds to the [Clipperz](https://clipperz.is/) open-source password manager, which at some point in the past seems to have used Bitcoin as a backup storage feature.

Unlike dedicated data-carrying protocols, OP_RETURN Signalled transactions show an odd mix of multisig configurations:
- {{green:2-of-2}}: 84.1% of outputs
- {{green:1-of-2}}: 10.8% of outputs
- {{green:1-of-3}}: 4.6% of outputs

The prevalence of {{green:2-of-2}} configurations (rather than the {{green:1-of-n}} patterns typical of data-carrying protocols) is notable, since these require multiple valid signatures to spend.
Analysis of EC-point validity shows that 92.53% of these OP_RETURN Signalled P2MS outputs are actually spendable, with ~0.11 BTC currently locked across all OP_RETURN Signalled P2MS outputs.

### ASCII Identifier Protocols

The ASCII Identifier Protocols classification captures P2MS transactions where the embedded data begins with a recognisable ASCII string identifier.
That is, the ASCII string identifier is in the P2MS data (as opposed to OP_RETURN Signalled where the identifier is in the `OP_RETURN` output).
These represent various experimental or short-lived protocols that used P2MS for data storage.

| Variant | Transactions | P2MS Outputs | Description |
|---------|-------------:|-------------:|-------------|
| `TB0001` | 323 | 342 | Unknown protocol with `TB0001` identifier |
| `METROXMN` | 158 | 181 | Associated with Metronotes XMN |
| `TEST01` | 175 | 179 | Transactions with `TEST01` marker |
| Other ASCII Protocol | 21 | 114 | Various other ASCII-prefixed data |
| **Total** | **677** | **816** | |

Breakdown of ASCII identifier protocol variants observed in P2MS UTXOs, as of block height 918,997 (14 October 2025).{#tab:ascii-identifier-variants}

`TB0001` (41.9%) is the most common variant, though the protocol's purpose remains unidentified. `METROXMN` (22.2%) is associated with [Metronotes XMN](https://bitcointalk.org/index.php?topic=974486.0), which appears to be a scam. `TEST01` (21.9%) likely represents testing activity during protocol development or experimentation.
The "Other ASCII Protocol" category (14.0%) is almost entirely `NEWBCOIN` (113 of 114 outputs), an unknown protocol from late 2014.
Approximately half of the `NEWBCOIN` transactions (11 of 20) embed gzip-compressed data across multiple P2MS outputs per transaction (9–10 outputs each), while the remainder are single-output transactions without compression.
The single non-`NEWBCOIN` output is `PRVCY` from March 2015.

ASCII Identifier Protocols use two multisig configurations:
- {{green:1-of-2}}: 63.24% of outputs
- {{green:1-of-3}}: 36.76% of outputs

All 816 ASCII Identifier Protocols P2MS outputs are spendable.

### Data Storage

The Data Storage classification captures P2MS transactions where embedded data does not match any known protocol identifier or pattern.
These represent direct data embedding without protocol structure or ASCII identifiers.

The classifier searches for known file signatures (PNG, JPEG, GIF, PDF, ZIP, RAR, GZIP, ZLIB, TAR, and others) via magic byte detection, as well as text content analysis.
However, in practice, the vast majority of data storage outputs contain generic binary or text data without recognisable file signatures; the only file format detected with any frequency is ZLIB-compressed data (90 outputs).
This suggests that early data embedders typically stored raw text, compressed archives, or custom binary formats rather than standard file types like images or PDFs.

Additionally, the classifier identifies proof-of-burn patterns (such as all `0xFF` or `0x00` byte pubkeys, or other unspendable patterns) and file metadata patterns (URLs, filenames, archive extensions).

| Variant | Transactions | Outputs | Description |
|---------|-------------:|--------:|-------------|
| WikiLeaks Cablegate | 134 | 13,362 | Diplomatic cables from the WikiLeaks release |
| Embedded Data | 1,130 | 10,513 | Generic embedded data |
| Proof of Burn | 4,004 | 4,004 | Outputs used for proof-of-burn mechanisms |
| Bitcoin Whitepaper | 1 | 946 | Satoshi's Bitcoin whitepaper PDF |
| File Metadata | 3 | 5 | File metadata or headers embedded in outputs |
| Null Data | 1 | 1 | Outputs containing null/empty data patterns |
| **Total** | **5,273** | **28,831** | |

Breakdown of Data Storage variants observed in P2MS UTXOs, as of block height 918,997 (14 October 2025).{#tab:data-storage-variants}

The "WikiLeaks Cablegate" files dominate this category at 46.3%, representing diplomatic cables embedded across thousands of P2MS outputs.
As explored in [Part 1](./p2ms-data-carry-1#generic-data-storage), this is one of the most famous examples of data storage in P2MS, alongside the Bitcoin whitepaper PDF, which itself was also embedded in April 2013 across 946 P2MS outputs (3.3%).
"Embedded Data" (36.5%) captures various other data embedding efforts.
"Proof of Burn" (13.9%) represents outputs created specifically to demonstrate destruction of bitcoin value.

Data Storage shows diverse multisig configurations, reflecting its ad-hoc nature:
- {{green:1-of-3}}: 80.84% of outputs
- {{green:1-of-2}}: 15.92% of outputs
- {{green:2-of-2}}: 1.45% of outputs
- {{green:1-of-1}}: 1.28% of outputs
- {{green:2-of-3}}: 0.48% of outputs
- {{green:3-of-3}}: 0.04% of outputs

Only 33.29% of Data Storage P2MS outputs are spendable, with the majority (66.71%) being unspendable due to all keys being used for data carriage or proof-of-burn patterns. ~10.18 BTC is currently locked in Data Storage P2MS outputs.

### Likely Data Storage

The Likely Data Storage classification captures P2MS transactions that exhibit characteristics suggesting data storage but lack definitive protocol identifiers or clear data patterns.
Unlike Data Storage (which has confirmed data patterns), Likely Data Storage represents a heuristic-based classification where characteristics such as dust-level values, high output counts, or invalid public keys indicate probable data carriage.

| Variant | Transactions | Outputs | Description |
|---------|-------------:|--------:|-------------|
| Dust Amount | 1,133 | 1,367 | Outputs with dust-level values suggesting data storage |
| High Output Count | 67 | 776 | Transactions with many P2MS outputs suggesting bulk data embedding |
| Invalid EC Point | 8 | 9 | Outputs containing keys that are not valid EC points |
| **Total** | **1,208** | **2,152** | |

Breakdown of Likely Data Storage variants observed in P2MS UTXOs, as of block height 918,997 (14 October 2025).{#tab:likely-data-storage-variants}

The dominant variant is "Dust Amount" (63.52%), capturing outputs where the encumbered value is less than 1000 sats.
"High Output Count" (36.06%) identifies transactions that feature 5+ P2MS outputs, a pattern perhaps indicative of bulk data embedding rather than normal multisig usage.
"Invalid EC Point" (0.42%) represents outputs where at least one pubkey is provably not a valid point on the secp256k1 curve, again indicative of data carrying rather than legitimate multisig.

The Likely Data Storage has the following multisig configuration profile:
- {{green:2-of-2}}: 39.68% of outputs
- {{green:1-of-1}}: 32.39% of outputs
- {{green:1-of-3}}: 13.89% of outputs
- {{green:2-of-3}}: 13.52% of outputs
- {{green:1-of-2}}: 0.51% of outputs

This distribution is notably different from both Data Storage (e.g., 80.84% {{green:1-of-3}}) and established data-carrying protocols.
Specifically, {{green:2-of-2}} at 39.68% is more commonly associated with legitimate multisig arrangements as opposed to data carriage.

99.86% of Likely Data Storage P2MS outputs are spendable, with only 3 outputs being unspendable.
~0.03 BTC is currently locked in Likely Data Storage outputs.

### Likely Legitimate Multisig

The Likely Legitimate Multisig classification represents P2MS outputs that appear to be genuine multisig arrangements for securing funds rather than data carriage.
These outputs exhibit characteristics consistent with legitimate multisig usage: valid public keys, reasonable value amounts, and multisig configurations that make practical sense for custody arrangements (valid EC point keys).

| Variant | Transactions | Outputs | Description |
|---------|-------------:|--------:|-------------|
| Legitimate Multisig | 512 | 540 | Standard multisig outputs with valid keys and reasonable values |
| Legitimate Multisig (Null-Padded) | 7 | 7 | Multisig outputs with null-padded public keys |
| Legitimate Multisig (Duplicate Keys) | 5 | 5 | Multisig outputs containing duplicate public keys |
| **Total** | **524** | **552** | |

Breakdown of Likely Legitimate Multisig variants observed in P2MS UTXOs, as of block height 918,997 (14 October 2025).{#tab:likely-legitimate-multisig-variants}

The vast majority (97.8%) are standard legitimate multisig outputs.
The "Null-Padded" variant (1.3%) represents outputs where public keys contain null padding, potentially indicating older wallet software or non-standard key generation.
"Duplicate Keys" (0.9%) captures the unusual case where the same public key appears multiple times in a multisig script, which while technically valid, suggests implementation bugs.

Likely Legitimate Multisig shows the most diverse multisig configuration profile of any classification:
- {{green:2-of-2}}: 41.30% of outputs
- {{green:1-of-2}}: 25.00% of outputs
- {{green:2-of-3}}: 12.68% of outputs
- {{green:1-of-3}}: 11.41% of outputs
- {{green:1-of-1}}: 9.60% of outputs

All 552 Likely Legitimate Multisig P2MS outputs are spendable (100%), as would be expected.
The total value locked in these outputs is approximately 6.50 BTC which accounts for ~9.4% of the total value encumbered in P2MS outputs.
This gives an average value of ~0.12 BTC (e.g., 1.2 million sats) per output, which is orders of magnitude higher than Bitcoin Stamps (796 sats) or other data-carrying protocols, clearly a reflection of their use to secure holdings rather than store data.

The fact that only 552 outputs (0.02% of all P2MS UTXOs) appear to represent legitimate multisig usage underscores how completely P2MS has been co-opted for data carriage purposes.

## What to make of all this?

The objective of this analysis has been to present comprehensive data on P2MS usage as observed from P2MS outputs in the UTXO set.
The findings are stark: over 99.98% of P2MS UTXOs serve data embedding protocols, 74.37% are provably unspendable, and just 0.02% (552 of 2.4M outputs) appear to represent legitimate multisig usage.
This represents a fundamental departure from the script type's intended purpose of enabling multisig custody arrangements and is largely driven by one protocol: Bitcoin Stamps.

### P2MS usage over time

Though the content here is centred on P2MS UTXOs, it would be remiss to not consider the totality of P2MS usage, including P2MS outputs that have already been spent.
{@fig:cumulative-p2ms} shows the cumulative number of P2MS outputs created (purple line) versus the cumulative number of P2MS inputs spent (blue line) over time.

Of the ~2.71M P2MS outputs created through to 14 October 2025, approximately 288K have ever been spent as inputs, yielding a spend rate of just 10.6%.
Only ~8% of the spent P2MS outputs were spent in the last ~6 years, with the remaining ~92% having been spent in the ~8 years prior (2012–2020).
Since Bitcoin Stamps launched, the creation of P2MS outputs has vastly outpaced their spending, leading to a growing accumulation of P2MS outputs in the UTXO set.

:::plot{cumulative-p2ms src="/assets/blog/p2ms-data-carry/data/cumulative-p2ms-outputs.json"}
:::
Cumulative P2MS inputs (spent) and outputs (created) over time. The dramatic divergence since Bitcoin Stamps launched in early 2023 illustrates that P2MS outputs are being created far faster than they are being spent. Data sourced from [mainnet.observer](https://mainnet.observer). {#fig:cumulative-p2ms}

### Bitcoin Stamps permanence

When Bitcoin Stamps launched in early 2023, its creators justified using P2MS on the grounds of permanence and "art": art encoded in deliberately unspendable outputs would remain in the UTXO set indefinitely.
This rationale was controversial, with objection to deliberate UTXO set pollution, but the protocol forged ahead regardless.

It is true that different data carriage techniques offer different persistence guarantees.
Witness data, used by Ordinals/Inscriptions, is not part of the UTXO set and can be pruned by full nodes running in pruned mode.
`OP_RETURN` outputs are provably unspendable and [[never enter the UTXO set||Bitcoin Core skips `OP_RETURN` outputs when building the UTXO set since they can never be spent. The data persists only in block storage, which pruned nodes discard.]].
P2MS outputs, however, must be retained by all full nodes because they *might* be spendable - a node cannot know whether a given public key has a corresponding private key.

Bitcoin Stamps exploits this property by deliberately creating P2MS outputs that are unspendable but appear potentially spendable to the network.
By using invalid Key Burn keys alongside data-carrying keys, Bitcoin Stamps ensures its data remains in the UTXO set of every full node indefinitely.
Each unspendable output adds to the UTXO set size that every [[full node||Nodes that _don't_ need the UTXO set are light clients and experimental Utreexo nodes.]] (archival and pruned) must maintain in fast-access memory.
This is a cost imposed on the entire network.

However, the "permanence guarantee" offered by UTXO set storage is overstated.
While pruned nodes discard block data (including `OP_RETURN` outputs), over 90% of Bitcoin full nodes ([as of late 2025]((https://bitnodes.io/nodes/))) run in archival mode, retaining the complete blockchain history.
Data embedded via `OP_RETURN` is therefore preserved across the vast majority of the network.
Forcing data into the UTXO set, rather than block storage, comes at disproportionate cost to the network with no practical permanence benefit.

### Bitcoin Core v30 and `OP_RETURN` unbounding

Bitcoin Core v30.0, released in October 2025, [removed the standardness restrictions](https://github.com/bitcoin/bitcoin/blob/master/doc/release-notes/release-notes-30.0.md#updated-settings) that previously limited `OP_RETURN` outputs to [[80 bytes||The default `datacarriersize` was 83 bytes for the total `scriptPubKey`. But with 1 byte for `OP_RETURN`, 1 byte for `OP_PUSHDATA1`, and 1 byte for the length field, the maximum usable data payload was exactly 80 bytes.]] of data.
Transactions with `OP_RETURN` outputs of any size (up to the transaction size limit) are now relayed and mined by default.
This fundamentally changes the data carriage landscape on Bitcoin.

### Bitcoin Stamps' current usage doesn't justify P2MS

The data shows that Bitcoin Stamps' use case has evolved significantly from its original "art" focus.
As shown in {@fig:stamps-variant-temporal}, no P2MS "Classic Stamps" (images) have been created since March 2024, and only the JSON-based sub-protocols of Bitcoin Stamps (SRC-20, SRC-101) have leveraged P2MS in 2025.

Bitcoin Stamps' current P2MS usage is entirely for simple JSON payloads, not art.
These JSON payloads do not inherently require the permanence guarantee that P2MS provides.
They could function identically using `OP_RETURN` outputs, which:

- Do not pollute the UTXO set (they are provably unspendable and pruned from the UTXO set)
- Are now limited in size only by the transaction size limit following the release of Bitcoin Core v30.0
- Are the standard, intended mechanism for data carriage on Bitcoin

It's worth noting that Bitcoin Stamps already uses multiple data carriage techniques beyond P2MS.
The continued use of P2MS specifically for JSON payloads, when `OP_RETURN` is now a viable alternative, is difficult to justify.

### The case for deprecating P2MS

Given the data presented in this analysis, there is a reasonable case for deprecating the creation of new P2MS outputs. That is, introducing a soft fork to make the creation of new P2MS outputs invalid by consensus.

The arguments in favour of deprecation include:

1. **P2MS is not used for its intended purpose.**
The data is unambiguous: 99.98% of P2MS UTXOs serve data embedding protocols, not multisig custody.
Legitimate multisig users migrated to P2SH and P2WSH years ago, which offer better privacy, lower fees, and broader wallet support.
Modern wallets largely do not support P2MS at all; as Bitcoin Core maintainer Ava Chow [noted in August 2023](https://github.com/bitcoin/bitcoin/pull/28217#issuecomment-1666620826): _"Bare multisigs are generally unusable to the vast majority of wallet software, if not all of them. They do not have an address type so the vast majority of users are completely unable to send to them."_

2. **The primary user no longer needs P2MS.**
As detailed above, Bitcoin Stamps' current usage is entirely JSON-based sub-protocols that don't require UTXO set permanence.
With `OP_RETURN` now effectively unbounded, there is no reason for Bitcoin Stamps to continue using P2MS.

3. **Reduced maintenance burden.**
Deprecating P2MS would allow Bitcoin Core developers to remove support for a script type that clearly no longer serves its original multisig custody purpose, simplifying the codebase and reducing maintenance overhead.

4. **Network resource preservation.**
Preventing new unspendable P2MS outputs would halt the ongoing UTXO set growth from data carriage protocols that now have viable alternatives.

The arguments against deprecation are primarily procedural rather than technical:

- **Bitcoin's conservatism regarding consensus changes.** Any change that invalidates previously valid transactions requires careful consideration, even if the affected use cases are not the intended purpose.

- **Precedent concerns.** Some argue that restricting how people use Bitcoin, even for purposes such as data carrying via deliberately unspendable transaction outputs, sets a problematic precedent.

- **Existing outputs remain.**
Deprecating new P2MS outputs does nothing about the 2.4M outputs already in the UTXO set.
The pollution that has already occurred is permanent until other change happens in Bitcoin, e.g., a future UTXO set pruning mechanism.

### Prior proposals and discussions

There have been several proposals to address P2MS misuse, though none have been implemented.

In September 2023, portlandhodl opened Bitcoin Core PR [#28400](https://github.com/bitcoin/bitcoin/pull/28400) titled "Make provably unsignable standard P2PK and P2MS outpoints unspendable" to remove provably unspendable P2PK and P2MS transaction outputs from the UTXO set.
The PR received generally positive feedback, with contributors acknowledging the UTXO set pollution problem.

However, it was ultimately closed by the author in March 2024 with the comment: _"Closing because the fragility of this PR does not justify its limited impact."_
The challenges included determining which outputs are truly [[provably unspendable||Not all Bitcoin Stamps outputs are provably unspendable as some data-carrying keys happen to correspond to valid points on the secp256k1 curve]], managing consensus implications, and the relatively small impact relative to overall UTXO set size.

A related discussion occurred around PR [#28217](https://github.com/bitcoin/bitcoin/pull/28217), which proposed limiting bare multisig to only `OP_CHECKMULTISIG` and not `OP_CHECKMULTISIGVERIFY`.
Developer Jimmy Song [commented in December 2023](https://twitter.com/jimmysong/status/1735439599055356071) about the broader question of whether bare multisig should be deprecated entirely, noting the data-carrying abuse.
Various discussions on platforms like [Stacker News](https://stacker.news/items/352806) have explored whether P2MS should be made non-standard or removed from consensus, though no such changes have been implemented.

### Conclusion

This analysis provides a comprehensive baseline for understanding P2MS usage as of late 2025.
The data demonstrates conclusively that P2MS is no longer serving its intended purpose with data carriage, particularly via Bitcoin Stamps, the dominant use case.
The transition from predominantly spendable outputs before Bitcoin Stamps launched to ~75% unspendable in just ~2.5 years represents a dramatic shift in P2MS usage.

With Bitcoin Core v30.0 removing `OP_RETURN` size limits, the technical justification for using P2MS as a data carriage mechanism has largely evaporated.
Bitcoin Stamps now has a viable alternative for its JSON-based payloads that doesn't impose permanent costs on the network.
Whether the Bitcoin community chooses to deprecate P2MS, maintain the status quo, or pursue other approaches, the data presented here makes it unambiguously clear that the current state of P2MS usage is far removed from its original design intent.

## References
- [UTXO Set Report (Mempool Research)](https://research.mempool.space/utxo-set-report/)
- [Ordinals - Impact on Node Runners](https://www.bitmex.com/blog/ordinals-impact-on-node-runners)
- [What are the limits of m and n in m-of-n multisig addresses?](https://bitcoin.stackexchange.com/questions/23893/what-are-the-limits-of-m-and-n-in-m-of-n-multisig-addresses)
- [Bitcoin Core v30.0 Release Notes](https://github.com/bitcoin/bitcoin/blob/master/doc/release-notes/release-notes-30.0.md)
- [Bitcoin Core PR #28400: Make provably unsignable standard P2PK and P2MS outpoints unspendable](https://github.com/bitcoin/bitcoin/pull/28400)
- [Bitcoin Core PR #28217: Limit bare multisig to OP_CHECKMULTISIG](https://github.com/bitcoin/bitcoin/pull/28217)
- [Jimmy Song on P2MS deprecation](https://twitter.com/jimmysong/status/1735439599055356071)
- [Stacker News discussion on P2MS standardness](https://stacker.news/items/352806)
