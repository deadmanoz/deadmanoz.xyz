---
title: 'Hello World'
excerpt: 'Welcome to deadmanoz.xyz. Testing site features.'
coverImage: '/assets/melb-graffiti.png'
date: '2025-08-11T00:00:00.000Z'
author:
  name: deadmanoz
ogImage:
  url: '/assets/melb-graffiti.png'
hidden: false
---

# Welcome to deadmanoz.xyz

Testing the features of this website, including table-of-contents, annotations (hover footnotes), automatic image captioning, coloured text, and math rendering.

## Math Rendering

Inline math equation: \(E = mc^2\) and a display equation:

\[\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}\]

Superscript works too: H^2^O and mathematical expressions x^2^ + y^2^ = z^2^.

## Coloured Text

{{cyan:Coloured text}} is {{pink:possible}}.

## Image with Caption

![Figure: Bitcoin Knight](/assets/bitcoin_knight.png) {#fig:sample}

Images can have captions, automatically numbered, and can be referenced in the text, as per {@fig:sample}.

## Annotations

The [[Bitcoin||A Peer-to-Peer Electronic Cash System]] revolution is upon us...

## Collapsible Sections

Sometimes I want to provide additional context or detailed explanations without cluttering the main text. Here's a collapsible section:

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

## Interactive Plots

Interactive plots with zoom, pan, and range slider controls:

:::plot{bitcoin-hashrate}
{
  "data": [
    {
      "x": ["2023-01-01", "2023-02-01", "2023-03-01", "2023-04-01", "2023-05-01", "2023-06-01", "2023-07-01", "2023-08-01", "2023-09-01", "2023-10-01", "2023-11-01", "2023-12-01", "2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01", "2024-05-01", "2024-06-01", "2024-07-01", "2024-08-01", "2024-09-01", "2024-10-01", "2024-11-01", "2024-12-01", "2025-01-01", "2025-02-01", "2025-03-01", "2025-04-01", "2025-05-01", "2025-06-01", "2025-07-01", "2025-08-01", "2025-09-01", "2025-10-01"],
      "y": [250, 275, 295, 320, 350, 365, 380, 400, 420, 440, 460, 485, 510, 540, 575, 590, 620, 650, 670, 695, 710, 725, 740, 755, 770, 785, 800, 820, 835, 850, 865, 880, 895, 910],
      "type": "scatter",
      "mode": "lines+markers",
      "name": "Network Hash Rate",
      "line": {
        "color": "#00A0D0",
        "width": 3
      },
      "marker": {
        "color": "#FF6C11",
        "size": 6
      }
    }
  ],
  "layout": {
    "title": {
      "text": "Bitcoin Network Hash Rate (2023-2025)",
      "font": {
        "color": "#FF8664",
        "size": 20
      }
    },
    "xaxis": {
      "title": "Date"
    },
    "yaxis": {
      "title": "Hash Rate (EH/s)"
    }
  }
}
:::

Try scrolling the time range at the bottom, or click and drag to zoom!

# This is

## A nested

### Table-of-contents
