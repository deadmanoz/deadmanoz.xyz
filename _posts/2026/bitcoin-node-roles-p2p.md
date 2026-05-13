---
title: 'Bitcoin node roles and network topology'
excerpt: 'An examination of the roles, configuration, and connection management of Bitcoin nodes, and the resultant topology of the network'
coverImage: '/assets/blog/2026/bitcoin-node-roles-p2p/bitcoin-node-roles-p2p-cover.png'
date: '2026-04-02T00:00:00.000Z'
tags:
  - bitcoin
  - p2p
  - network-topology
  - explainer
author:
  name: deadmanoz
ogImage:
  url: '/assets/blog/2026/bitcoin-node-roles-p2p/bitcoin-node-roles-p2p-cover.png'
status: published
---

## Introduction

Bitcoin's peer-to-peer (P2P) network is a distributed system that allows network participants (nodes) to interact without relying on a central authority.
For the network to operate as efficiently and as decentralised as possible, Bitcoin nodes can operate in a variety of modes, fulfilling different roles.
This post examines the various roles and modes of Bitcoin nodes and the topology of the Bitcoin network that this differentiation has led to.

## Node reachability

One way of categorising nodes on the Bitcoin network is whether they are **reachable** or not. 
In essence, a node is reachable if other nodes on the network can initiate [[inbound||Terms such as **inbound** and **outbound** are from the perspective of the node under consideration. An inbound connection is one initiated by a remote peer towards your node; an outbound connection is one your node initiates towards a remote peer.]] connections to it. 

More concretely, a node is likely to be reachable when it is configured to accept inbound connections (`-listen=1`, the default), binds to an appropriate network interface, and its listening port (default 8333 for mainnet) is accessible from the outside, either because the machine has a public IP directly, or because NAT/firewall rules forward traffic appropriately.
There are also other considerations such as number of available connection slots for inbound peers, and whether the necessary plumbing is in place for alternative networks (e.g., a Tor hidden service, an I2P service, or a CJDNS address).

:::collapse{NAT, CGNAT, and node reachability}
When the ISP assigns a public IP address (static or dynamic) directly to a customer's router, the router uses **Network Address Translation (NAT)** to share that address across devices on the customer's local network.
Outbound connections work transparently, the router tracks the mapping and routes replies back, but unsolicited inbound connections have no existing mapping and are dropped.
Since the router holds a public IP, this is straightforward to solve: a **port forwarding** rule on the router can direct inbound traffic on the listening port (e.g. 8333) to the node's private LAN address.

Some routers support **NAT-PMP** (NAT Port Mapping Protocol) or **PCP** (Port Control Protocol) to automate this.
Bitcoin Core ships a built-in PCP/NAT-PMP implementation (since [v29.0](https://bitcoincore.org/en/releases/29.0/) with [PR #30043](https://github.com/bitcoin/bitcoin/pull/30043)) and enables it by default (since [v30.0](https://bitcoincore.org/en/releases/30.0/) with [PR #33004](https://github.com/bitcoin/bitcoin/pull/33004)), so a listening node behind a compatible router will automatically map its port without manual configuration.
Earlier versions relied on UPnP via the miniupnpc library, but that was disabled by default in [v0.11.1](https://bitcoincore.org/en/releases/0.11.1/) after [multiple security vulnerabilities](https://bitcoincore.org/en/2024/07/03/disclose_upnp_rce/) and [dropped entirely in v29.0](https://bitcoincore.org/en/releases/29.0/).

However, a growing share of connections never receive a public IP at all.
**Carrier-Grade NAT (CGNAT)** places multiple customers behind a shared public IP at the ISP level, so port forwarding on the home router is useless.
Mobile networks use CGNAT [almost universally](https://blog.cloudflare.com/detecting-cgn-to-reduce-collateral-damage/), and fixed-line adoption is growing as [all five Regional Internet Registries have exhausted their IPv4 free pools](https://www.potaroo.net/tools/ipv4/).
For node operators behind CGNAT, the main workarounds are overlay networks: **Tor** hidden services (.onion), **I2P** (supported since Bitcoin Core [v22.0](https://bitcoincore.org/en/releases/22.0/) with [PR #20685](https://github.com/bitcoin/bitcoin/pull/20685)), or **CJDNS** (since [v23.0](https://bitcoincore.org/en/releases/23.0/) with [PR #23077](https://github.com/bitcoin/bitcoin/pull/23077)), all of which bypass NAT entirely.
:::

So the Bitcoin network consists of reachable nodes, openly connectable and therefore straightforward to survey, and unreachable nodes, which cannot accept inbound connections (due to not satisfying one or more of the criteria outlined above) and are therefore much harder to catalogue through network observation alone. 
The primary way of learning about unreachable nodes is through `addr` messages gossiped across the network, with the caveat that an address appearing in gossip only confirms that a node _existed_ at some point, not that it is still running.

As of April 2026, the long-running [Bitnodes project](https://bitnodes.io/),
which aims to estimate "the size of the Bitcoin peer-to-peer network by finding
all reachable and unreachable nodes", puts the total count at roughly 70,000,
with around 23,000 (about a third) being reachable.
That two-thirds are unreachable is unsurprising given the barriers facing home node operators: many sit behind NAT without port forwarding configured, and a growing share are behind CGNAT (see [above](#node-reachability)), where inbound connections are impossible regardless of router settings.
Node-in-a-box products (Umbrel, Start9, RaspiBlitz) sidestep this by defaulting to Tor, which makes them reachable within the .onion network but not from the clearnet.

## Node connection management

Every node on the network automatically maintains a small set of outbound connections to peers it has selected itself.
Reachable nodes additionally allocate slots for inbound connections - peers that have discovered and connected to them. 
In total, under a default configuration, a node has a maximum of [125 automatic peer connections](https://github.com/bitcoin/bitcoin/blob/master/doc/reduce-traffic.md) ([`DEFAULT_MAX_PEER_CONNECTIONS`](https://github.com/bitcoin/bitcoin/blob/master/src/net.h)) to maintain ({@fig:connection-budget}).
The way these connection slots are budgeted, and the distinct roles assigned to different connection types, are deliberate design decisions that balance node resource constraints against the network's need for robust connectivity between nodes.
Note that, as explored in [other connection types](#other-connection-types), some special connection types have their own separate slot budgets and are not counted against this limit.

![Bitcoin Core connection slot budget showing the 125-slot breakdown: 8 full-relay outbound, 2 block-relay-only outbound, 1 feeler, and 114 inbound slots, with the trust asymmetry between outbound and inbound connections.](/assets/blog/2026/bitcoin-node-roles-p2p/bitcoin-connection-budget.png){#fig:connection-budget}

### Outbound connections

In a default configuration, a node has 10 persistent outbound peers, and one short-lived feeler, for [11 outbound peers](https://github.com/bitcoin/bitcoin/blob/master/doc/reduce-traffic.md). 
The 10 persistent outbound peers consist of [[8 outbound full-relay connections||`ConnectionType::OUTBOUND_FULL_RELAY`]] and [[2 block-relay-only connections||`ConnectionType::BLOCK_RELAY`]].
The full-relay connections exchange all message types - [[addresses, transactions and blocks||Transactions and blocks are advertised to peers via `inv` (inventory) messages, which signal that the sender has new data available. The recipient can then request the full data with a `getdata` message. Address gossip uses `addr`/`addrv2` messages.]] - with a default maximum of 8 specified by [Satoshi in 2010](https://github.com/bitcoin/bitcoin/commit/c2fa70ddfd7711d514a701b3a7c8adb561acc3ff).
The block-relay-only connections, introduced in Bitcoin Core [v0.19.0.1](https://bitcoincore.org/en/releases/0.19.0.1/) (in 2019 with [PR #15759](https://github.com/bitcoin/bitcoin/pull/15759)), [[are only for the exchange of block headers and blocks||The motivation for this was to help keep the network topology private, as "knowledge of the network graph could be used to split a target node or nodes from the honest network."]].

[[Feeler connections||`ConnectionType::FEELER`]] are short-lived outbound connections opened approximately [[every 2 minutes||`FEELER_INTERVAL` in `src/net.h`]] to test whether addresses in the node's peer database are reachable, promoting them from the `new` table (learned via gossip, untested) to the `tried` table (successfully connected to at least once) on success. 
These tables are part of the node's **address manager** (`AddrMan`), which tracks known peer addresses and is complex enough that it will be covered in a future post.

### Inbound connections

Unlike outbound connections, a reachable node has no say in who connects to it; any other node can claim one of its inbound slots.
[[Inbound connections||`ConnectionType::INBOUND`]] are therefore less trusted. 
A node relies on its outbound peers for its best approximation of the true network state. 
Inbound peers still contribute by relaying blocks and transactions to the wider network, and may even be the first to deliver them.

With a default cap of 125 automatic connections, 11 of which are reserved for outbound, there are up to 114 inbound slots. 
When a new peer attempts a connection, a node doesn't immediately refuse it.
Instead, it evaluates the existing inbound peers and evicts "the least useful" (which could turn out to be the new peer itself!).
Exploring the [[eviction logic||Carved out into its own source files in `src/node/eviction.h` and `src/node/eviction.cpp`]] is beyond the scope of this work, suffice to say it's a process that eliminates peers from being eviction candidates via [[multiple evaluation criteria||For example, network group diversity, ping latency, transaction and block relay usefulness]], with the final remaining peer being the one that is dropped.

### Inbound vs Outbound asymmetry

Since anyone can cheaply claim inbound slots, they are inherently vulnerable to **Sybil attacks** that manipulate the node's view of the network.
Outbound connections, being self-selected from the address database with limited slots and randomised selection, are far harder to subvert.
Several design decisions reinforce this asymmetry.

:::collapse{What's a Sybil attack?}
A Sybil attack is when a single adversary creates many fake identities (in Bitcoin's case, many seemingly independent nodes) to gain disproportionate influence over a target.
Since Bitcoin's P2P network is permissionless and there is little cost to spinning up new nodes, an attacker can flood a victim with connections that all appear to be distinct peers but are actually controlled by the same entity.
If a node's connections are dominated by Sybil peers, those peers can collaborate to feed it a distorted view of the network: withholding blocks, censoring transactions, or manipulating relay timing.
The outbound/inbound asymmetry described here is one of the primary structural defences against this class of attack.
:::

[[Transaction `inv` messages ||Inventory announcement messages. A node sends an `inv` to advertise that it has new transactions (or blocks) available for download. The recipient can then request the full data with a `getdata` message]] are batched on a timer, with outbound peers receiving announcements every [[2 seconds||`OUTBOUND_INVENTORY_BROADCAST_INTERVAL` in `src/net_processing.cpp`]] and inbound peers every [[5 seconds||`INBOUND_INVENTORY_BROADCAST_INTERVAL` in `src/net_processing.cpp`]]. 
The concern is transaction origin inference: a spy opening many inbound connections could correlate `inv` timing to deduce that the node originated a transaction. 
The longer inbound interval ensures all inbound peers from the same network see the same `inv` simultaneously, eliminating differential timing signals regardless of how many connections the attacker opens.
Outbound peers pose a much lower Sybil risk, so the faster interval trades a small amount of privacy for better propagation speed. 
That is, the batching makes the attack's effectiveness independent of how many inbound slots the adversary holds, adding more inbound (Sybil) connections yields no additional timing signal.

Outbound peers are also strongly preferred as block sources. 
With inbound slots being cheap to Sybil, an attacker dominating a node's inbound connections could withhold new blocks, e.g. keeping the node on a stale chain tip, or could selectively delay block announcements to gain a timing advantage. 
To guard against this, each [[outbound peer||Also any inbound peers with `NoBan` permission (`src/net_permissions.h`)]] is marked as a [[preferred peer||`fPreferredDownload` in `src/net_processing.cpp`]], meaning blocks are requested from outbound peers first, with inbound peers only used as a fallback when no preferred peers are available.

The same preference applies to header synchronisation: initial [[headers-first sync||Headers-first synchronisation works by first downloading all block headers from a peer ("sync peer") and validating the chain of proof-of-work, then downloading full blocks in parallel from multiple peers. This avoids wasting bandwidth on blocks that turn out to be on an invalid or lower-work chain.]] is only initiated from a preferred peer, with inbound peers as a fallback.

Finally, only inbound peers are subject to the eviction process described above.
Outbound peers are not part of the inbound eviction process, since losing a self-selected peer would weaken the node's trusted view of the network.
They can, however, still be disconnected for other peer-management reasons, such as [[stalling detection||If an outbound peer fails to deliver a requested block within `BLOCK_STALLING_TIMEOUT_DEFAULT` (2 seconds, adaptive up to `BLOCK_STALLING_TIMEOUT_MAX` of 64 seconds during IBD), the peer is disconnected. Both constants in `src/net_processing.cpp`.]], [[extra block-relay peer rotation||After IBD, a new block-relay-only peer is connected roughly every 5 minutes (`EXTRA_BLOCK_RELAY_ONLY_PEER_INTERVAL` in `src/net.h`). If the extra peer hasn't delivered blocks more recently than the second-youngest block-relay peer, it is evicted. This continuously samples new peers to make eclipse attacks harder.]], or the network-diversity rebalancing discussed in [bridge nodes](#bridge-nodes) below.

### Address bootstrapping

There is a bootstrapping problem that a special class of outbound connection, `ConnectionType::ADDR_FETCH`, exists to solve: how does a node populate its address book when it doesn't yet know any peers?
On first startup, or [[under various other circumstances||Such as after `peers.dat` has been deleted or corrupted, after being offline long enough for all cached addresses to exceed [`ADDRMAN_HORIZON`](https://github.com/bitcoin/bitcoin/blob/master/src/addrman.h) (30 days), or after enough connection failures to mark all addresses "terrible" ([`ADDRMAN_RETRIES`/`ADDRMAN_MAX_FAILURES`](https://github.com/bitcoin/bitcoin/blob/master/src/addrman.h)).]], `AddrMan` will be empty and the node will have nobody to connect to.

The primary bootstrap mechanism is **DNS seeds**: the node queries hardcoded DNS hostnames (see below) with a [[service-bit filter prefix||For example `x9.seed.bitcoin.sipa.be` for `NODE_NETWORK | NODE_WITNESS`]] that resolve to lists of active node IP addresses.
If the requesting node is behind a proxy where direct DNS isn't possible, or if a seed doesn't support the requested service-bit filter and returns no results, the node falls back to opening an `ADDR_FETCH` connection directly to the seed.
This is a short-lived connection that completes a version handshake, sends a `getaddr` message, receives an `addr` response, feeds those addresses into `AddrMan`, and disconnects.
Note that the same mechanism serves `-seednode` peers: operator-specified peers that the node tries as a trusted bootstrapping source before falling back to the hardcoded DNS seeds.

:::collapse{Mainnet DNS seeds (Bitcoin Core v31)}
As of v31, Bitcoin Core's mainnet configuration includes eight hardcoded DNS seeds in [`src/kernel/chainparams.cpp`](https://github.com/bitcoin/bitcoin/blob/v31.0rc2/src/kernel/chainparams.cpp#L144-L151):

| Hostname | Operator | Notes |
|---|---|---|
| `seed.bitcoin.sipa.be` | Pieter Wuille | Supports x1, x5, x9, xd |
| `dnsseed.bluematt.me` | Matt Corallo | Only supports x9 |
| `seed.bitcoin.jonasschnelli.ch` | Jonas Schnelli | Supports x1, x5, x9, xd |
| `seed.btc.petertodd.net` | Peter Todd | Supports x1, x5, x9, xd |
| `seed.bitcoin.sprovoost.nl` | Sjors Provoost | |
| `dnsseed.emzy.de` | Stephan Oeste | |
| `seed.bitcoin.wiz.biz` | Jason Maurice | |
| `seed.mainnet.achownodes.xyz` | Ava Chow | Supports x1, x5, x9, x49, x809, x849, xd, x400, x404, x408, x448, xc08, xc48, x40c |

The `x` prefixed service bit filters (e.g. x9 = `NODE_NETWORK | NODE_WITNESS`) allow seeds to return only nodes advertising specific service flags.
:::

`ADDR_FETCH` connections are short-lived (they disconnect as soon as addresses are received) and use the shared automatic outbound pool on a best-effort basis, so they do not displace the node's persistent outbound peers and may simply be skipped when no outbound slot is free.

### Other connection types

Beyond the connection types discussed so far, Bitcoin Core defines two more outbound connection types: operator-specified peers (`ConnectionType::MANUAL`) and privacy-preserving transaction relay (`ConnectionType::PRIVATE_BROADCAST`).
Each has its own slot accounting so they don't interfere with the automatic outbound budget.

`MANUAL` connections are created via the `-addnode` configuration option or the `addnode` RPC, and have their own separate 8-slot pool. 
That is, adding manual peers never displaces any (automatic) outbound connections, they are separately accounted for.
Unlike automatic connections, manual peers are not subject to the same rotation and eviction logic, a node with manual peers will persistently try to maintain connections to them.

`PRIVATE_BROADCAST` is new in v31, enabled via the opt-in [`-privatebroadcast`](https://github.com/bitcoin/bitcoin/pull/29415) flag (off by default).
These connections use a dedicated 64-slot budget, completely separate from the regular outbound pool.
They open short-lived connections exclusively over privacy networks (Tor, I2P) to relay [[transactions submitted locally via RPC||Specifically, transactions submitted via the `sendrawtransaction` RPC. Wallet transactions follow the normal relay path regardless of this setting.]], then close (such that transaction broadcast over privacy networks never competes with regular outbound connection slots).

:::collapse{The complete set of connection types in Bitcoin Core}
All seven connection types that have been discussed are defined in the `ConnectionType` enum in [`src/node/connection_types.h`](https://github.com/bitcoin/bitcoin/blob/master/src/node/connection_types.h).

```cpp
enum class ConnectionType {
    INBOUND,
    OUTBOUND_FULL_RELAY,
    MANUAL,
    FEELER,
    BLOCK_RELAY,
    ADDR_FETCH,
    PRIVATE_BROADCAST,
};
```
:::



## Node operating modes

Beyond reachability and connection management, nodes also differ in what they store, what they relay, and how much of the chain they keep after validating it.
All of the configurations discussed in this section are **full nodes**: they independently validate every block against the consensus rules and maintain the UTXO set needed to do so, rather than trusting proof-of-work or any peer's assessment as a proxy for validity.
[Light clients](#light-clients), discussed separately below, are not nodes in this sense; they are wallet software that connects to full nodes as a client rather than participating as a peer.

The first distinction among full nodes is whether they retain a complete copy of the blockchain or not, that is, whether a node is a **full archival node** or a **pruned node**.

### Archival nodes

Full archival nodes validate and retain every block from the genesis block onwards. 
This means they can serve any historical block to peers that request it, most importantly to new nodes that must download and validate the entire chain from scratch (**initial block download** - IBD). 
A full archival node should advertise as such by [[signalling `NODE_NETWORK` in the service flags||Note that service flags are **unauthenticated self-advertisements**, peers can claim capabilities they don't actually have. A node requesting historical blocks from a peer advertising `NODE_NETWORK` may find the peer unable to deliver, the node simply tries other peers!]] in the `version` message it sends to peers during the version handshake.

:::collapse{The `version` handshake}
When two Bitcoin nodes first connect, they exchange `version` messages before any other communication.
The `version` message carries the node's protocol version, service flags (like `NODE_NETWORK` or `NODE_NETWORK_LIMITED`), current block height, a nonce for self-connection detection, and the `fRelay` flag indicating whether the sender wants transaction relay on this connection.
The receiving node responds with a `verack` (version acknowledgement) message, and once both sides have sent and received `verack`, the connection is considered established.
Only after this handshake completes will either peer process further messages.
The service flags advertised in `version` are how peers learn each other's capabilities, though, as noted above, these are self-reported and unauthenticated.
:::

### Pruned nodes

Not every operator is willing or able to store the full block history - as of early 2026, the raw block data alone occupies [[roughly 775 GB, with the full data directory closer to 830 GB||As reported by `getblockchaininfo`]] before any optional indexes.
Pruned nodes (`-prune=<N>`) also download and fully validate every block, and maintain the full UTXO set, but discard old block data after validation.
A pruned node relays new blocks and transactions normally, it simply can't serve historical blocks to peers performing IBD.

Regardless of the pruning target, a pruned node always retains at least the most recent [[288 blocks||`MIN_BLOCKS_TO_KEEP` in `src/validation.h`, with the value proposed by [Gregory Maxwell during the original pruning design discussions](https://github.com/bitcoin/bitcoin/pull/4701) as "a minimum number I'd consider acceptable as an absolute minimum for the purpose of reorgs."]], which is approximately two days' worth given the 10-minute block interval.
The [[minimum pruning target of `-prune=550` (MiB)||See `src/validation.h` for the back-of-the-envelope math.]] is derived from this requirement, accounting for the 288 blocks themselves, undo data overhead, orphan block rate, and [[block file granularity||Blocks are not stored individually, but instead in block files, with `MAX_BLOCKFILE_SIZE` being 128 MiB as per `src/node/blockstorage.h`]]. 
Pruned nodes advertise `NODE_NETWORK_LIMITED` rather than `NODE_NETWORK` in their service flags, signalling to peers that they can serve recent blocks but cannot be relied upon for historical data during IBD.

### Blocks-only mode

Orthogonal to the archival/pruned distinction is whether a node participates in **transaction relay**. 
Running with `-blocksonly` disables ordinary transaction relay, so a node in this mode [[won't accept transactions from normal network peers||Peers with the `Relay` permission (`src/net_permissions.h`) are excepted from this and can still send transactions to the node. Separately, peers with the `ForceRelay` permission can force automatic broadcast/rebroadcast of transactions, which is a distinct capability from merely accepting them.]].
Because transaction relay dominates a typical node's traffic, blocks-only mode can [reduce overall bandwidth consumption by as much as 88%](https://github.com/bitcoin/bitcoin/blob/master/doc/reduce-traffic.md).
The trade-off is that the node sees far less unconfirmed transaction activity, so its [[mempool remains sparse||Typically containing only locally submitted transactions, any transactions accepted from peers with the `Relay` permission, and transactions force-relayed by peers with `ForceRelay` permission.]], fee estimation is disabled, and it cannot make full use of the mempool-assisted fast path in **compact block relay**.

:::collapse{Compact block relay}
[BIP 152](https://github.com/bitcoin/bips/blob/master/bip-0152.mediawiki) compact block relay reduces block propagation bandwidth by exploiting the fact that a node's mempool already contains most of a new block's transactions.
Instead of transmitting a full block, compact block relay uses a `cmpctblock` message containing the block header, a list of short transaction IDs, and any transactions the sender predicts the receiver won't have (the "prefilled" transactions, which always includes the coinbase).
The receiver matches the short IDs against its mempool and, if any are missing, requests them individually via `getblocktxn`/`blocktxn` round-trips.
A typical block compresses to a compact block message of [roughly 9 KB](https://bitcoincore.org/en/2016/06/07/compact-blocks-faq/) (the header, short transaction IDs, and prefilled transactions); roughly two orders of magnitude smaller than the full block.

BIP 152 defines two modes.
In **low-bandwidth mode** (the default for most connections), the sender first announces the block via `headers` (or falls back to `inv`) and only sends the compact block after the receiver requests it with `getdata`.
In **high-bandwidth mode**, which a node requests from up to three peers via `sendcmpct`, the sender pushes the `cmpctblock` immediately upon validation, without waiting for a request, potentially even before fully validating the block itself.
This shaves off a full round-trip and is the primary mechanism by which new blocks propagate quickly across the network.

The impact on propagation times has been dramatic: [KIT DSN measurements](https://www.dsn.kastel.kit.edu/bitcoin/publications/bitcoin_network_characterization.pdf) observed block propagation drop from over 6 seconds (2015, pre-compact blocks) to under 1 second (2018) at the 50th percentile, with the 90th percentile falling from over 15 seconds to roughly 2 seconds.

The effectiveness of compact blocks depends directly on mempool overlap: the more transactions a node has already seen and validated, the fewer it needs to request after receiving a compact block.
Monitoring by [0xB10C](https://delvingbitcoin.org/t/stats-on-compact-block-reconstructions/1052) shows that under normal mempool conditions, over 80% of compact blocks reconstruct without any additional round-trips, though this can drop below 50% during periods of high mempool congestion (such as around the April 2024 halving).
A blocks-only node, which maintains only a small mempool (5 MB by default vs the normal 300 MB) and receives no transaction relay, rarely has the transactions it needs, reconstructs compact blocks less efficiently, and often needs many missing transactions via `getblocktxn`, reducing or sometimes erasing the bandwidth benefit of the protocol.
:::

A blocks-only node signals its preference during the version handshake by requesting [[no transaction relay||Setting `fRelay` to `false` in its `version` message]].
Peers that receive this instruction should not send `inv` messages for transactions to that connection (the same mechanism used by the [[block-relay-only connections||See the outbound connections section above]] discussed earlier, though there it is applied per-connection rather than node-wide).
Note that `-blocksonly` is independent of `-prune`: a node can be archival and blocks-only (full history, sparse mempool), or pruned and full-relay (limited history, active mempool), or any other combination.

:::collapse{`-blocksonly` vs block-relay-only connections}
These two mechanisms are easy to confuse because they sound similar and both set `fRelay=false` in the version handshake, but they operate at different scopes and serve different purposes.

`-blocksonly` is a **node-wide configuration**.
When enabled, the node disables transaction relay across *all* of its connections: it does not announce transactions via `inv`, and it will ignore (and may disconnect peers that persist in sending) unsolicited transaction messages.
The motivation is bandwidth reduction; on a typical node, transaction relay dominates traffic, so disabling it can cut bandwidth consumption dramatically (e.g. 88%).
A `-blocksonly` node still participates in address relay on its connections.

Block-relay-only connections (`ConnectionType::BLOCK_RELAY`) are a **per-connection policy**.
A node in a default configuration opens exactly 2 of these outbound connections alongside its 8 full-relay outbound connections.
These connections exchange block headers and blocks but never relay transactions or participate in address gossip (`addr`/`getaddr`).
As aforementioned, the motivation is to help obfuscate the topology of the network.

Both advertise `fRelay=false`, but they are still distinguishable: block-relay-only connections do not participate in address gossip, whereas `-blocksonly` connections still can.
:::

### Light clients

Not every user needs or is able to bear the storage, bandwidth, and processing costs of full validation.
**Light clients** are wallet software that connects to full nodes as a client rather than participating in the P2P network as a peer.
Light clients do not validate blocks or enforce consensus rules.
Instead, they only download block headers (and potentially full blocks) and use various protocols to learn about transactions relevant to them, trusting that the longest proof-of-work chain contains only valid transactions.

The two main protocols for light client data retrieval illustrate different trade-offs in how this trust model is implemented.
The original approach, **bloom filters** ([BIP 37](https://github.com/bitcoin/bips/blob/master/bip-0037.mediawiki)), had the client send a filter describing its addresses of interest to a full node, which would then return only matching transactions with [[Merkle proofs||A Merkle proof is a path of hashes from the transaction to the Merkle root in the block header, allowing the light client to verify that the transaction is included in a valid block without downloading the entire block.]] of inclusion.
This had well-documented privacy and DoS problems: the filter inherently leaked which addresses the client cared about ([Gervais et al., 2014](https://eprint.iacr.org/2014/763)), and serving filter requests was computationally expensive for the full node with no way for the client to compensate.
Bloom filter serving is now largely deprecated in Bitcoin Core and disabled by default since [v0.19.0.1](https://bitcoincore.org/en/releases/0.19.0.1/).

**Compact block filters** ([BIP 157](https://github.com/bitcoin/bips/blob/master/bip-0157.mediawiki) / [BIP 158](https://github.com/bitcoin/bips/blob/master/bip-0158.mediawiki), not to be confused with [compact block *relay*](#compact-block-relay)) invert the model: the full node pre-computes a compact filter for each block, and the client downloads these filters and evaluates them locally.
Since every client downloads the same filters, the downloads reveal nothing about which addresses the client cares about.
When a filter matches, the client downloads the full block to check (with [BIP 157](https://github.com/bitcoin/bips/blob/master/bip-0157.mediawiki) recommending that matched blocks be fetched from random peers to limit the information leaked by those requests).
This is the approach used by Neutrino-compatible wallets (such as those in the Lightning ecosystem) and supported by the [Bitcoin Dev Kit](https://github.com/bitcoindevkit/bdk).

:::collapse{What about Electrum?}
Not all light wallets use the P2P layer via direct connections to Bitcoin Core nodes.
Electrum connects to dedicated indexing servers ([ElectrumX](https://github.com/spesmilo/electrumx), [Fulcrum](https://github.com/cculianu/Fulcrum), etc.) over the [Electrum protocol](https://electrumx.readthedocs.io/en/latest/protocol.html) rather than speaking to Bitcoin Core peers directly.
The server sits on top of a fully-validated node, maintains a full transaction index, and handles address lookups on the client's behalf.
This shifts the trust model from "trust proof-of-work" to "trust the server" (unless the user runs their own).
:::

## Network topology

The various node types and operating modes described above produce a network that is far from homogeneous. 
The Bitcoin P2P network has a structure shaped by the asymmetry between reachable and unreachable nodes, the different capabilities advertised by each node, and the deliberate connection management strategies implemented in Bitcoin Core.

![Bitcoin P2P network topology showing the densely interconnected reachable core and the unreachable periphery, with connection directionality and slot budget detail.](/assets/blog/2026/bitcoin-node-roles-p2p/bitcoin-p2p-network-topology.png){#fig:network-topology}

### The reachable core

Reachable nodes form a densely connected core that serves as ["the backbone of the Bitcoin network"](https://arxiv.org/abs/1905.10518).
Every node on the network makes outbound connections, and those connections necessarily target reachable nodes.
As a result, this **reachable core** collectively absorbs all outbound connection attempts from the entire network.
A reachable node with 114 inbound slots might serve as a connection point for dozens of unreachable nodes simultaneously, while maintaining its own 10 outbound connections to other reachable peers.

This creates a hub-and-spoke dynamic ({@fig:network-topology}) where the ~23,000 reachable nodes form the backbone through which up to ~47,000 unreachable nodes access the network. 
The unreachable nodes are on the periphery, consuming connectivity from the reachable core but unable to provide it to others.
This is not a design flaw; it is an inevitable consequence of many node operators being unable to configure inbound access (e.g., NAT, CGNAT, firewalls).

### Block and transaction propagation

The heterogeneous mix of relay policies and connection types, e.g., full-relay connections, block-relay-only connections, and connections involving blocks-only nodes, creates distinct overlay networks layered on top of the same physical topology. 
Blocks propagate across all connection types, giving them a rich, redundant set of paths through the network. 
Transactions, by contrast, only flow over full-relay connections, meaning the transaction relay graph is a subset of the block relay graph ({@fig:propagation-overlays}).

![Block and transaction propagation overlays showing that full-relay connections carry both block relay (solid blue) and transaction relay (dashed yellow), while block-relay-only connections and connections to blocks-only nodes carry only block relay, making the transaction relay graph a strict subset of the block relay graph.](/assets/blog/2026/bitcoin-node-roles-p2p/bitcoin-block-tx-propagation-overlays.png){#fig:propagation-overlays}

This layering is intentional.
The block-relay-only connections provide additional paths for blocks to propagate without revealing the node's full connection topology through address and transaction relay side-channels.
An attacker who probes or analyses transaction relay behaviour may be able to infer parts of a node's connection topology, including some outbound peers; the block-relay-only connections are invisible to this kind of analysis, providing a hidden set of paths that make [[eclipse attacks||An eclipse attack is when an adversary manages to control all of a victim node's connections, completely isolating it from the honest network. Unlike a Sybil attack, which floods a node with many fake peers, an eclipse attack specifically aims to monopolise the target's view of the network so that the attacker can feed it false information; withholding blocks, double-spending, or selectively censoring transactions.]] meaningfully harder to execute.

### Bridge nodes

The Bitcoin network spans multiple overlay networks: IPv4, IPv6, Tor, I2P, and CJDNS ({@fig:bridge-nodes}).
Most nodes are only reachable on one or two of these, meaning peers within one overlay can become isolated from peers on another if there aren't enough nodes straddling both.
Nodes that maintain connections across multiple network types act as **bridge nodes**, forwarding blocks and transactions between overlay networks that would otherwise have limited or no connectivity to each other.

![Simplified illustration of Bitcoin P2P overlay networks (IPv4, IPv6, Tor, I2P, CJDNS) with bridge nodes in zone overlaps connecting across network boundaries. Actual network topology is far denser and more interconnected.](/assets/blog/2026/bitcoin-node-roles-p2p/bitcoin-bridge-nodes-overlay-networks.png){#fig:bridge-nodes}

Bridge nodes are critical for preventing **network partitioning** along transport boundaries.
If, for example, the Tor-only segment of the network lost all connections to IPv4 peers, those Tor nodes would effectively be on a separate network, unable to see new blocks or transactions from the IPv4 majority, and vulnerable to eclipse attacks within their isolated segment.
Bridge nodes prevent this by ensuring that block and transaction propagation can cross network boundaries.

Since [Bitcoin Core v26.0](https://bitcoincore.org/en/releases/26.0/) ([PR #27213](https://github.com/bitcoin/bitcoin/pull/27213)), Bitcoin Core actively tries to improve outbound network-type diversity.
Once all 8 outbound full-relay slots are filled, the node periodically invokes [[`MaybePickPreferredNetwork()`||In `src/net.cpp`. Shuffles through all reachable networks, looking for one with zero current `OUTBOUND_FULL_RELAY` or `MANUAL` connections and a non-empty `AddrMan`. If found, the network is set as preferred for the next outbound attempt.]] to check whether any reachable network has zero current outbound connections despite having known addresses in `AddrMan`.
If such a network is found, the node briefly opens a 9th outbound full-relay connection targeting that network, then [[evicts||Via `EvictExtraOutboundPeers()` in `src/net_processing.cpp`, a separate eviction path from the inbound eviction logic discussed earlier. It selects the outbound peer that least recently announced a new block, but protects any peer that is the sole connection on its network type.]] a peer from an over-represented network to bring the count back to 8 with improved diversity.
For example, a node reachable on both IPv4 and Tor, whose 8 initial slots all landed on IPv4 addresses, will open a 9th connection to a Tor peer and drop one of the IPv4 peers to rebalance.

### Resilience through diversity

The Bitcoin network's resilience emerges from the combination of all roles working together.
Archival nodes ensure that new nodes can always bootstrap from their blank slate.
Pruned nodes reduce the barrier to running a validating node, thus expanding the set of participants who independently enforce the consensus rules.
Blocks-only nodes further lower the resource floor while still contributing to block propagation, and because they do not relay third-party transactions by default, they reduce one avenue by which transaction-origin information can leak, though transactions submitted locally via RPC can still be broadcast by the node.
Bridge nodes knit the overlay networks together, preventing partitioning along transport boundaries.

The design philosophy throughout is one of graceful degradation: each operating mode sacrifices some capability in exchange for reduced resource requirements, but every full node still independently enforces the consensus rules on every block it processes.

## Conclusion

The Bitcoin P2P network is a collection of heterogeneous nodes with different capabilities and configurations that collectively maintain the properties the network needs: censorship-resistant transaction relay, fast block propagation, the ability for new nodes to join and sync, and independent consensus validation by every full node operator.

Understanding these roles and how they interact is a prerequisite for reasoning about the network's behaviour under adversarial conditions, resource requirements as the chain grows, and the design decisions behind protocol improvements.
In a future post, we'll look more closely at `AddrMan`, the address manager that determines _which_ peers a node connects to in the first place, and the design choices that make peer selection both supportive of efficient P2P network operations and resilient to adversarial conditions.

## Reference

:::collapse{Configuration options, code references, service flags, connection types, permissions, P2P messages, RPC commands, and source files referenced in this post (not exhaustive).}

### Configuration options

| Option | Default | Description |
|--------|---------|-------------|
| `-listen` | `1` | Accept inbound connections from peers. Required for a node to be reachable. |
| `-prune=<N>` | Off | Discard old block data after validation, retaining the most recent blocks. Minimum value is `550` MiB. |
| `-blocksonly` | Off | Disable transaction relay entirely. Blocks are still relayed normally. Reduces bandwidth by up to ~88%. |
| `-peerbloomfilters` | `0` | Serve BIP 37 bloom-filtered data to peers. Disabled by default since v0.19.0.1 due to privacy and DoS concerns. |
| `-blockfilterindex` | `0` | Build and maintain BIP 158 compact block filter indexes locally. |
| `-peerblockfilters` | `0` | Serve BIP 157/158 compact block filters to peers. Requires `-blockfilterindex=1`. |
| `-addnode` | - | Manually specify a peer to persistently connect to. Uses a separate 8-slot pool that doesn't compete with automatic outbound connections. Also available as an RPC. |
| `-seednode` | - | Specify a peer to connect to for address bootstrapping on first startup, tried before hardcoded DNS seeds. |
| `-privatebroadcast` | Off | Opt-in (v31+). Relay locally-submitted transactions over short-lived Tor/I2P connections using a dedicated 64-slot budget, separate from regular outbound slots. |

### Code references

| Constant | File | Description |
|----------|------|-------------|
| `DEFAULT_MAX_PEER_CONNECTIONS` | [`src/net.h`](https://github.com/bitcoin/bitcoin/blob/master/src/net.h) | Maximum total peer connections (default 125). |
| `FEELER_INTERVAL` | [`src/net.h`](https://github.com/bitcoin/bitcoin/blob/master/src/net.h) | Interval between feeler connection attempts (~2 minutes). |
| `OUTBOUND_INVENTORY_BROADCAST_INTERVAL` | [`src/net_processing.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/net_processing.cpp) | Transaction `inv` batching interval for outbound peers (2 seconds). |
| `INBOUND_INVENTORY_BROADCAST_INTERVAL` | [`src/net_processing.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/net_processing.cpp) | Transaction `inv` batching interval for inbound peers (5 seconds). Longer to prevent timing-based transaction origin inference from Sybil inbound connections. |
| `MIN_BLOCKS_TO_KEEP` | [`src/validation.h`](https://github.com/bitcoin/bitcoin/blob/master/src/validation.h) | Minimum number of recent blocks a pruned node retains (288, ~2 days). |
| `MAX_BLOCKFILE_SIZE` | [`src/node/blockstorage.h`](https://github.com/bitcoin/bitcoin/blob/master/src/node/blockstorage.h) | Maximum size of a single block file on disk (128 MiB). Factors into the minimum prune target calculation. |
| `BLOCK_STALLING_TIMEOUT_DEFAULT` | [`src/net_processing.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/net_processing.cpp) | Default time a peer must stall block download progress before being disconnected (2 seconds). Doubles on each stalling disconnection up to `BLOCK_STALLING_TIMEOUT_MAX` (64 seconds). |
| `EXTRA_BLOCK_RELAY_ONLY_PEER_INTERVAL` | [`src/net.h`](https://github.com/bitcoin/bitcoin/blob/master/src/net.h) | Interval for the extra block-relay-only peer rotation loop (5 minutes). After IBD, the node periodically connects to a new block-relay-only peer and evicts the least useful existing one. |
| `fPreferredDownload` | [`src/net_processing.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/net_processing.cpp) | Per-peer flag marking outbound peers (and `NoBan` inbound peers) as preferred sources for block downloads and header sync. |
| `fRelay` | `version` message | Field in the `version` handshake message. When `false`, signals the sender does not want transaction relay on this connection (used by `-blocksonly` nodes and block-relay-only connections). |
| `ADDRMAN_HORIZON` | [`src/addrman.h`](https://github.com/bitcoin/bitcoin/blob/master/src/addrman.h) | Maximum age (30 days) before an address in `AddrMan` is considered too old. One trigger for DNS seed bootstrapping. |
| `ADDRMAN_RETRIES` / `ADDRMAN_MAX_FAILURES` | [`src/addrman.h`](https://github.com/bitcoin/bitcoin/blob/master/src/addrman.h) | Thresholds for marking an address as "terrible" after repeated connection failures. When all addresses are terrible, bootstrapping is triggered. |
| `MaybePickPreferredNetwork()` | [`src/net.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/net.cpp) | Checks whether any reachable network has zero outbound connections despite having known addresses, and if so, sets it as the preferred network for the next outbound attempt. Drives bridge node diversity rebalancing. |
| `EvictExtraOutboundPeers()` | [`src/net_processing.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/net_processing.cpp) | Evicts an outbound peer from an over-represented network after a 9th diversity connection is established. Selects the peer that least recently announced a new block, but protects sole connections on any network type. |

### Service flags

| Flag | File | Description |
|------|------|-------------|
| `NODE_NETWORK` | [`src/protocol.h`](https://github.com/bitcoin/bitcoin/blob/master/src/protocol.h) | Advertises that the node stores the full block history and can serve any historical block to peers. |
| `NODE_NETWORK_LIMITED` | [`src/protocol.h`](https://github.com/bitcoin/bitcoin/blob/master/src/protocol.h) | Advertises that the node is pruned: it can serve recent blocks (at least the last 288) but not the full history. |
| `NODE_WITNESS` | [`src/protocol.h`](https://github.com/bitcoin/bitcoin/blob/master/src/protocol.h) | Advertises that the node supports segregated witness (SegWit). Used in DNS seed service-bit filter prefixes (e.g. `x9` = `NODE_NETWORK` &#124; `NODE_WITNESS`). |

### Connection types

Defined in [`src/node/connection_types.h`](https://github.com/bitcoin/bitcoin/blob/master/src/node/connection_types.h), with string representations in [`src/node/connection_types.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/node/connection_types.cpp).

| Type | Direction | Description |
|------|-----------|-------------|
| `OUTBOUND_FULL_RELAY` | Outbound | Full-relay outbound connection (8 by default). Exchanges addresses, transactions, and blocks. |
| `BLOCK_RELAY` | Outbound | Block-relay-only outbound connection (2 by default). Exchanges only block headers and blocks, hiding the connection from transaction and address relay side-channels. |
| `FEELER` | Outbound | Short-lived connection (~every 2 min) to test whether addresses in the peer database are reachable. Promotes peers from the `new` to `tried` table. |
| `INBOUND` | Inbound | Connection initiated by a remote peer. Up to 114 slots by default. Subject to eviction. |
| `MANUAL` | Outbound | Manually added peer via `-addnode` or `addnode` RPC. Not subject to automatic eviction. |
| `ADDR_FETCH` | Outbound | Short-lived connection opened solely to solicit addresses from a peer. |
| `PRIVATE_BROADCAST` | Outbound | Connection used to broadcast a specific transaction privately, without entering the normal relay pipeline. |

### Net permissions

Defined in [`src/net_permissions.h`](https://github.com/bitcoin/bitcoin/blob/master/src/net_permissions.h).

| Permission | Description |
|------------|-------------|
| `Relay` | Peer is allowed to send transactions to a `-blocksonly` node, overriding the global relay disable for incoming transaction acceptance. |
| `ForceRelay` | Peer can force automatic broadcast/rebroadcast of transactions, distinct from merely accepting them via `Relay`. Granted via `whitelistforcerelay`. |
| `NoBan` | Peer is exempt from being banned or discouraged. Also grants `fPreferredDownload` status (treated as preferred for block downloads, like an outbound peer). |

### P2P messages

| Message | Description |
|---------|-------------|
| `version` | Sent during the version handshake. Carries protocol version, service flags, block height, nonce, and `fRelay` flag. |
| `verack` | Version acknowledgement. Sent in response to `version`; connection is established once both sides have exchanged `version`/`verack`. |
| `inv` | Inventory announcement. Advertises that the sender has new transactions or blocks available for download. |
| `getdata` | Requests full data (transaction or block) for items previously announced via `inv`. |
| `addr` / `addrv2` | Address gossip. Propagates known peer addresses across the network. `addrv2` ([BIP 155](https://github.com/bitcoin/bips/blob/master/bip-0155.mediawiki)) extends support to Tor v3, I2P, and CJDNS addresses. |
| `filterload` | BIP 37 bloom filter loading. A light client sends this to a full node to request filtered transaction delivery. Largely deprecated. |
| `getaddr` | Requests a list of known peer addresses from a connected peer. Used by `ADDR_FETCH` connections during address bootstrapping. |
| `cmpctblock` | BIP 152 compact block message. Contains the block header, short transaction IDs, and prefilled transactions, allowing the receiver to reconstruct the block from its mempool. |
| `getblocktxn` / `blocktxn` | BIP 152 compact block round-trip. `getblocktxn` requests specific transactions missing after a `cmpctblock`; `blocktxn` delivers them. |
| `sendcmpct` | BIP 152 compact block preference message. `sendcmpct(1)` asks a peer to announce new blocks with unsolicited `cmpctblock` messages; `sendcmpct(0)` indicates low-bandwidth mode, where compact blocks are served on request. |

### Source files referenced

| File | Purpose |
|------|---------|
| [`src/net.h`](https://github.com/bitcoin/bitcoin/blob/master/src/net.h) | Core networking constants and connection management. |
| [`src/net_processing.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/net_processing.cpp) | P2P message processing logic, inventory broadcast intervals, preferred download. |
| [`src/protocol.h`](https://github.com/bitcoin/bitcoin/blob/master/src/protocol.h) | Protocol constants including service flags (`NODE_NETWORK`, `NODE_NETWORK_LIMITED`). |
| [`src/validation.h`](https://github.com/bitcoin/bitcoin/blob/master/src/validation.h) | Validation constants including `MIN_BLOCKS_TO_KEEP`. |
| [`src/node/blockstorage.h`](https://github.com/bitcoin/bitcoin/blob/master/src/node/blockstorage.h) | Block storage constants including `MAX_BLOCKFILE_SIZE`. |
| [`src/node/connection_types.h`](https://github.com/bitcoin/bitcoin/blob/master/src/node/connection_types.h) / [`.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/node/connection_types.cpp) | `ConnectionType` enum definition and string representation. |
| [`src/node/eviction.h`](https://github.com/bitcoin/bitcoin/blob/master/src/node/eviction.h) / [`.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/node/eviction.cpp) | Inbound peer eviction logic (`SelectNodeToEvict`, protection heuristics). |
| [`src/net_permissions.h`](https://github.com/bitcoin/bitcoin/blob/master/src/net_permissions.h) | Net permission flags (`Relay`, `NoBan`, etc.). |
| [`src/net.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/net.cpp) | Connection management implementation, including `MaybePickPreferredNetwork()` for bridge node diversity. |
| [`src/addrman.h`](https://github.com/bitcoin/bitcoin/blob/master/src/addrman.h) / [`.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/addrman.cpp) | Address manager constants (`ADDRMAN_HORIZON`, `ADDRMAN_RETRIES`, `ADDRMAN_MAX_FAILURES` in `.h`) and implementation. |
| [`src/kernel/chainparams.cpp`](https://github.com/bitcoin/bitcoin/blob/master/src/kernel/chainparams.cpp) | Chain parameters including hardcoded DNS seed hostnames. |

### RPC commands

| Command | Description |
|---------|-------------|
| `addnode` | Manually add or remove a peer connection. Creates a `MANUAL` connection type with its own separate 8-slot pool. |
| `sendrawtransaction` | Submit a raw transaction to the network. When `-privatebroadcast` is enabled, these transactions are relayed over dedicated Tor/I2P connections. |
| `getblockchaininfo` | Returns information about the blockchain, including current chain height and disk usage. |

:::
