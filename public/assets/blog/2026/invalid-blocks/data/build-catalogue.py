"""Regenerate this post's tables and timelines from catalogue JSON.

Run in an activated Python environment. Use --check to verify generated files.
No network requests or third-party packages are required.
"""
from pathlib import Path
from collections import Counter
import argparse
import json
import re

DATA = Path(__file__).resolve().parent
POST = DATA.parents[5] / '_posts/2026/invalid-blocks.md'
RULES = {
    'p2sh_redeem_script_failure': ('P2SH redeem-script failure', 'P2SH VerifySignature failed (historical)', 'P2SH'),
    'bip34_v2_coinbase_height_mismatch': ('BIP34 height: difficulty in height field', 'bad-cb-height', 'Coinbase height'),
    'bip34_coinbase_height_mismatch': ('BIP34 height: wrong height', 'bad-cb-height', 'Coinbase height'),
    'bip34_coinbase_height_missing': ('BIP34 height: missing script push', 'bad-cb-height', 'Coinbase height'),
    'bip66_block_version_below_3': ('Version below BIP66 minimum', 'bad-version', 'Version'),
    'bip65_block_version_below_4': ('Version below BIP65 minimum', 'bad-version', 'Version'),
    'coinbase_scriptsig_length_above_100': ('Coinbase scriptSig above 100 bytes', 'bad-cb-length', 'Other rules'),
    'bad-txns-inputs-missingorspent': ('Transaction ordering', 'bad-txns-inputs-missingorspent', 'Input availability'),
    'missing_unconfirmed_parent': ('Omitted unconfirmed parent', 'bad-txns-inputs-missingorspent', 'Input availability'),
    'already_confirmed_in_parent': ('Inputs already spent in parent block', 'bad-txns-inputs-missingorspent', 'Input availability'),
    'bad-cb-amount': ('Coinbase overpayment', 'bad-cb-amount', 'Coinbase amount'),
    'bad-blk-sigops': ('Excessive sigops', 'bad-blk-sigops', 'Other rules'),
    'bad-txns-vout-toolarge': ('Output value overflow', 'bad-txns-vout-toolarge', 'Other rules'),
    'nbits_retarget_not_applied': ('Retarget not applied', 'bad-diffbits', 'Other rules'),
    'time_below_mtp': ('Timestamp below parent MTP', 'time-too-old', 'Timestamp'),
}
COLOURS = {'P2SH': '#FF3CAC', 'Coinbase height': '#00A0D0', 'Version': '#FF6C11',
           'Input availability': '#B06EFF', 'Coinbase amount': '#F7C948',
           'Timestamp': '#FF5555', 'Other rules': '#58D68D'}
CHANNEL_NAMES = {'p2p': 'Bitcoin P2P', 'merge_mining': 'merge mining', 'scrape': 'archive'}
OBSERVATION_COLOURS = {
    'Archive only': '#B06EFF',
    'Merge mining only': '#00A0D0',
    'Bitcoin P2P only': '#FF6C11',
    'Archive and merge mining': '#F7C948',
    'Archive and P2P': '#58D68D',
    'P2P and merge mining': '#FF3CAC',
    'All three': '#FF8664',
}
OBSERVATION_CLASSES = {
    frozenset({'scrape'}): 'Archive only',
    frozenset({'merge_mining'}): 'Merge mining only',
    frozenset({'p2p'}): 'Bitcoin P2P only',
    frozenset({'scrape', 'merge_mining'}): 'Archive and merge mining',
    frozenset({'p2p', 'scrape'}): 'Archive and P2P',
    frozenset({'p2p', 'merge_mining'}): 'P2P and merge mining',
    frozenset({'p2p', 'merge_mining', 'scrape'}): 'All three',
}
TIMELINE_LAYOUT = {
    'hovermode': 'closest',
    'xaxis': {'title': {'text': 'Date (UTC)'}},
    'yaxis': {'title': {'text': 'Height'}, 'tickformat': ','},
    'legend': {'orientation': 'h', 'x': 0, 'y': -0.22, 'yanchor': 'top',
               'entrywidth': 75, 'entrywidthmode': 'pixels', 'font': {'size': 10}},
    'margin': {'t': 40, 'b': 220, 'l': 65, 'r': 16}, 'height': 600,
}


def channel_flags(row):
    return tuple(channel for channel in row['channels'].split(';') if channel)


def channel_labels(row):
    flags = set(channel_flags(row))
    return ', '.join(CHANNEL_NAMES[channel] for channel in CHANNEL_NAMES if channel in flags)


def observation_class(row):
    flags = frozenset(channel_flags(row))
    try:
        return OBSERVATION_CLASSES[flags]
    except KeyError as exc:
        raise ValueError(f"unclassified channels: {set(flags)!r}") from exc


def hover_text(row):
    body = 'complete body' if row['full_body'] else 'authenticated components'
    pool = row['pool'] or 'pool unknown'
    return (f"{row['height']:,}<br>{RULES[row['rule']][0]}<br>{pool}"
            f"<br>…{row['hash'][-12:]}<br>{body}<br>{channel_labels(row)}")


def scatter_timeline(rows, group_of, colours, *, counts_in_legend=False, entrywidth=75, margin_b=220, height=600):
    traces = []
    for name, colour in colours.items():
        points = [row for row in rows if group_of(row) == name]
        label = f'{name} ({len(points)})' if counts_in_legend else name
        traces.append({
            'type': 'scatter', 'mode': 'markers', 'name': label,
            'x': [row['plot_date'] for row in points],
            'y': [row['height'] for row in points],
            'text': [hover_text(row) for row in points],
            'hovertemplate': '%{text}<br>%{x}<extra></extra>',
            'marker': {
                'color': colour, 'size': 9, 'opacity': 0.85,
                'symbol': ['diamond' if row['plot_date'] != row['date_utc'] else 'circle' for row in points],
            },
        })
    layout = json.loads(json.dumps(TIMELINE_LAYOUT))
    layout['legend']['entrywidth'] = entrywidth
    layout['margin']['b'] = margin_b
    layout['height'] = height
    return {'data': traces, 'layout': layout}


def monitor_link(row):
    """Deep link into mmm.deadmanoz.xyz's tree view, centred on the header with a 16-block window either side."""
    h = row['height']
    return (f"https://mmm.deadmanoz.xyz/?tree_window=generated&tree_from={h - 16}&tree_to={h + 16}"
            f"&tree_height={h}&selected={row['hash']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    rows = json.loads((DATA / 'catalogue.json').read_text())['blocks']
    reported = json.loads((DATA / 'reported-cases.json').read_text())['blocks']
    assert len({x['hash'] for x in rows}) == len(rows)
    assert len({x['hash'] for x in reported}) == len(reported)
    assert not {x['hash'] for x in rows} & {x['hash'] for x in reported}
    counts = Counter(x['rule'] for x in rows)
    assert set(counts) <= set(RULES)
    rule_table = ['| Failure mechanism | Diagnostic | Blocks |', '|---|---|---:|']
    for rule, (label, diagnostic, _) in RULES.items():
        rule_table.append(f'| {label} | `{diagnostic}` | {counts[rule]} |')
    rule_table += ['', f'Established consensus failures across {len(rows)} distinct headers.', 'Shared reject strings are separated by mechanism; the P2SH row shows the 2012 wording, which a present-day node reports as `mandatory-script-verify-flag-failed (Operation not valid with the current stack size)`. {#tab:rules}']
    catalogue = ['| Height | Hash suffix | Date (UTC) | Failure | Pool / tag | Evidence |', '|---:|---|---|---|---|---|']
    for r in rows:
        evidence = 'body' if r['full_body'] else ('inclusion' if r['rule'] == 'p2sh_redeem_script_failure' else 'header/coinbase')
        height = f"{r['height']:,}"
        if 'merge_mining' in r['channels'].split(';'):
            # the merge-mining monitor holds every header with a merge-mining observation; link its tree view
            height = f"[{height}]({monitor_link(r)})"
        catalogue.append(f"| {height} | `…{r['hash'][-12:]}` | {r['date_utc']} | {RULES[r['rule']][0]} | {r['pool'] or 'unknown'} | {evidence} |")
    catalogue += ['', f'All {len(rows)} established failures.', 'Dates are header dates, including the stale timestamps in the two 2026 F2Pool headers; the timeline separately marks their observation dates.', 'Linked heights open the header in the [merge-mining monitor](https://mmm.deadmanoz.xyz/), which holds every case with a merge-mining observation. {#tab:catalogue}']
    missing = ['| Height | Hash suffix | Reported family | Header recovered | Missing evidence |', '|---:|---|---|---|---|']
    for r in reported:
        missing.append(f"| {r['height']:,} | `…{r['hash'][-12:]}` | {r['family']} | {'yes' if r['header_recovered'] else 'no'} | {r['missing_evidence']} |")
    missing += ['', f'All {len(reported)} reported cases whose claimed invalidity remains unproved.', 'Full identities and source associations are in the downloadable ledger. {#tab:uncatalogued}']
    post = POST.read_text()
    for marker, lines in [('rule-table', rule_table), ('catalogue-table', catalogue), ('reported-table', missing)]:
        pattern = rf'(<!-- {marker}:start -->\n).*?(\n<!-- {marker}:end -->)'
        post, n = re.subn(pattern, lambda m: m[1] + '\n'.join(lines) + m[2], post, flags=re.S)
        assert n == 1, marker
    for row in rows:
        observation_class(row)
    assert {observation_class(row) for row in rows} == set(OBSERVATION_COLOURS)
    timeline = scatter_timeline(rows, lambda row: RULES[row['rule']][2], COLOURS)
    observation = scatter_timeline(
        rows, observation_class, OBSERVATION_COLOURS,
        counts_in_legend=True, entrywidth=150, margin_b=260, height=640,
    )
    outputs = {POST: post,
               DATA / 'catalogue-timeline.json': json.dumps(timeline, indent=2) + '\n',
               DATA / 'observation-timeline.json': json.dumps(observation, indent=2) + '\n'}
    differences = []
    for path, text in outputs.items():
        if not path.exists() or path.read_text() != text:
            differences.append(str(path.relative_to(DATA.parents[5])))
            if not args.check:
                path.write_text(text)
    if args.check and differences:
        raise SystemExit('Regeneration required: ' + ', '.join(differences))
    print(f"{'Checked' if args.check else 'Generated'} {len(rows)} established cases, {len(reported)} reports, {sum(r['full_body'] for r in rows)} complete bodies and {sum(len(t['x']) for t in timeline['data'])} timeline points.")


if __name__ == '__main__':
    main()
