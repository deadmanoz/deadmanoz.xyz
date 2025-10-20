---
title: 'P2MS Data Carry Part 1: Fundamentals and Examples'
excerpt: 'Examining the techniques of P2MS data carriage'
coverImage: '/assets/blog/p2ms-data-carry/p2ms-data-carry-cover-1.png'
date: '2025-10-16T00:00:00.000Z'
author:
  name: deadmanoz
ogImage:
  url: '/assets/blog/p2ms-data-carry/p2ms-data-carry-cover-1.png'
hidden: false
---

## tl;dr

Pay-to-Multisig (P2MS) is Bitcoin's original multisig format, since superseded by more efficient alternatives like P2SH and P2WSH.
Even so, it persisted - and still persists - as a vehicle for data carriage, with multiple protocols embedding payloads into fake pubkeys inside Bitcoin transactions.
Three major protocols dominate this practice: Bitcoin Stamps, Counterparty and Omni. 

Bitcoin Stamps employs ARC4 obfuscation (TXID-keyed) and can be identified by distinctive Key Burn patterns in the original pub keys (`0x0222...`, `0x0333...`, etc).
A protocol identifier, e.g., `stamp:`, appears only once in the deobfuscated key data.
Bitcoin Stamps uses {{green:1-of-3}} P2M outputs, with one Key Burn pubkey and two data pubkeys per output, so no private keys exist that can spend the output.

Counterparty also uses ARC4 obfuscation (TXID-keyed) but is identified by the string `CNTRPRTY` being present in the deobfuscated key data.
The identifier appears once per ARC4-obfuscated output, so multi-output transactions sacrifice data carrying efficiency.
Counterparty maintains at least one real pubkey per output in its {{green:1-of-2}} or {{green:1-of-3}} configurations, so most Counterparty-related P2MS outputs remain spendable in theory (apart from [Classic Stamps](#bitcoin-stamps---classic-stamp-image-counterparty-transport)).

Omni distinguishes itself through obfuscation based on SHA-256+XOR, keyed to the sender's address, and identification via the Exodus address (`1EXoDusj...`) in adjacent transaction outputs.
Omni also maintains valid pubkeys in its {{green:1-of-2}} or {{green:1-of-3}} structures, so all Omni P2MS outputs can also be spent (again, in theory).

A number of minor protocols, using identifiers such as `CHANCECO` (Chancecoin), `TB0001`, `TEST01` and `METROXMN`, also leverage P2MS for data carrying purposes.
Beyond protocol-based approaches, P2MS has also been used for generic data storage, with notable examples including the Bitcoin whitepaper PDF and Wikileaks Cablegate files.

## Introduction

This post is the first in a series of posts that will explore how the Bitcoin blockchain is used for data carriage.
Data carriage refers to the practice of embedding arbitrary, non-financial data into Bitcoin transactions and storing it permanently on the blockchain.
Data carriage is a controversial topic in the Bitcoin community, with some viewing it as a legitimate use case for the blockchain, while others see it as an abuse of the system that adds blockchain bloat and raises costs for everyone.

While there are many ways to embed data in Bitcoin transactions, this and the following post will explore the use of Pay-to-Multisig (P2MS) script types for data carriage. 
This instalment explains the fundamentals of P2MS and how it's used for data carriage while [Part 2](./p2ms-data-carry-2) examines the magnitude of P2MS data carriage and its implications.
Note that this post goes into detail in breaking down examples of the various protocols; these examples are collapsed by default but can be expanded.

The use of P2MS script types seemed like a good place to start because:
- It's the legacy script type for multisig that has long been superseded by other script types that enable multisig, including P2SH and P2WSH, with these newer script types being more economical to use.
- Given the above, there's no real reason for anyone to use P2MS for multisig, yet it *is* still used, for data carriage.
- There's been a significant increase in P2MS UTXOs since early 2023 as per {@fig:p2ms_analysis}, yet the encumbered value remains **tiny**.
- P2MS data carrying is regularly used, albeit much less so than other approaches (e.g., P2TR-based approaches), but it remains understudied compared to other approaches.

There have been a number of analyses of data carriage in Bitcoin, but they generally focus on the other data carriage methods. Pay-to-Fake-Multisig (P2FMS) as the use of P2MS for data carriage is sometimes called, is often just a side note.
See the [References](#references) section for links to some of these other analyses.

![Figure: the number of P2MS UTXOs and encumbered value over time (block height increments of 50,000).](/assets/blog/p2ms-data-carry/p2ms_analysis.png) {#fig:p2ms_analysis}

## P2MS fundamentals

P2MS is a script type that allows users to lock bitcoins to multiple ({{green:n}}) public keys, and require signatures for some or all ({{green:m}}) of those public keys to unlock and spend; an {{green:m-of-n}} multisig.
P2MS is sometimes referred to as raw or bare multisig, as the public keys used to create the lock are directly accessible in the locking script (the `ScriptPubKey`).
This is in contrast to the more modern multisig constructs of P2SH and P2WSH where the public keys used to create the lock are obfuscated by hashing before being input into the locking script.

Here's an example of a recent transaction from block height [903,379](https://mempool.space/block/00000000000000000000708a6447d56220de4d4b2ac7462a6f533d3609320be5) (June 2025) that features two P2MS outputs that are relevant to the following content: [eb96a65e...](https://mempool.space/tx/eb96a65e4a332f2c84cb847268f614c037e038d2c386eb08d49271966c1b0000)

The `ScriptPubKey` of the first P2MS output is:

![Figure: the first P2MS output as shown on mempool.space.](/assets/blog/p2ms-data-carry/mempool.space-p2ms-output.png) {#fig:mempool-p2ms-output}

```
512103d587bbd682a301f2933de3efd59ec3aa0e5a305d3b4597a8d71880895ebd9f002102660224cd2ffbf92fada23aa883f0c51f2d55ae13394a40d6538ff2a63d0dce002102020202020202020202020202020202020202020202020202020202020202020253ae
```

This `ScriptPubKey` is 105 bytes, comprised of the following:
- OP_1 (`51`), this is {{green:m}} in the {{green:m-of-n}} multisig
- 3x sets of OP_PUSHBYTES_33 (`21`) followed by 33-byte public keys
	- `21 03d587bbd682a301f2933de3efd59ec3aa0e5a305d3b4597a8d71880895ebd9f00`
	- `21 02660224cd2ffbf92fada23aa883f0c51f2d55ae13394a40d6538ff2a63d0dce00`
	- `21 020202020202020202020202020202020202020202020202020202020202020202`
- OP_3 (`53`), this is {{green:n}} in {{green:m-of-n}}, so it's a {{green:1-of-3}} multisig
- OP_CHECKMULTISIG (`ae`)

Those first two public keys on the surface look like they could be proper public keys, but that 3rd key looks "fake".
Indeed, even [mempool.space](https://mempool.space/tx/eb96a65e4a332f2c84cb847268f614c037e038d2c386eb08d49271966c1b0000) indicates as such, what's the deal with that?

![Figure: mempool.space marking the P2MS as having a fake pubkey.](/assets/blog/p2ms-data-carry/mempool.space-p2ms-fake-pubkey.png) {#fig:mempool-p2ms-fake-pubkey}

## Fake keys

The 3rd key is indeed a fake key in the sense that it's not a public key that has a known corresponding private key.
This fake key, `020202020202020202020202020202020202020202020202020202020202020202`, is actually one of the *Key Burn* addresses that are used by Bitcoin Stamps, one of the leading data carrying protocols that use P2MS. 

The ability to generate predetermined patterns of public keys such as Key Burn addresses in this instance, or burn addresses in general, is almost impossible because it requires generating a private key that leads to the desired public key.
Said another way, the probability of arriving at a pre-determined pattern for an ECC-256 public key is "infinitesimally small to the point where a computer would need to grind away at keys for billions of years in order to produce a valid private key" [[Bitcoin Stamps||https://github.com/mikeinspace/stamps/blob/main/Key-Burn.md]]. 

Because of the near impossibility of generating a private key that leads to a predetermined pattern in a public key, the existence of a highly improbably patterned public key is accepted as evidence that there is no corresponding private key... and that the key cannot be used to spend the output!

According to the [official Bitcoin Stamps protocol documentation](https://github.com/mikeinspace/stamps/blob/main/Key-Burn.md), there are 4 Key Burn addresses/patterns/public keys:
- `022222222222222222222222222222222222222222222222222222222222222222`
- `033333333333333333333333333333333333333333333333333333333333333333`
- `020202020202020202020202020202020202020202020202020202020202020202`
- `030303030303030303030303030303030303030303030303030303030303030303`

The Key Burn technique assigns one of the above Key Burn keys to last key position in the {{green:1-of-3}} multisig, leaving the first two keys as possibilities to spend the output.

The first two keys, however, are actually the data-carrying component (as we shall later learn from understanding how Bitcoin Stamps works), although we can't always definitively prove that they represent "fake" public keys.
That is, we can run a check to see if a given public key is a valid point on the ECDSA secp256k1 curve, if it is not, we know that it is truly a fake public key, yet if it is a valid point, then it could either be a true key or just "data" that happens to correspond to a point on the curve!

For example, using the 1st and 2nd keys above:
- 1st key: `03d587bbd682a301f2933de3efd59ec3aa0e5a305d3b4597a8d71880895ebd9f00` is a valid point
- 2nd key: `02660224cd2ffbf92fada23aa883f0c51f2d55ae13394a40d6538ff2a63d0dce00` is NOT a valid point

:::collapse{CODE: Python code to validate a public key on the secp256k1 curve}
```python
# Validate public key on secp256k1 curve
# Returns True if point (x,y) satisfies: y² = x³ + 7 (mod p)

p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F

def is_valid_pubkey(pubkey_hex):
    """Check if public key is valid point on secp256k1"""
    pub_bytes = bytes.fromhex(pubkey_hex)

    if len(pub_bytes) == 33:  # Compressed
        prefix, x = pub_bytes[0], int.from_bytes(pub_bytes[1:], 'big')
        y_squared = (pow(x, 3, p) + 7) % p
        y = pow(y_squared, (p + 1) // 4, p)

        if pow(y, 2, p) != y_squared:
            return False

        # For any valid x, there are two valid y values: y and p - y
        # If calculated y doesn't match prefix parity, use the other root
        if (y % 2 == 1) == (prefix == 0x02):
            y = p - y

        return (y % 2 == 0) == (prefix == 0x02)

    elif len(pub_bytes) == 65:  # Uncompressed
        x = int.from_bytes(pub_bytes[1:33], 'big')
        y = int.from_bytes(pub_bytes[33:], 'big')
        return (pow(y, 2, p) - pow(x, 3, p) - 7) % p == 0

    return False

# Usage: is_valid_pubkey("03d587bbd682a301f2933de3efd59ec3aa0e5a305d3b4597a8d71880895ebd9f00")
```
:::

Suffice it to say, checking whether a given public key is a valid point on the ECDSA secp256k1 curve is insufficient to definitely prove that the key is data or otherwise - sometimes a public key will be a valid point yet it just represents data (as with the 1st key above).

We have yet to see how keys can represent data; let’s examine how data is embedded.

## Data carrying in P2MS - A Bitcoin Stamps example

Note that the following is provided to give a concrete example of how Bitcoin Stamps embeds arbitrary, non-financial data into Bitcoin transactions; the aim is not to cover the minutiae of how such protocols operate at a higher level (e.g., deploying, minting, transferring etc.).

Bitcoin Stamps inserts data into {{green:1-of-3}} P2MS transaction outputs, with the data encoded to look like public keys for the first two keys ("data keys"), and a Key Burn address used for the third.
Setting the Key Burn address aside, with compressed public keys being 33 bytes, the first and last bytes are stripped from each of the data keys, leaving 31 bytes apiece.
Concatenate the byte strings into a single 62-byte string:

```
d587bbd682a301f2933de3efd59ec3aa0e5a305d3b4597a8d71880895ebd9f + 
660224cd2ffbf92fada23aa883f0c51f2d55ae13394a40d6538ff2a63d0dce
```

If the transaction contains two or more P2MS outputs, then the above process is followed for each output: take the first two public keys, disregard the Key Burn, strip bytes and concatenate the data key byte strings.
Then concatenate such strings from each transaction output into a single byte string.

For our example transaction, there's a 2nd multisig output that has the following data keys:

```
03e34afbaa13450d01f91c6633f7e9cd5893c6096f9087b347a2479c7add951700
02ae587815be570ac6344c49be194daa07e4b8de982f16c8175a981cd0ff4d2200
```

Stripped:

```
e34afbaa13450d01f91c6633f7e9cd5893c6096f9087b347a2479c7add9517 +
ae587815be570ac6344c49be194daa07e4b8de982f16c8175a981cd0ff4d22
```

Concatenating the byte string from the first and second output yields the following 124-byte string:

```
d587bbd682a301f2933de3efd59ec3aa0e5a305d3b4597a8d71880895ebd9f + 
660224cd2ffbf92fada23aa883f0c51f2d55ae13394a40d6538ff2a63d0dce +
e34afbaa13450d01f91c6633f7e9cd5893c6096f9087b347a2479c7add9517 +
ae587815be570ac6344c49be194daa07e4b8de982f16c8175a981cd0ff4d22
```

The resulting byte string can now be decoded into meaningful data.
Bitcoin Stamps uses the ARC4 ([[RC4||The name RC4 is trademarked, so RC4 is often referred to as ARC4]]) stream cipher to obfuscate the original data before embedding it, with a key that is the transaction ID (TXID) corresponding to the first transaction input (`vin[0]`).
For our example transaction [eb96a65e...](https://mempool.space/tx/eb96a65e4a332f2c84cb847268f614c037e038d2c386eb08d49271966c1b0000), the TXID corresponding to the first transaction input is:

```
7568f57ecf417e19edefc810f9bbd34d2a62eb770d8492396ceffed3c5dc7348
```

Via:
```
bitcoin-cli getrawtransaction eb96a65e4a332f2c84cb847268f614c037e038d2c386eb08d49271966c1b0000 | xargs bitcoin-cli decoderawtransaction | jq '.vin[0].txid'
```

Using `7568f57e...` as the deobfuscation key, the byte string is deobfuscated to the following.
Note that ARC4 being a stream cipher means that deobfuscation preserves length - 124 bytes in, 124 bytes out.

```
003f7374616d703a7b2270223a227372632d3230222c226f70223a227472616e73666572222c227469636b223a22424d574b222c22616d74223a2231303030227d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

The first two bytes, `003f`, is the length of the decoded data in hex - this is just `63`.
That is, the 63 bytes following the initial two bytes are the meaningful data, with the remaining data being meaningless (the remaining bytes are zero padding).

Decoding the meaningful 63 bytes with UTF-8 gives:

```
'stamp:{"p":"src-20","op":"transfer","tick":"BMWK","amt":"1000"}'
```
Note that in the above there are no spaces - [_"in order to minimize the transaction size spaces are not used in the serialized JSON string which is constructed by the SRC-20 reference wallet"_](https://github.com/stampchain-io/stamps_sdk/blob/main/docs/src20specs.md).
Prettier formats to the following.
```JSON
stamp: {
	"p":"src-20",
	"op":"transfer",
	"tick":"BMWK",
	"amt":"1000"
}
```

So we've taken the two P2MS transaction outputs and transformed it to the above data.
But we've still got some other aspects of the transaction, such as the two other non-P2MS transaction outputs and the output values, that we should briefly consider.

### Non-P2MS transaction outputs and output values

The first transaction output, `vout[0]`, with an address [bc1qmgl3u9m7...](https://mempool.space/address/bc1qmgl3u9m7geanw8tlcydrd8qd44awh2660mpg5a) is the transfer destination.
Transfer because this is what the `op` was in this example; in other cases it might be the "minter" or "deployer" etc.
The main point is that `vout[0]` is always some real address.

The 4th transaction output, `vout[3]`, with an address [bc1qdmsmn42q...](https://mempool.space/address/bc1qdmsmn42qajk7ucmkhcszmcd6g7e3svq0jyx3l5), is the change address.
In this example, it's actually just the same address that was the single transaction input to this transaction - change is going back to original spending address.

The transaction details in {@fig:mempool-p2ms-tx-details} show that the first three outputs have a value of 790 sats each.
I don't think this value has any significance other than it safely exceeds all dust limits - [the highest being 546 sats for P2PKH for the default configuration of 3 sat/vByte](https://bitcoin.stackexchange.com/questions/10986/what-is-meant-by-bitcoin-dust).
That is, these values ensure that each output and thus the overall transaction is valid, yet is low enough to have [[low monetary value||With BTC valued at US$107.634K at the time of writing, 790 sats is ~US$0.85]].

![Figure: the transaction details.](/assets/blog/p2ms-data-carry/mempool.space-p2ms-tx-details.png) {#fig:mempool-p2ms-tx-details}

### Unspendable P2MS outputs

In the above we established that the P2MS transaction outputs were actually purely for data carrying (or were Key Burn) and did not involve real public keys. 
As such, these P2MS outputs are effectively unspendable outputs, and, given the current design of Bitcoin, [[they'll remain in the UTXO set of every Bitcoin node||At least until quantum computers can derive private keys for those keys that might be valid points on the ECDSA secp256k1 curve]].
Each time there's a transaction that embeds data in P2MS outputs in the manner described above, there will be at least one, but possibly more, new unspendable P2MS UTXOs added to the UTXO set.

Note that this is, perhaps obviously, intentional.
As is noted in the [Bitcoin Stamps documentation](https://github.com/mikeinspace/stamps/blob/main/BitcoinStamps.md):
>"By doing so, the data is preserved in such a manner that is impossible to prune from a full Bitcoin Node, preserving the data immutably forever."

I think many would consider this wasteful - every time there is some form of individual activity on Bitcoin Stamps, such as the transfer operation from the above example, there's a one-to-one mapping to activity on Bitcoin, tracked forever, by all Bitcoin nodes!
It's probably worth examining Bitcoin Stamps in a bit more detail to better understand the what and why.

## Bitcoin Stamps

Bitcoin Stamps were developed in response to most NFTs being _"merely image pointers to centralized hosting or stored on-chain in prunable witness data"_.
They were a means to achieve permanence in _"storing art on the blockchain"_ and indeed STAMP is an acronym for Secure, Tradeable Art Maintained Securely.
The [original spec](https://github.com/mikeinspace/stamps/blob/main/BitcoinStamps.md) also stated that Bitcoin Stamps encode:
>_"an image's binary content to a base64 string, placing this string as a suffix to `STAMP:` in a transaction's description key, and then broadcasting it using the Counterparty protocol onto the Bitcoin ledger._
>_The length of the string means that Counterparty defaults to bare multisig, thereby chunking the data into outputs rather than using the limited (and prunable) OP_RETURN._
>_By doing so, the data is preserved in such a manner that is impossible to prune from a full Bitcoin Node, preserving the data immutably forever."_

The above examination of the [`eb96a65e...`](https://mempool.space/tx/eb96a65e4a332f2c84cb847268f614c037e038d2c386eb08d49271966c1b0000) transaction is but just one example of Bitcoin Stamps embedding arbitrary data in P2MS outputs.
In fact, Bitcoin Stamps has used a variety of techniques since the first transactions, [`17686488...`](https://jpja.github.io/Electrum-Counterparty/decode_tx.html?tx=17686488353b65b128d19031240478ba50f1387d0ea7e5f188ea7fda78ea06f4) and [`eb3da814...`](https://jpja.github.io/Electrum-Counterparty/decode_tx.html?tx=eb3da8146e626b5783f4359fb1510729f4aad923dfac45b6f1f3a2063907147c), were included in Block [779,652](https://mempool.space/block/00000000000000000002ea8eb5df114c3f198c7ef5851435e8a4d8e7bd33121c).

As the above text alluded to, Bitcoin Stamps started out leveraging Counterparty (which has been around since 2014 and is covered in the [Counterparty](#counterparty) section).
Specifically, Bitcoin Stamps ("Classic Stamps") were initially a numerical asset on Counterparty, with data encoded via either P2MS or P2WSH.
P2MS Classic Stamps were encoded in the almost the same manner as the example explored above:
- ARC4 obfuscation/deobfuscation keyed with the TXID of the first transaction input
- Key Burn alongside data keys, no real pubkey present

However, the deobfuscated data must first contain the `CNTRPRTY` prefix, followed by some Counterparty message fields, before a `STAMP:` prefix variant and Bitcoin Stamps specific data is found.
That is, Classic Bitcoin Stamps used Counterparty transactions as a transport mechanism to embed data in Bitcoin transactions.
See [Bitcoin Stamps - Classic Stamp image (Counterparty transport) example](#bitcoin-stamps---classic-stamp-image-counterparty-transport) for a breakdown of such a transaction.

### Bitcoin Stamps sub-protocols
Since then, Bitcoin Stamps has become or leveraged a suite of sub-protocols or formats, including SRC-20, SRC-101, SRC-721, SRC-721r, OLGA, with each purportedly serving a different purpose.
Note that not all of these forms use P2MS, for example the [OLGA Stamp uses P2WSH outputs](https://github.com/mikeinspace/stamps/blob/main/OLGA.md).
As the interest here is P2MS, we'll only focus on the aspect of Bitcoin Stamps that leverage P2MS: Classic Stamps, SRC-20, SRC-101, SRC-721.

The initial example of Bitcoin Stamps using P2MS above ([Data carrying in P2MS - A Bitcoin Stamps example](#data-carrying-in-p2ms---a-bitcoin-stamps-example)) is an example of SRC-20.
SRC-20 was developed in response to the BRC-20 craze of early 2023, with SRC-20 offering stronger permanence guarantees due to use of non-witness transaction data.
Aside: if you're interested in knowing more about BRC-20 and the history of Ordinals and Inscriptions be sure to check out Binance Research's ["BRC-20 Tokens: A Primer" (May 2023)](https://research.binance.com/static/pdf/BRC-20%20Tokens%20-%20A%20Primer.pdf) piece.
Most Bitcoin Stamps related Bitcoin transactions involve SRC-20.

[SRC-101 is a domain name system native to Bitcoin Stamps](https://bitname.gitbook.io/bitname/src-101), similar to something like the Ethereum Name Service (ENS).
Such systems are, for example, used to replace standard Bitcoin addresses like `bc1q34eaj4rz9yxupzxwza2epvt3qv2nvcc0ujqqpl` with simple, human-readable names like `alice.btc`.
The permanence of P2MS, and the guarantee of unspendability via the use of no real pubkeys, were purportedly the rationale for developing SRC-101.

All this is to say that, even within a single ecosystem (Bitcoin Stamps), there are a number of permutations and variants of how data is encoding for data carrying purpose that we need to consider for classification and analysis purposes.

### Bitcoin Stamps - Classic Stamp image (Counterparty transport)
:::collapse{EXAMPLE: Bitcoin Stamps - Classic Stamp image (Counterparty transport)}

[`54fdeda9...`](https://mempool.space/tx/54fdeda90c4573f8a93fa45251a3c6214bcc79aa8549728dfb08ffe3e7dd3d81) is a transaction from block height [809,193](https://mempool.space/block/000000000000000000048a022a551b879bd87160c55b22e1f3b9a3d3b2410094) with 79 outputs, 77 of which are P2MS outputs.
A review of the P2MS outputs shows that all have the `022222222222222222222222222222222222222222222222222222222222222222` Key Burn pattern and the TXID of `vin[0]` is :

```
3b2b5e1de60ba341b8ba85e35b09800edb118dc7bee246d54b11420f01aabac5
```

Armed with this as the deobfuscation key, we can attempt to decode the data embedded in the 77 P2MS outputs.
Let's examine the first three P2MS outputs to illustrate the process.

#### 1st P2MS output

Pubkeys:
```
02e6e725b168f3eeafa527053d43d06c9569a393c34d0e5c2dad2236b785eaed70
02acb6c9432134cad7242dbbd531c44e5ec5918e31d65adab1b2ffb2d3588c7d36
```

Stripped and concatenated:
```
e6e725b168f3eeafa527053d43d06c9569a393c34d0e5c2dad2236b785eaed +
acb6c9432134cad7242dbbd531c44e5ec5918e31d65adab1b2ffb2d3588c7d
```

Deobfuscated with TXID of `vin[0]`:
```
3d434e54525052545914575ed3597b0aa71d00000000000000230001005354 +
414d503a52306c474f446c686f41436741504d5041487a4741502f2f2f7777
```

ASCII interpretation (some characters replaced with `.`):
```
.CNTRPRTY.......STAMP:R0lGODlhoACgAPMPAHzGAP///ww
```

#### 2nd P2MS output

Pubkeys:
```
03e6e725b168f3eeafa5621322e3c853da83f6d2802a4f136cec6c79f0d0e1f8c4
02a690d838397ce3d1252bbffc0eae7961e2b5ba20c759cfb7a384f6cb10ba4bb6
```

Stripped and concatenated:
```
e6e725b168f3eeafa5621322e3c853da83f6d2802a4f136cec6c79f0d0e1f8 +
a690d838397ce3d1252bbffc0eae7961e2b5ba20c759cfb7a384f6cb10ba4b
```

Deobfuscated with TXID of `vin[0]`:
```
3d434e545250525459514141734144454d48414367414f41416d4f46555841 +
4b6b41414a7845414e426841502b745866747941504b6f41502b6b37674141
```

ASCII interpretation:
```
=CNTRPRTYQAAsADEMHACgAOAAmOFUXAKkAAJxEANBhAP+tXftyAPKoAP+k7gAA
```

#### 3rd P2MS output

Pubkeys:
```
02e6e725b168f3eeafa572112bbfca27aa88e8d58d095f0a6feb4c5f82f2f8ce20
03a8bad838326c8dc13a2f8dfc1fd54c7accea8834ae65c4b19fdbfca4079750c7
```

Stripped and concatenated:
```
e6e725b168f3eeafa572112bbfca27aa88e8d58d095f0a6feb4c5f82f2f8ce +
a8bad838326c8dc13a2f8dfc1fd54c7accea8834ae65c4b19fdbfca4079750
```

Deobfuscated with TXID of `vin[0]`:
```
3d434e5452505254594143482f4330354656464e44515642464d6934774177 +
4541414141682b5151465a4141504143482b4b55397764476c746158706c5a
```

ASCII interpretation:
```
=CNTRPRTYACH/C05FVFNDQVBFMi4wAwEAAAAh+QQFZAAPACH+KU9wdGltaXplZ
```

Whenever we see `434e545250525459` in deobfuscated output, we have found the `CNTRPRTY` identifier.
Focusing on the first P2MS output, because we have the `CNTRPRTY` prefix, we have to interpret the following bytes according to the Counterparty protocol.
Now, depending on whether the transaction represents a "legacy" Counterparty transaction or a "modern" Counterparty transaction, changes the interpretation of data.
Turns out that this is a "modern" form where the message type is a single byte rather than the 4 bytes for "legacy" Counterparty transactions.
Here's a breakdown of the first P2MS output:

| Byte Position | Hex (or ASCII) | Interpretation |
|---|---|---|
| 0 | `3d` | Length prefix: 61 |
| 1-8 | `434e545250525459` | `CNTRPRTY` prefix |
| 9 | `14` | Message type 20 (Issuance) |
| 10-17 | `575ed3597b0aa71d` | Asset ID: 6295701710380377885 |
| 18-25 | `0000000000000023` | Asset issue amount: 35 |
| 26 | `00` | Divisible: False |
| 27 | `01` | Lock: True |
| 28 | `00` | Reset: False |
| 29-61 | `5354414d503a5230...` | Description: `STAMP:R0lGODlhoACgAPMPAHzGAP///ww` |

Also note that whenever we see `5354414d503a` or `5354414d50533a` in the decoded output we have found `STAMP:` or `STAMPS:`, respectively (with lowercase variants `7374616d703a` for `stamp:` and `7374616d70733a` for `stamps:`).
It's the description field where further decoding or interpretation is clearly necessary; we see the `STAMP:` prefix following by a bunch of random characters.
These random characters are actually [base64 encoded data of an image](https://github.com/mikeinspace/stamps/blob/main/BitcoinStamps.md#bitcoin-stamps):

> _"encoding an image's binary content to a base64 string, placing this string as a suffix to `STAMP:` in a transaction's description key, and then broadcasting it using the Counterparty protocol onto the Bitcoin ledger... `STAMP:<base64 data>`"_

Typically, there would be some "magic bytes" or MIME-type and encoding for image data, but the rationale for the absence of this data in Bitcoin Stamps payloads was [given as](https://github.com/mikeinspace/stamps/blob/main/BitcoinStamps.md#absence-of-mime-type-and-encoding):
> - _"The fewer the bytes the better."_
> - _"Given the limited scope of acceptable file formats, we are confident that decoding them accurately based on the base64 string alone is trivial."_
> - _"We are only interested in decoding base64, so if the string does not conform to valid base64 it is rejected._
> _Therefore, specification of the encoding is unnecessary."_

Anyway, before we deal with the base64 we need to handle the other P2MS outputs.
It can perhaps be inferred from the 2nd and 3rd P2MS outputs above that each P2MS output will have the `CNTRPRTY` identifier (prefixed by a length prefix).
That is, each P2MS output has 9 bytes (1 length prefix, 8 `CNTRPRTY`) reserved for the Counterparty protocol, so the true data carrying capacity is only: (62 - 9)/62 = 85.4%.
This is probably one reason why Bitcoin Stamps opted for a new protocol - improve efficiency by not requiring a length prefix and `CNTRPRTY` identifier in each P2MS output.

Once we've stripped all length prefixes and `CNTRPRTY` identifiers from all the deobfuscated P2MS outputs and concatenated them, we end up with 4,004 bytes of base64 data which decodes to a 3,003-byte GIF.
The size discrepancy is base64 encoding overhead: every 4 base64 characters is 3 bytes of binary data, so 4,004 / 4 = 1,001 groups x 3 = 3,003 bytes.
The recovered image is shown in {@fig:54fdeda9.gif}.

This example has shown how Bitcoin Stamps created 77 P2MS unspendable outputs in transaction [`54fdeda9...`](https://mempool.space/tx/54fdeda90c4573f8a93fa45251a3c6214bcc79aa8549728dfb08ffe3e7dd3d81) for the purpose of storing a single 3kB GIF.

![Figure: the GIF embedded in the 77 P2MS outputs of transaction `54fdeda9...`.](/assets/blog/p2ms-data-carry/54fdeda90c4573f8a93fa45251a3c6214bcc79aa8549728dfb08ffe3e7dd3d81.gif) {#fig:54fdeda9.gif}

:::

## Counterparty
We began our exploration of data carrying in P2MS with Bitcoin Stamps because this protocol is both the most prolific user of P2MS for data carrying purposes, and is largely the only protocol still in active use today. 
It started, however, with Classic Stamps leveraging Counterparty, which was the first protocol to start using P2MS for data carrying purposes in a significant way back in 2014. 

We won't dwell much on the history of Counterparty here, it's incredibly well documented elsewhere, including:
- [BitMEX Research - Battle of the Dexes (September 2020)](https://blog.bitmex.com/battle-of-the-dexes/)
- [BitMEX Research - The OP_Return Wars of 2014 – Dapps Vs Bitcoin Transactions (July 2022)](https://blog.bitmex.com/dapps-or-only-bitcoin-transactions-the-2014-debate/)

[[It is, however perhaps worth noting||Given the current ongoing discussion around `OP_RETURN` and Bitcoin Core v30]] that Counterparty, via the adoption of P2MS for data carrying, was a key factor in the decision [make `OP_RETURN` transactions standard in Bitcoin Core 0.9.0 (March 2014)](https://bitcoin.org/en/release/v0.9.0#opreturn-and-data-in-the-block-chain):

> "On `OP_RETURN`: There was been (sic) some confusion and misunderstanding in the community, regarding the `OP_RETURN` feature in `0.9` and data in the blockchain.
> This change is not an endorsement of storing data in the blockchain.
> The `OP_RETURN` change creates a provably-prunable output, to avoid data storage schemes – some of which were already deployed – that were storing arbitrary data such as images as forever-unspendable TX outputs, bloating bitcoin’s UTXO database."

> "Storing arbitrary data in the blockchain is still a bad idea; it is less costly and far more efficient to store non-currency data elsewhere."

Counterparty was created to enable features like user-created tokens (assets), decentralised exchanges ("dexes"), and other financial primitives without requiring changes to the Bitcoin protocol.
By encoding its protocol messages in Bitcoin transactions, Counterparty leveraged Bitcoin's security and immutability to create a financial platform on top of Bitcoin.
The protocol initially used P2MS outputs for data embedding before transitioning to `OP_RETURN` outputs once they became _**standard**_, though P2MS continued to be used for larger transactions that exceeded `OP_RETURN`'s (standardness) size limits.
Counterparty's approach was influential in demonstrating both the potential and controversy of using Bitcoin for purposes beyond simple value transfer.

Counterparty is also of some importance in being the [[single largest example of proof-of-burn in Bitcoin||According to the 2025 paper titled "Bitcoin Burn Addresses: Unveiling the Permanent Losses and
Their Underlying Causes", Counterparty accounts for 66.6% of the total bitcoins lost in burn addresses]].
Proof-of-burn was seen as a way to bootstrap the Counterparty ecosystem without requiring an ICO or pre-mining, which were common practices at the time.
Proof-of-burn involves sending Bitcoin to an unspendable address, effectively "burning" the Bitcoin, and, in the Counterparty case, receiving Counterparty (XCP) tokens in return.
During January 2014, Counterparty distributed XCP tokens to those who sent Bitcoin to the provably unspendable [`1CounterpartyXXXXXXXXXXXXXXXUWLpVr`](https://mempool.space/address/1CounterpartyXXXXXXXXXXXXXXXUWLpVr) address.
To date, 2,130.99165372 Bitcoin has been permanently destroyed in being sent to this address.

### Embedding Counterparty transactions in Bitcoin
In general, to know if a transaction involving P2MS outputs is a Counterparty transaction, we actually have to treat the transaction data in a number of different ways.
The majority of Counterparty data is, like Bitcoin Stamps, obfuscated by ARC4, keyed with the TXID of the first input (`vin[0]`).
However, unlike Bitcoin Stamps, there is no Key Burn key that provides a simple indication that a transaction is a Counterparty transaction; keys in Counterparty are either valid public keys or are data-carrying.

There is a minority of Counterparty transactions that does not, however, use ARC4 obfuscation, and all that is required is simple ASCII decoding.
An example of such is outlined in [Counterparty - no ARC4 obfuscation](#counterparty---no-arc4-obfuscation).

Regardless of whether there is ARC4 obfuscation or not, the definitive indication that a Bitcoin transaction is a Counterparty transaction is if the string `CNTRPRTY` is present in the data.
For the majority of Counterparty transactions involving ARC4, the deobfuscation process is necessary before `CNTRPRTY` can be detected, for those lacking ARC4 obfuscation, it is relatively straightforward to identify the `CNTRPRTY` prefix via ASCII decoding of P2MS data keys.

In addition to there being a mix of data-encoding techniques, Counterparty also [[(primarily)||Though there are a small number of Counterparty transactions using {{green:2-of-2}}, {{green:3-of-3}} and {{green:2-of-3}}]] uses both {{green:1-of-2}} and {{green:1-of-3}} P2MS transaction outputs.
Depending on which, and when the Counterparty transaction was constructed, the real pubkey is in a different position:
- for {{green:1-of-2}}, the real pubkey is the first of the two keys
- for {{green:1-of-3}}, the real pubkey is either the first (newer) or last (older) of the three keys

Being a real pubkey, and with each multisig requiring one key to spend, most Counterparty UTXOs can be spent, and thus removed from the UTXO set.
Contrast this with Bitcoin Stamps, where the keys are either Key Burn or data keys thus no private key exists to spend the UTXO, so they will remain in the UTXO set.

The remaining key(s) in each configuration are the data carrying component.
And again, depending on which particular variant of the Counterparty protocol we're dealing with, we may need to strip the first and last bytes from a pubkey like was necessary for Bitcoin Stamps, or no such stripping is required, and entire key encodes data.

The [current, official Counterparty protocol specification](https://docs.counterparty.io/docs/advanced/protocol/) states the following:
> _For identification purposes, every Counterparty transaction’s ‘data’ field is prefixed by the string `CNTRPRTY`, encoded in UTF‐8._
> _This string is long enough that transactions with outputs containing pseudo‐random data cannot be mistaken for valid Counterparty transactions._
> _In testing (i.e. using the `TESTCOIN` Counterparty network on any blockchain), this string is ‘XX’._

> _Counterparty data may be stored in three different types of outputs, or in some combinations of those formats._
> _All of the data is obfuscated by ARC4 using the transaction identifier (TXID) of the first unspent transaction output (UTXO) as the obfuscation key._

> _Multi‐signature data outputs are one‐of‐three outputs where the first public key is that of the sender, so that the value of the output is redeemable, and the second two public keys encode the data, zero‐padded and prefixed with a length byte._

The following examples examine a few Counterparty transactions that use some of the various methods described above to encode a variety of data in P2MS transactions.

### Counterparty - no ARC4 obfuscation
:::collapse{EXAMPLE: Counterparty - no ARC4 obfuscation}
Let's look at an example of a simple Counterparty transaction from block [290,929](https://mempool.space/block/0000000000000000c548d152b0873eabd83cfba496bb5dddfb2a639b65bf5e9e), [`585f50f1...`](https://mempool.space/tx/585f50f12288cd9044705483672fbbddb71dff8198b390b40ab3de30db0a88dd) that has a single {{green:1-of-2}} P2MS output.
For this transaction, the two keys are:
- `02dd842167b625c60c10eda494eadd54df7b30f372d717b946b1912f0ce59dddf6`
- `1c434e5452505254590000000000000000000000010000000001312d0000000000`

Even from just looking at these keys, [[it should be pretty obvious that the second is likely not a real pubkey!||The leading `1c` is a big give away, valid compressed (33-byte) pubkeys have `02` or `03` prefixes]]
If we try to decode this 2nd key as ASCII we can immediately observe `CNTRPRTY` in the output.
For completeness, breaking it down (using knowledge of Counterparty message structure) we have:

| Byte Position | Hex | Interpretation |
|---|---|---|
| 0 | `1c` | Padding/length indicator (28) |
| 1-8 | `434e545250525459` | `CNTRPRTY` prefix |
| 9-12 | `00000000` | Message Type 0 (Basic Send) |
| 13-20 | `0000000000000001` | Asset ID 1 (XCP) |
| 21-28 | `0000000001312d00` | Quantity: 20,000,000 = 0.2 XCP |
| 29-32 | `00000000` | 4 null bytes |

:::

### Counterparty - ARC4 obfuscation
:::collapse{EXAMPLE: Counterparty - ARC4 obfuscation}
Here's an example of another relatively simple Counterparty transaction, this time from block [368,602](https://mempool.space/block/0000000000000000102836b6107448289827c7eba93b7c37bc2b144bfc9cfb51), [`541e640f...`](https://mempool.space/tx/541e640fbb527c35e0ee32d724efa4a5506c4c52acfba1ebc3b45949780c08a8).
This transaction has two {{green:1-of-3}} P2MS outputs.
On the question of which key position represents the real pubkey, upon examination it's clear that the last of the three keys in each P2MS output is the real key as we have the same key present in both outputs: `0241e401603ff07343f84d3dcad01ddbd01385506cf85209d8b150fe6c93f6ee1f`).
This is sender's public key, as can be confirmed by examining the `ScriptSig` of the transaction input in {@fig:mempool-p2ms-counterparty-2} with the key highlighted in {{yellow:yellow}}.

![Figure: Counterparty with ARC4 obfuscation transaction details (`541e640f...`).](/assets/blog/p2ms-data-carry/mempool.space-p2ms-counterparty-2.png) {#fig:mempool-p2ms-counterparty-2}

If we follow a process similar to [the original Bitcoin Stamps example](#data-carrying-in-p2ms---a-bitcoin-stamps-example), we end up with:
- a deobfuscation key of `de3dec665a89228593ffa3c0236dd098a6f9ef6ac698db016f8a3303ce728649` (TXID of first input)
- a 124-byte string from a concatenation of the stripped keys of `026e8c99cf905947...` + `020b446132ea04f4...` + `02498c99cf905947...` + `030b446132ea04f4...`

After ARC4 deobfuscation, each P2MS output contains its own length-prefixed segment with a `CNTRPRTY` header:

**First P2MS output (62 bytes):**
| Byte Position | Hex | Interpretation |
|---|---|---|
| 0 | `3d` | Length prefix: 61 bytes follow |
| 1-8 | `434e545250525459` | `CNTRPRTY` prefix |
| 9-12 | `00000014` | Message Type: 20 (Issuance) |
| 13-20 | `0000036c089131f1` | Asset ID: 3762535084529 |
| 21-28 | `0000000000000000` | Quantity (high 8 bytes): 0 |
| 29-36 | `0000000000000000` | Quantity (low 8 bytes): 0 |
| 37 | `00` | Divisible: False |
| 38 | `00` | Lock/Reset flags |
| 39-61 | `285341564520555220534f554c2046524f4d2053494e20` | Description (part 1): "(SAVE UR SOUL FROM SIN " (23 bytes) |

**Second P2MS output (62 bytes):**
| Byte Position | Hex | Interpretation |
|---|---|---|
| 62 | `1a` | Length prefix: 26 bytes follow |
| 63-70 | `434e545250525459` | `CNTRPRTY` prefix (repeated) |
| 71-88 | `262049545320434f4e53455155454e434553` | Description (part 2): "& ITS CONSEQUENCES" (18 bytes) |
| 89-123 | `00...` | Null padding (35 bytes) |

The complete Counterparty message is reconstructed by reading each length-prefixed segment, verifying the `CNTRPRTY` header, and concatenating the following data.
This structure allows messages to span multiple P2MS outputs while maintaining independent validation of each segment.
Associated with this transaction is a vanity address, [`1SaLvationGodsMarveLousGracaLgYQS`](https://mempool.space/address/1SaLvationGodsMarveLousGracaLgYQS), which is the first transaction output.

And, for sake of completeness, here's some links to [this transaction](https://tokenscan.io/tx/296339) and ["asset" (SALVATION)](https://tokenscan.io/asset/SALVATION).
:::

## Omni (formerly Mastercoin)
The Omni Protocol, originally known as Mastercoin, was the pioneering protocol for building a layer on top of Bitcoin - it predated Counterparty!
Created by J.R. Willett and detailed in his January 2012 whitepaper ["The Second Bitcoin Whitepaper"](https://bitcointalk.org/index.php?topic=56901.0), Mastercoin sought to extend Bitcoin's functionality to enable more complex financial instruments and smart property without requiring any modifications to Bitcoin itself.

The project went live in August 2013 via the Mastercoin Crowdsale with MSC tokens generated during the month of August 2013 when individuals sent bitcoin to the Mastercoin (vanity) "Exodus Address": [`1EXoDusj...`](https://mempool.space/address/1EXoDusjGwvnjZUyKkxZ4UHEf77z6A5S4P).
To date, [[6,674.36781069 BTC have been sent to this address||Vanity address such as the Exodus Address typically have known corresponding private keys, so the current balance is much lower than this.
The Bitcoin sent to the address were used to fund the project]].

Mastercoin had a somewhat rocky history, check out the June 2014 Forbes article [The First 'Bitcoin 2.0' Crowd Sale Was A Wildly Successful $7 Million Disaster](https://www.forbes.com/sites/kashmirhill/2014/06/03/mastercoin-maidsafe-crowdsale/) for some early context, but despite this, it has had a lasting impact on Bitcoin.
Most prominently Tether (USDT) [launched on the Mastercoin protocol as "Realcoin"](https://en.wikipedia.org/wiki/Tether_(cryptocurrency)) and, for years, billions of dollars worth of USDT transactions were embedded in Bitcoin's blockchain via Mastercoin/Omni transactions.
Mastercoin was re-branded to Omni in 2015, likely to [cast off some of the negative connotations associated with the Mastercoin project](https://en.cryptonomist.ch/2024/04/17/mastercoin-crypto-the-story-of-the-communication-protocol-based-on-bitcoin-which-later-became-omni/).  

### Embedding Omni transactions in Bitcoin
The Omni protocol specifies three different ways to embed data in the Bitcoin blockchain:
1) Class A transactions - use fake addresses
2) Class B transactions - use multi-signature transactions
3) Class C transactions - use `OP_RETURN` such that Omni Protocol data is completely prunable.
This class was introduced with re-introduction of `OP_RETURN` in Bitcoin Core in version 0.9.0 (March 2014).

The focus here is then on Class B Omni transactions, which are still used to this day for large transactions that do not fit within the (previous) default `OP_RETURN` policy limit specified by a majority of the network (e.g., 80 bytes).

According to the [Omni specification](https://github.com/OmniLayer/spec/blob/master/OmniSpecification.adoc#64-class-b-transactions-multisig-method), the first pubkey in each Omni transaction P2MS transaction output _"should be a valid public key address designated by the sender which may be used to reclaim the bitcoin assigned to the output"_.
The remaining key (in a {{green:1-of-2}}) or keys (in a {{green:1-of-3}}) must be compressed public keys, where each 33-byte compressed public key encapsulates an Omni Protocol packet.

After stripping the first and last bytes, the first byte of [[each 31-byte "packet"||Which matches the 31-byte useable data in a public key used in Bitcoin Stamps]], is a sequence number which is used to order the packets.
This can range between 1 and 255, which implies:
- There's 30 usable bytes per-packet (per data key) for Omni Protocol transaction data
- There's 255 x 30 = 7,650 bytes maximum data storage capacity for each Class B Omni transaction

To encode data in each packet, the sender's address is used, where the sender's address is the address that contributed the most input value.
The sender's address must be a P2PKH address, and:

>_"Obfuscation is performed by SHA256 hashing the sender's address S times (where S is the sequence number) and taking the first 31 bytes of the resulting hash and XORing with the 31-byte Omni packet._
>_Multiple SHA256 passes are performed against an uppercase hex representation of the previous hash."_

### Omni - Single Packet
:::collapse{EXAMPLE: Omni - Single Packet}
[`0000297b...`](https://mempool.space/tx/0000297bd516c501aa9b143a5eac8adaf457fa78431e844092a7112815411d03) is an Omni transaction with a single, {{green:1-of-2}} P2MS output in block [323,250](https://mempool.space/block/00000000000000000f8cd15fe9923051dd231eb46e09c6e082dd859678df8eba).
It has an uncompressed (65-byte) key as the first pubkey, and a compressed (33-byte) key as the second pubkey.
The first pubkey is the valid pubkey, so this (currently unspent) P2MS output of 5,678 sats could presumably be spent at some point.
The second pubkey encapsulates the single Omni Protocol packet for this Omni transaction.

There are 7 transaction inputs, all are contributed by the [`1MaStErt4XsYHPwfrN9TpgdURLhHTdMenH`](https://mempool.space/address/1MaStErt4XsYHPwfrN9TpgdURLhHTdMenH) address, so this is the sender's address.

To decode, we take the sender's address, apply SHA256 once, and obtain the first 31 bytes of the hash result:

`2c7f68ac457d834fb57a112f3571d63bb6365d4c0523f9f74b298096160a02`

Taking the second, data carrying pubkey and stripping the first and last bytes yields:

`2d7f68ac457d834fb67a112f3571da0eb6365d4c0523f9f74b298096160a02`

XORing these two 31-byte strings results in:

`01000000000000000300000000000c35000000000000000000000000000000`

This breaks down to:

| Byte Position | Hex | Interpretation |
|---|---|---|
| 0 | `01` | Packet sequence number: 1 |
| 1-2 | `0000` | Transaction version: 0 |
| 3-4 | `0000` | Transaction type: 0 (simple send) |
| 5-8 | `00000003` | Currency ID: 3 (MaidSafeCoin) |
| 9-16 | `00000000000c3500` | Amount: 800,000 |
| 17-30 | `00000000000000000000000000000000` | Padding (unused) |

[This is the official list](https://omniexplorer.info/properties/production) for the mapping between Currency ID value and name.

:::

### Omni - Multi Packet
:::collapse{EXAMPLE: Omni - Multi Packet}
A *very* recent (25 June 2025!) example of an Omni transaction involving multiple P2MS transaction outputs, and thus multiple Omni packets, is [`15309186...`](https://mempool.space/tx/153091863886921ab8bf6a7cc17ea99610795522f48b1824d2e417954e466281).

The main difference from the single packet example above is that for each subsequent pubkey, we need to apply `SHA256` once more to the sender's address.
So with a sender's address of `1D6oYjFVRAETW1Us9oS36YC71gfRw1omZB`, and there being 6 P2MS transaction outputs (the first 5 are {{green:1-of-3}}, the last is a {{green:1-of-2}}), we have 11 full 32-byte SHA256 results, with the index indicating the number of SHA256 rounds (remembering to convert to uppercase hex representation before each round):
1) x`573a09227032f2dde9d2ecf3ffd930d69276754c3bc4343b01c14e0515741fa0`
2) `bc9197079fb1e344370ab8ee984291f1a3721b37901484dfb2079a158adc5e30`
3) `5439114b4688ba1e4e88ecb1454e7b147c886979b2e817082188b083d21fd871`
4) `cba80dd14016ec8be4cb466affa23d09f2418a361dbad0b3cebffcca473a6e90`
5) `834bdf87e79fd15dd54190a478e4f6e9a82a65e5e1220368405099064ad75dfd`
6) `aa5cfb1d38ad07a94a6986d4101082b673465f528c50efd8710bcf5ace2114dd`
7) `aafcd59c4c16f69343db9aac1091e0aa0b672efc66272b74870e84207986c9f5`
8) `9fb030e442bdfd7ee7cd0c2fbbd801381cb49f04ba11bc1c3ab68a435f8b5806`
9) `43fdd5998b69475c6416789a441cb8b897417a8b55cc0e684fe43e295f682bd7`
10) `a1c0f8d8c283565b31db64d205b403fcd96fbb62a6abe25c60a7bb57e751028e`
11) `b2573c41dd7e13da76fa530f1f48a3a1df4217b362c59a8bcead0135905ac09b`

Dropping the last byte of each hash, and then XORing with the first-and-last-byte stripped compressed keys yields the following.
We can see that the data has been successfully deobfuscated as the leading byte, the sequence number, ranges from 1 (`01`) through 11 (`0b`).
1) `010000003202000200000000456475636174696f6e004f7468657200416e75`
2) `02436f696e0068747470733a2f2f75756367612e636f6d2f616e75636f696e`
3) `037768697465706170657200416e75436f696e206973206120736163726564`
4) `042063757272656e637920666f7220706c616e657461727920726562697274`
5) `05682c206261636b656420627920746865204b756b756c6b616e20436f6465`
6) `06782e204974206272696467657320736f756c20736f7665726569676e7479`
7) `072c20626c6f636b636861696e20696e746567726974792c20616e6420636f`
8) `08736d69632072656d656d6272616e636520666f7220616c6c206265696e67`
9) `09732077616c6b696e67207468652070617468206f66207370697269747561`
10) `0a6c206c6967687420616e642067616c616374696320416e756e6e616b6920`
11) `0b656e6c69676874656e6d656e742e00000000035a4e900000000000000000`

Removing sequence numbers, but still accounting for original byte position in the first packet, this breaks down to:

| Byte Position | Hex | Interpretation |
|---|---|---|
| 1-2 | `0000` | Transaction version: 0 |
| 3-4 | `0032` | Transaction type: 50 (create fixed property) |
| 5 | `02` | Ecosystem: 2 (Test Omni) |
| 6-7 | `0002` | Property type: 2 (new divisible currency) |
| 8-11 | `00000000` | Previous property ID: 0 (new smart property) |
| 12-20 | `456475636174696f6e` | Property Category: "Education" |
| 21 | `00` | Null terminator for previous string |
| 22-26 | `4f74686572` | Property Subcategory: "Other" |
| 27 | `00` | Null terminator for previous string |

Continuing with the last 3 bytes (28-30, `416e75`) concatenated to the second packet (sans sequence number):

| Byte Position | Hex | Interpretation |
|---|---|---|
| 28-30, 1-4 | `416e75`+`436f696e`| Property Name: "AnuCoin" |
| 5 | `00` | Null terminator for previous string |

Next up is the Property URL, which is the remainder of the second packet (6-30) and into the third packet (1-10).
We reach the end when we hit the null terminator `00` (byte 11).

| Byte Position | Hex | Interpretation |
|---|---|---|
| 6-30, 1-10 | `68747470...61706572` | Property URL: "https://uucga.com/anucoinwhitepaper" |

This is followed by Property Data, which extends from packet 3 through to packet 11, ending at the null terminator (byte 15):

| Byte Position | Hex | Interpretation |
|---|---|---|
| Many | `416e7543...656e742e`| Property Data: "AnuCoin is a sacred currency for planetary rebirth, backed by the Kukulkan Codex. It bridges soul sovereignty, blockchain integrity, and cosmic remembrance for all beings walking the path of spiritual light and galactic Anunnaki enlightenment." |
| 16-23 | `000000035a4e9000` | Number of coins: 14,400,000,000 |

As per the [Omni spec for the number of coins](https://github.com/OmniLayer/spec/blob/master/OmniSpecification.adoc#field-number-of-coins) _"for divisible coins or tokens, the value in this field is to be divided by 100,000,000"_, so there are actually only 144 units of this "AnuCoin".
And the sender was perhaps very impatient for the world to hear about "AnuCoin", significantly over-paying to get the transaction confirmed quickly:

![Figure: 200,000 sat transaction fee for AnuCoin.](/assets/blog/p2ms-data-carry/mempool.space-p2ms-anucoin.png) {#fig:mempool-p2ms-anucoin}

Again, by no means being any form of endorsement, [here are full details](https://omniexplorer.info/asset/2147484218) relating to this property/asset on Omni.

:::

## Other variants or protocols
As documented in [Part 2](./p2ms-data-carry-2), Bitcoin Stamps, Counterparty and Omni are the dominant protocols that utilise P2MS outputs for data carrying purposes, combined accounting for over 94% of P2MS outputs in the UTXO set.
Yet there are other minor protocols that also use P2MS outputs to carry data, such as Chancecoin, and observed identifier patterns such as `TB0001`, `TEST01`, `METROXMN`.
These other protocols and identifier patterns involve unobfuscated data, so interpreting them is simply a matter of ASCII decoding.

### Chancecoin
Chancecoin was a gambling protocol built on Bitcoin, only active for a short period in 2014, that used P2MS outputs for data carrying purposes in some circumstances.
Like Counterparty, users were required to send bitcoin to a specific address, between certain dates, to obtain Chancecoin tokens (`CHA`).
In this case the address was [`1ChancecoinXXXXXXXXXXXXXXXXXZELUFD`](https://mempool.space/address/1ChancecoinXXXXXXXXXXXXXXXXXZELUFD).
To date, 480.19571581 BTC have been sent to it.

Key characteristics:
- `CHANCECO` identifier present in ASCII interpretation, data is not obfuscated
- Uses {{green:1-of-2}} P2MS outputs, data is in the 2nd pubkey, the 1st is a valid pubkey
- Each Chancecoin P2MS output has 32 bytes data carrying capability
- Large Chancecoin messages are split across multiple P2MS outputs
- Message format: [`CHANCECO`:8][MessageID:4][Data:variable]

### Other identifier patterns
Other identifier patterns that have been observed in P2MS outputs in the UTXO set by simple ASCII decoding include `TB0001`, `TEST01`, `METROXMN`.
There doesn't appear to be much information online about these identifiers, with the exception of `METROXMN` which is associated with [Metronotes XMN](https://bitcointalk.org/index.php?topic=974486.0), which unequivocally appears to be a scam.

Although the identifiers are not obfuscated, the data that follows is likely representing some form of protocol or message format like the other data carrying methods.
In the [companion repository](https://github.com/deadmanoz/data-carry-research), unlike the other protocols discussed here, no attempt has been made to interpret or decode the data beyond the identifier.  

## Generic Data Storage
Data carrying in P2MS outputs need not rely on some standardised protocol and indeed there are many files (documents, images, etc.) and text, encoded, with or without any obfuscation, into P2MS pubkeys.

There are many examples of using P2MS outputs for generic data storage, but perhaps the most famous two are:
1) The Bitcoin Whitepaper PDF - a single transaction
2) The Wikileaks cablegate data - uses multiple transactions

Both of these examples, and many other instances of Bitcoin transaction data being used for generic data storage are very well documented by Ken Shirriff in [Hidden surprises in the Bitcoin blockchain and how they are stored: Nelson Mandela, Wikileaks, photos, and Python software](http://www.righto.com/2014/02/ascii-bernanke-wikileaks-photographs.html) and Ciro Santilli in [Cool data embedded in the Bitcoin blockchain: Ciro's Bitcoin Inscription Museum](https://cirosantilli.com/cool-data-embedded-in-the-bitcoin-blockchain).
For the purposes of understanding how P2MS outputs have been used for generic data storage, we'll examine how we can extract the Bitcoin Whitepaper PDF.

### The Bitcoin whitepaper PDF
The following works through the process of extracting the Bitcoin whitepaper PDF from the transaction [`54e48e5f...`](https://mempool.space/tx/54e48e5f5c656b26c3bca14a8c95aa583d07ebe84dde3b7dd4a78f4e4186e713) in block 230,009 (April 2013).
Note that this is also documented in various places online, including some elegant one-liners on [Bitcoin Stack Exchange](https://bitcoin.stackexchange.com/questions/35959/how-is-the-whitepaper-decoded-from-the-blockchain-tx-with-1000x-m-of-n-multisi)

:::collapse{EXAMPLE: Generic Data Storage - The Bitcoin Whitepaper PDF}
One of the most famous examples of data embedding in Bitcoin is the Bitcoin whitepaper PDF embedded in transaction [`54e48e5f...`](https://mempool.space/tx/54e48e5f5c656b26c3bca14a8c95aa583d07ebe84dde3b7dd4a78f4e4186e713).
This transaction has 948 outputs, 946 of which are {{green:1-of-3}} P2MS outputs, with the remaining two outputs being standard P2PKH outputs. 
All pubkeys involved are also 65-byte uncompressed pubkeys, presumably to maximise data carrying capacity.
Unlike the protocol-based approaches we've examined (Bitcoin Stamps, Counterparty, Omni), this is a straightforward generic data storage example with no obfuscation or encryption.

Examining the first output (`vout[0]`) as in {@fig:mempool-p2ms-whitepaper-1} we can see that the {{green:1-of-3}} P2MS output uses full 65-byte uncompressed pubkeys.
With uncompressed pubkeys, typically starting with an `04` prefix, yet none of these keys starting with `04`, we know that none of these keys are valid pubkeys, and thus this P2MS output is unspendable. 
If we were to examine the remaining 945 P2MS outputs, we would see the same pattern: all 3 keys in each output are uncompressed pubkeys, and none of which are valid pubkeys.

![Figure: details of first P2MS output of the Bitcoin whitepaper PDF transaction  (`54e48e5f...`).](/assets/blog/p2ms-data-carry/mempool.space-p2ms-whitepaper-1.png) {#fig:mempool-p2ms-whitepaper-1}

The extraction is simpler than protocol-based approaches:

**Step 1: Extract all pubkey data**

For each of the 946 P2MS outputs, concatenate all three 65-byte chunks:
- Output 0: `e4cf0200...` + `636f6465...` + `9ba54728...` = 195 bytes
- Output 1: `f4eb5fde...` + `1f3fe4ab...` + `7395c3c8...` = 195 bytes
- ...continue for all 946 outputs
- Total concatenated data: 946 × 195 = 184,470 bytes

**Step 2: Detect the file type**

Scanning the concatenated data reveals the PDF magic bytes `%PDF` (hex: `25 50 44 46`) at a specific offset:

```
Byte position 0-7:   e4 cf 02 00 06 7d af 13  (8-byte prefix)
Byte position 8-15:  25 50 44 46 2d 31 2e 34  (%PDF-1.4)
```

**Step 3: Localise the PDF content**

The PDF data is located at the following byte positions in the raw data:
- **Byte 8**: `%PDF-1.4\n` - PDF header starts
- **Bytes 184,294-184,298**: `%%EOF` - End-of-file marker (5 bytes: hex `25 25 45 4f 46`)
- **Byte 184,299**: `\n` - Final newline after EOF (hex `0a`)
- **Bytes 184,300-184,469**: Null padding (170 bytes)

**Step 4: Trim leading and trailing data, extract PDF**

- **Total bytes to remove**: 178 bytes (8 byte prefix + 170 bytes null padding)
- **Byte 0**: `%PDF-1.4\n` - PDF header (8-byte prefix removed, now at position 0)
- **Bytes 184,286-184,290**: `%%EOF` - EOF marker (5 bytes)
- **Byte 184,291**: `\n` - Final newline (hex `0a`)
- **Total size**: 184,292 bytes

The final extracted PDF is exactly **184,292 bytes** and can be saved as a valid PDF file.

![Figure: the first page of the extracted Bitcoin whitepaper PDF.](/assets/blog/p2ms-data-carry/p2ms-whitepaper-cover.png) {#fig:p2ms-whitepaper-cover}

:::


## Summarising the main techniques
In the post we've explored the main methods of how data is carried in P2MS transaction outputs, including working through examples that showed how the various protocols or methods operate.
The dominant protocols, Bitcoin Stamps, Counterparty, and Omni, account for over 94% of all P2MS UTXOs (as we shall learn in [Part 2](./p2ms-data-carry-2)), with the following summarising the key technical distinctions between them.

**Protocol identification**: Bitcoin Stamps can often be identified without deobfuscation via Key Burn patterns, while Counterparty requires attempting deobfuscation to find the `CNTRPRTY` prefix.
Omni transactions are identified by the presence of the Exodus address as one of the transaction outputs.

**Obfuscation techniques**: Bitcoin Stamps and Counterparty both use ARC4 stream cipher obfuscation with the input TXID as the key, whereas Omni uses SHA256 hashing with XOR operations (and generic data storage often uses no obfuscation at all, with the data embedded directly in pubkey).

**Spendability vs. permanence**: Bitcoin Stamps deliberately creates unspendable outputs in using no real pubkeys, ensuring the data remains in the UTXO set forever.
Counterparty and Omni, by contrast, include a valid pubkey that allows each output to be spent, theoretically enabling UTXO set cleanup (though, in practice, many remain unspent years after being created).

**Data density & efficiency**: All three protocols achieve roughly similar density per pubkey (30-31 usable bytes), though older non-ARC4 obfuscated Counterparty transactions use all 33 bytes of a 33-byte compressed pubkey. 
The efficiency of the Counterparty protocol is lower than the other two due to per-output headers (losing 9 bytes per output), Omni achieves decent efficiency by using 30 of 31 bytes of each stripped pubkey (losing 1 byte per pubkey), and Bitcoin Stamps achieves the highest efficiency by using all bytes in 2nd and subsequent P2MS outputs for data.

| | Bitcoin Stamps | Counterparty | Omni |
|---|---|---|---|
| Obfuscation method | ARC4 | ARC4 | SHA256+XOR |
| To deobfuscate | TXID of first TX input (`vin[0].txid`) | TXID of first TX input (`vin[0].txid`) | Sender's address (address contributing most value to input) |
| Identifier | Key Burn addresses (`0x0222...`, `0x0333...`, etc.) | `CNTRPRTY` prefix (after deobfuscation) | Exodus address (`1EXoDusj...`) as output |
| P2MS configuration | {{green:1-of-3}} | {{green:1-of-2}} or {{green:1-of-3}} (mostly) | {{green:1-of-2}} or {{green:1-of-3}} (only) |
| Spendability | Unspendable - Key Burn and data keys only | Spendable - real pubkey present | Spendable - real pubkey present |
| Data per pubkey | 31 bytes (33-byte compressed, strip first/last) | [[31 or 33 bytes (varies by variant)||No ARC4 obfuscation: 33 bytes. ARC4 obfuscated: 31 bytes]] | 30 bytes (31-byte packet minus sequence) |
| Data segment | [[Transport method dependent||Counterparty transport: per P2MS output. Pure Bitcoin Stamps transport: all P2MS outputs in a transaction]] | Per P2MS output | Per pubkey |
| Carrying efficiency of multi-output | ~100% | ~85% | ~97% |
| Active period | 2023-present | 2014-present | 2013-present |

Comparison of the technical details of the major P2MS-using protocols.{#tab:technique-summary}

Beyond these three major protocols, we've also seen P2MS transaction outputs leveraged by minor protocols like Chancecoin, and other projects with identifiers including `TB0001`, `TEST01` and `METROXMN`.
In addition, P2MS transaction outputs have been used for generic data storage, with prominent examples including the Bitcoin whitepaper PDF and the Wikileaks Cablegate files.
Such examples demonstrate that P2MS can be used for arbitrary file storage without any standardised protocol layer.

## What's next?
These technical approaches each make different tradeoffs between efficiency, permanence, and network impact.
But understanding the mechanics is only part of the story - the critical question is: what is the actual scale and cumulative impact of these techniques on the Bitcoin network?
[Part 2](./p2ms-data-carry-2) analyses historical trends and a snapshot of the UTXO set to quantify the magnitude of P2MS data carriage in Bitcoin.

Also be sure to check out the [companion GitHub repo](https://github.com/deadmanoz/data-carry-research) which includes a `decode-txid` utility that can be used to decode transactions involving P2MS outputs according to various protocol described above (including some support for generic data storage).

## References
### General
- [deadmanoz Data Carry Research (GitHub companion repository)](https://github.com/deadmanoz/data-carry-research)
- [ARC4 (RC4)](https://en.wikipedia.org/wiki/RC4)
- [Bitcoin Stamps Protocol Specification](https://github.com/mikeinspace/stamps/blob/main/BitcoinStamps.md)
- [Bitcoin Stamps: Key Burn](https://github.com/mikeinspace/stamps/blob/main/Key-Burn.md)
- [Bitcoin Stamps Indexer](https://github.com/stampchain-io/btc_stamps)
- [Bitcoin Stamps SDK Documentation](https://github.com/stampchain-io/stamps_sdk)
- [OpenStamp](https://docs.openstamp.io)
- [BRC-20 Tokens: A Primer](https://research.binance.com/static/pdf/BRC-20%20Tokens%20-%20A%20Primer.pdf)
- [Counterparty - Pioneering Peer-to-Peer Finance - Official Thread](https://bitcointalk.org/index.php?topic=395761.0)
- [Counterparty Protocol Specification](https://docs.counterparty.io/docs/advanced/protocol/)
- [Counterparty Core](https://github.com/CounterpartyXCP/counterparty-core)
- [Counterparty Decoder](https://jpja.github.io/Electrum-Counterparty/decode_tx)
- [How to Reverse Engineer Counterparty TX’s](https://jpjanssen.com/how-to-reverse-engineer-counterparty-txs/)
- [MasterCoin: New Protocol Layer Starting From “The Exodus Address”](https://bitcointalk.org/index.php?topic=265488.0)
- [Omni Layer Specification (0.7)](https://github.com/OmniLayer/spec/blob/master/OmniSpecification.adoc)
- [The First 'Bitcoin 2.0' Crowd Sale Was A Wildly Successful $7 Million Disaster](https://www.forbes.com/sites/kashmirhill/2014/06/03/mastercoin-maidsafe-crowdsale/)
- [Mastercoin crypto: the story of the communication protocol based on Bitcoin, which later became Omni](https://en.cryptonomist.ch/2024/04/17/mastercoin-crypto-the-story-of-the-communication-protocol-based-on-bitcoin-which-later-became-omni/)
- [Tether (USDT) History](https://en.wikipedia.org/wiki/Tether_(cryptocurrency))
- [Hidden surprises in the Bitcoin blockchain and how they are stored: Nelson Mandela, Wikileaks, photos, and Python software](http://www.righto.com/2014/02/ascii-bernanke-wikileaks-photographs.html)
- [Cool data embedded in the Bitcoin blockchain: Ciro's Bitcoin Inscription Museum](https://cirosantilli.com/cool-data-embedded-in-the-bitcoin-blockchain)

### Academic Research
- [Data Insertion in Bitcoin's Blockchain (2017)](https://digitalcommons.augustana.edu/cscfaculty/1/)
- [A Quantitative Analysis of the Impact of Arbitrary Blockchain Content on Bitcoin (2018)](https://fc18.ifca.ai/preproceedings/6.pdf)
- [Analysing blockchains and smart contracts: tools and techniques (2018, PhD thesis)](https://www.researchgate.net/publication/323642931_Analysing_blockchains_and_smart_contracts_tools_and_techniques)
- [A journey into Bitcoin metadata (2019)](https://iris.unica.it/bitstream/11584/261530/1/main.pdf)
- [Dominating OP Returns: The Impact of Omni and Veriblock on Bitcoin (2020)](https://www.blockchainresearchlab.org/wp-content/uploads/2020/03/BRL-Working-Paper-No-7-Dominating-OP-Returns.pdf)
- [An Analysis of Data Hidden In Bitcoin Addresses (2021)](https://www.researchgate.net/publication/351897792_An_Analysis_of_Data_Hidden_in_Bitcoin_Addresses)
- [Bitcoin Burn Addresses: Unveiling the Permanent Losses and Their Underlying Causes (2025)](https://arxiv.org/pdf/2503.14057)
