# Invalid-blocks post data

Generator inputs and outputs for the post's tables and charts, taken from [bitcoin-data/invalid-blocks](https://github.com/bitcoin-data/invalid-blocks) at commit `166ff94` (22 September 2026, the post's stated as-of date): 143 established failures, 16 complete bodies, 124 proof files and 10 reported cases.
The evidence itself lives upstream, in `blocks/`, `proofs/`, `ci/` and `docs/notes.md`; nothing in this directory is needed to check a failure.

## Files

- `catalogue.json` is the post's copy of the 143 established cases, one row per header, with the post-side fields `channels` and `child_chains` (where the header was observed), `full_body` and `plot_date`.
- `reported-cases.json` is the post's copy of the 10 reported cases, with `family`, `header_recovered` and `missing_evidence`.
- `catalogue-timeline.json` (143 Plotly points by failure family) and `observation-timeline.json` (the same points by surviving observation channel) are generated.
- `events-timeline.json` marks BIP16, both BIP34 thresholds (the 750-of-1,000 version-2 rule at 224,413 and full enforcement at 227,931), BIP66, BIP65, SegWit and Taproot enforcement dates: seven lines in all.
- `build-catalogue.py` regenerates both timelines and the three marked tables in the post; `--check` verifies that they are current.

Run the generator from the repository root with its Python environment active:

```sh
source .venv/bin/activate
python public/assets/blog/2026/invalid-blocks/data/build-catalogue.py
python public/assets/blog/2026/invalid-blocks/data/build-catalogue.py --check
```

The generator uses only the Python standard library and makes no network requests.
The post's prose is authored separately; update its totals and discussion when changing the inventory.

## Field notes

Dates in the established catalogue are header dates, not authenticated submission times.
The two 2026 F2Pool timestamp failures are plotted at their auxiliary-chain observation dates, 22 April and 13 July, and use diamond markers.
Multiple headers can occupy the same chart coordinates; use the table or the JSON to distinguish them.
Reported rows without headers carry contemporary report dates and label that distinction explicitly.

No P2P reception is inferred from recovering a file through an archive: the `scrape` label covers an archival retrieval without asserting the original reception route.
The observation timeline uses an exclusive class for every recorded combination of archive, merge mining and Bitcoin P2P.
These post-level fields are not a replacement for the upstream observation schema.

`pool` follows upstream and marks the basis where it is not a coinbase tag: `(reported)` for the 1Hash and mmpool attributions, `(address)` for BTC Nuggets and Bitsolo.
An empty pool field means unknown, not necessarily an untagged coinbase; upstream's notes record the search behind the 86 unattributed P2SH rows.
