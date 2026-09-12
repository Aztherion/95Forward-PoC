# Design material — major-gift war room

The three redesigned screens (**The Board**, **The Forecast Room**, **Opportunity Detail**) that
replace the prospect-centric PoC screens. Design is closed; the screens are built from I18 onward.

This folder is committed deliberately: cloud agents clone the repository and cannot see untracked
files, so anything not in git is invisible on the automated path.

## What is here, and what each thing is for

| Artifact | Use it for | Never use it for |
| --- | --- | --- |
| `SCREENS.md` | The buildable spec: anatomy, computed-vs-stored, interactions, copy | — |
| `export/` | Exact copy strings, information hierarchy, layout structure | CSS, class names, markup |
| `screenshots/` | Visual reference; compare your build against them | Pixel-matching |
| [`../design-system.md`](../design-system.md) | **All** tokens, components, patterns | — |

**If the design and the design system conflict, the design system wins** — unless the change is
deliberate and documented in the same PR.

## Notes on each

**`export/`** — the Claude Design HTML export: `the-board.dc.html`, `the-forecast-room.dc.html`,
`the-opportunity.dc.html`, each loading its sibling `support.js`. Open them in a browser to read the
designs. They are standalone markup with their own styles; importing from them bypasses the design
system and creates a second source of truth.

`export/ds-theme/` is the **design tool's own "Classical" theme scaffold**, not ours — its
`styles.css` and `_ds_manifest.json` describe Claude Design's internal component kit and have nothing
to do with 95 Forward's tokens. Do not mine it for values; `../design-system.md` is the only token
authority.

**`screenshots/`** — `the-board-{1,2}`, `forecast-room-{1,2}`, `opportunity-{1,2}`: the redesigned
screens, two views each.

`screenshots/current-app/` is the **"before"** set — six screens of the PoC as it stands today
(home, today, master-prospect-list, candidates, green-sheet, funding-initiatives), uploaded as
reference while the redesign was drawn. They show what is being replaced, not what to build.

The debug/parameter bar visible at the top of the redesign screenshots (`defaultScope`,
`coverageMultiple`, `goalAmount`, `weeksLeft`) is Claude Design's harness, not a product feature —
see the "Never display" section of `SCREENS.md`.

## A superseded file was removed

The export originally carried a copy of `design-system.md` under `uploads/`. **It has been deleted**
to avoid two files with the same basename, one stale and one authoritative — an agent grepping for
`design-system.md` would have found the wrong one.

For the record: the war-room screens were drawn against **an earlier reconstruction** of the design
system, which [`../design-system.md`](../design-system.md) has since corrected. The corrections were
to counts and usage figures, not to tokens — the token layer was stable across both — so **no design
mismatch is expected**. Where they would disagree, the current file is authoritative.

## Tooling

`docs/design/` is excluded from prettier (`.prettierignore`) and eslint
(`eslint.config.mjs` → `ignores`). The export is generated third-party markup and its bundled JS
does not satisfy either; `SCREENS.md` is an imported spec kept verbatim rather than reformatted. The
folder sits outside `apps/`, so it is not part of the Next build or typecheck.
