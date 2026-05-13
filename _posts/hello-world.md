---
title: 'Hello World'
excerpt: 'Welcome to deadmanoz.xyz. Testing site features.'
coverImage: '/assets/melb-graffiti.png'
date: '2025-08-11T00:00:00.000Z'
tags:
  - site
  - test-post
author:
  name: deadmanoz
ogImage:
  url: '/assets/melb-graffiti.png'
status: canary
---

# Welcome to deadmanoz.xyz

This post is the canary: it exercises every markdown extension and rendering feature the site supports.
If a build breaks something subtle, the regression shows up here first.

## Math Rendering

Inline math \(E = mc^2\) and a display block:

\[\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}\]

Math containing literal `<` and `&` (e.g. \(a < b\)) round-trips correctly through entity decoding.

## Inline Formatting

Superscript: H^2^O, and x^2^ + y^2^ = z^2^.

Strikethrough: ~~deprecated wording~~ replaced with the new wording.

Coloured text: {{cyan:cyan}}, {{pink:pink}}, {{magenta:magenta}}, {{orange:orange}}, {{gold:gold}}, {{grey:grey}}.
An unknown colour like {{neonpurple:this}} is left as a literal `{{...}}` token.

Inline code: the tag `aux_target` is a constant, and `parent_target` is another.

## Image with Figure Caption

The next figure includes inline code (`aux_target`), a markdown link to [the homepage](https://example.com/home), a code-link like [`AuxPow.Check`](https://example.com/code-link) (external code-link inherits the muted shade), and a bare URL https://example.com/bare in the same caption.

![Canary image with code `aux_target`, a markdown [link](https://example.com/home), and a bare URL https://example.com/bare in the caption.](/assets/bitcoin_knight.png){#fig:sample}

Images are automatically numbered and can be referenced as {@fig:sample}.

## Tables

| Field      | Type   | Notes                                      |
| ---------- | ------ | ------------------------------------------ |
| `title`    | string | Frontmatter title for the post.            |
| `date`     | string | ISO 8601 publication date.                 |
| `status`   | enum   | One of `published`, `draft`, `placeholder`, `canary`. |

Frontmatter fields used by `getPostStatus` {#tab:frontmatter}

See {@tab:frontmatter} for the canonical mapping.

## Annotations

The [[Bitcoin||A Peer-to-Peer Electronic Cash System]] revolution is upon us.

Tooltips can contain a markdown link, e.g. [[BIP 22||Defined in [BIP 22](https://github.com/bitcoin/bips/blob/master/bip-0022.mediawiki).]] which renders as an anchor in the tooltip.

Tooltips can also contain inline math, e.g. [[difficulty||Block target is \(2^{224}/D\) where \(D\) is the difficulty.]].

And the display text of an annotation can itself contain inline code: [[`getblocktemplate`||The RPC that returns a block template for mining.]].

The display text also renders italics and bold: [[4-byte _side mask_||The 4 bytes act as a per-level bit selector for the merkle fold.]] and [[**critical** invariant||An invariant that, if violated, breaks consensus.]].

## Collapsible Sections

:::collapse{Historical Context: The Early Days of Digital Currency}
Before Bitcoin, there were several attempts at creating digital currencies, many of which faced significant challenges:

#### DigiCash (1990s)
Created by David Chaum, DigiCash was one of the first attempts at anonymous digital currency. It used cryptographic protocols to ensure privacy, but ultimately failed due to limited adoption and the company's bankruptcy in 1998.

#### E-gold (1996-2009)
E-gold was backed by gold reserves and became quite popular, processing over $2 billion in transactions at its peak. However, it was shut down by the U.S. government due to money laundering concerns and lack of proper financial controls.

#### HashCash (1997)
Adam Back's HashCash was a proof-of-work (PoW) system designed to combat email spam. While not a currency itself, it introduced the PoW concept that would later become crucial to Bitcoin's mining mechanism.

#### Bit Gold (~1998-2000s)
Proposed by Nick Szabo, Bit Gold was never implemented but contained many elements that would later appear in Bitcoin, including proof-of-work and a decentralized approach to currency creation.

These early experiments laid the groundwork for Bitcoin's revolutionary approach to solving the double-spending problem without requiring a trusted central authority.
:::

A collapse can declare a stable anchor with the `{#anchor-id}` suffix, useful for deep-linking:

:::collapse{Stable-anchor collapse demo}{#stable-anchor-demo}
This block's `<details>` element has `id="stable-anchor-demo"` rather than the auto-generated `collapse-N`, so external links can target it directly.
:::

## Code Blocks

```ts
// Code blocks are highlighted client-side by rehype-highlight.
function squarePlusOne(x: number): number {
  return x * x + 1;
}
```

## Alert Boxes

:::alert{info}
**Satoshi on Bitcoin's Foundation** (October 31, 2008): "I've been working on a {{cyan:new electronic cash system}} that's fully peer-to-peer, with no trusted third party."
:::

:::alert{warning}
**Satoshi on Trust** (February 2009): "The root problem with conventional currency is all the trust that's required to make it work. The central bank must be trusted not to debase the currency, but the history of fiat currencies is full of breaches of that trust."
:::

:::alert{success}
**Satoshi on Lost Coins** (2010): "Lost coins only make everyone else's coins worth slightly more. Think of it as a donation to everyone." With a fixed supply of \(21 \times 10^6\) bitcoins, this [[deflationary observation||Each lost bitcoin increases scarcity for remaining holders.]] highlights an elegant economic property.
:::

:::alert{danger}
**Satoshi's Caution** (December 2010): "WikiLeaks has kicked the hornet's nest, and the swarm is headed towards us."
:::

## Interactive Plots

A plot defined with inline JSON, captioned, and assigned a figure id so it joins the figure numbering with image figures:

:::plot{hashrate}
{
  "data": [
    {
      "x": ["2023-01-01", "2023-02-01", "2023-03-01", "2023-04-01", "2023-05-01", "2023-06-01", "2023-07-01", "2023-08-01", "2023-09-01", "2023-10-01", "2023-11-01", "2023-12-01", "2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01", "2024-05-01", "2024-06-01", "2024-07-01", "2024-08-01", "2024-09-01", "2024-10-01", "2024-11-01", "2024-12-01", "2025-01-01", "2025-02-01", "2025-03-01", "2025-04-01", "2025-05-01", "2025-06-01", "2025-07-01", "2025-08-01", "2025-09-01", "2025-10-01"],
      "y": [250, 275, 295, 320, 350, 365, 380, 400, 420, 440, 460, 485, 510, 540, 575, 590, 620, 650, 670, 695, 710, 725, 740, 755, 770, 785, 800, 820, 835, 850, 865, 880, 895, 910],
      "type": "scatter",
      "mode": "lines+markers",
      "name": "Network Hash Rate",
      "line": { "color": "#00A0D0", "width": 3 },
      "marker": { "color": "#FF6C11", "size": 6 }
    }
  ],
  "layout": {
    "title": { "text": "Bitcoin Network Hash Rate (2023-2025)", "font": { "color": "#FF8664", "size": 20 } },
    "xaxis": { "title": "Date" },
    "yaxis": { "title": "Hash Rate (EH/s)" }
  }
}
:::
Bitcoin network hash rate over 2023-2025, drawn from inline plot JSON. {#fig:hashrate}

Try scrolling the range slider at the bottom, or click and drag to zoom. See {@fig:hashrate} for the trend.

A plot whose data lives in an external JSON file via the `src="..."` attribute:

:::plot{external src="/assets/blog/hello-world/sample-plot.json"}
:::
Plot loaded from `/assets/blog/hello-world/sample-plot.json`. {#fig:external}

A plot annotated with timeline markers loaded from `annotations="..."`:

:::plot{annotated annotations="/assets/blog/hello-world/sample-annotations.json"}
{
  "data": [
    {
      "x": ["2023-12-01", "2024-02-01", "2024-04-01", "2024-06-01", "2024-08-01", "2024-10-01"],
      "y": [42, 55, 48, 70, 63, 80],
      "type": "scatter",
      "mode": "lines",
      "name": "Annotated series",
      "line": { "color": "#20E516", "width": 2 }
    }
  ],
  "layout": {
    "title": { "text": "Series with timeline annotations", "font": { "color": "#FF8664", "size": 18 } },
    "xaxis": { "title": "Date" },
    "yaxis": { "title": "Value" }
  }
}
:::

# This is

## A nested

### Table-of-contents
