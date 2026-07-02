# Language Design Notes

Open design questions for the ProperTee language. This file is the **index**; the analysis and discussion live in the [GitHub issues](https://github.com/flatide/ProperTee/issues). Each issue follows the same format: current behavior (spec citation) → problem → proposal → impact/compatibility → alternatives.

Snapshot: **2026-07-02**, spec v0.8.0. Update this file when issues close or new ones are filed.

## Landed — spec v0.8.0: first-class `null` (2026-07-02)

| # | Title | Resolution |
|---|---|---|
| [#4](https://github.com/flatide/ProperTee/issues/4) | JSON `null` becomes `{}` — JSON round-trips are lossy | `null` is the seventh value type, under a "**no implicit null**" principle: the language never produces it (missing args / bare `return` stay `{}`); it enters only via the `null` literal or data (`JSON_PARSE`, host values), and misuse (conditions/logic/arithmetic/member access) fails loudly via the v0.7.0 strictness. Breaking: `null` reserved word + `JSON_PARSE` stops normalizing `null`→`{}`. |

## Landed — spec v0.7.0 breaking batch (2026-07-02)

The five breaking items shipped together in **spec v0.7.0** with a single migration note (LANGUAGE.md §Changelog), implemented in propertee2-java 0.3.0 (reference) and propertee-js:

| # | Title | Resolution |
|---|---|---|
| [#1](https://github.com/flatide/ProperTee/issues/1) | Non-boolean conditions were silently falsy | Now a runtime error (`Condition requires a boolean value`) |
| [#2](https://github.com/flatide/ProperTee/issues/2) | `and`/`or` always evaluated both sides | Now short-circuit left to right |
| [#5](https://github.com/flatide/ProperTee/issues/5) | `RANDOM(max)` exclusive vs `RANDOM(min, max)` inclusive | Single-argument form removed (loud failure) |
| [#6](https://github.com/flatide/ProperTee/issues/6) | `SLICE` vs `SUBSTRING` range conventions | `SLICE(arr, start, count)` — count-based, unified with SUBSTRING/READ_LINES. (Implementation finding: the old 3rd arg was in practice a 1-based *inclusive* end; the old spec text "end is exclusive" described the 0-based internal bound.) |
| [#7](https://github.com/flatide/ProperTee/issues/7) | `LEN` silently returned 0 for non-collections | Now a runtime error |

## Open issues

| # | Title | Kind | Breaking? |
|---|---|---|---|
| [#3](https://github.com/flatide/ProperTee/issues/3) | Add `elseif` — else-if chains require nested blocks with stacked `end`s | grammar | Nearly no (`elseif` becomes reserved) |
| [#8](https://github.com/flatide/ProperTee/issues/8) | `not a == b` parses as `(not a) == b` — silent-false footgun with mixed types | docs / tooling | No |
| [#9](https://github.com/flatide/ProperTee/issues/9) | Host restrictions are runtime-only — opt-in parse-time validation pass | host API | No (opt-in) |

The open items are all non-breaking (or free at the documentation tier) and can proceed independently at any time. If a future breaking item appears, batch it the same way: one spec version, one migration note, loud failures preferred over silent behavior shifts.

## What an accepted change touches

Any accepted semantic/grammar change propagates to:

- this repo: `LANGUAGE.md` (canonical) + `grammar/LANGUAGE.md` (byte copy) + `LANGUAGE.ko.md` (manual translation), `grammar/ProperTee.g4` for grammar changes, `editors/vscode` + `editors/vim` for keyword changes
- [propertee2-java](https://github.com/flatide/propertee2-java) (reference implementation) — engine + conformance fixtures (new fixtures numbered 87+; existing `.expected` files change only with a spec version bump)
- [propertee-js](https://github.com/flatide/propertee-js) (playground) — interpreter + its fixture copy + playground examples
