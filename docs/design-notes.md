# Language Design Notes

Open design questions for the ProperTee language. This file is the **index**; the analysis and discussion live in the [GitHub issues](https://github.com/flatide/ProperTee/issues). Each issue follows the same format: current behavior (spec citation) → problem → proposal → impact/compatibility → alternatives.

Snapshot: **2026-07-02**, spec v0.6.0. Update this file when issues close or new ones are filed.

## Open issues

| # | Title | Kind | Breaking? |
|---|---|---|---|
| [#1](https://github.com/flatide/ProperTee/issues/1) | Non-boolean conditions are silently falsy, while logical operators are strict | semantics | Yes — but failures become loud |
| [#2](https://github.com/flatide/ProperTee/issues/2) | `and`/`or` always evaluate both sides — the presence-guard idiom is impossible | semantics | Yes — narrow (side effects in right operand) |
| [#3](https://github.com/flatide/ProperTee/issues/3) | Add `elseif` — else-if chains require nested blocks with stacked `end`s | grammar | Nearly no (`elseif` becomes reserved) |
| [#4](https://github.com/flatide/ProperTee/issues/4) | JSON `null` becomes `{}` — JSON round-trips are lossy | value model / docs | Tiered (doc caveat is free) |
| [#5](https://github.com/flatide/ProperTee/issues/5) | `RANDOM(max)` exclusive vs `RANDOM(min, max)` inclusive — inconsistent bounds | builtin | Yes — **silent range shift** |
| [#6](https://github.com/flatide/ProperTee/issues/6) | `SLICE` (exclusive end) vs `SUBSTRING` (length) — two range conventions | builtin | Yes — **silent off-by-one** |
| [#7](https://github.com/flatide/ProperTee/issues/7) | `LEN` silently returns 0 for non-collections | builtin | Yes — but failures become loud |
| [#8](https://github.com/flatide/ProperTee/issues/8) | `not a == b` parses as `(not a) == b` — silent-false footgun with mixed types | docs / tooling | No |
| [#9](https://github.com/flatide/ProperTee/issues/9) | Host restrictions are runtime-only — opt-in parse-time validation pass | host API | No (opt-in) |

## Groupings

- **Silent-failure family** — #1, #7, and #8's mixed-type case: the places where an otherwise strict-and-loud language fails quietly. Unifying these to loud errors is a single design theme.
- **Builtin-consistency family** — #5, #6, #7: bounds/range/type conventions in the builtin catalog.
- **Guard ergonomics** — #1 + #2 combined: strict boolean conditions plus short-circuit `and`/`or` enable the safe, explicit `HAS_KEY(...) and obj.k` guard idiom.

## Recommended batching

The breaking items (#1, #2, #5, #6, #7) should land together in **one spec version** (e.g. v0.7.0) with a single migration note, rather than trickling out across releases. #5 and #6 are the most dangerous to ship alone — existing scripts change behavior *without erroring* — so pairing them with the loud-failure items (#1, #7) means migrating scripts get exercised while they are being touched anyway.

The non-breaking items (#3 `elseif`, #8 docs/lint, #9 opt-in validation) can proceed independently at any time.

## What an accepted change touches

Any accepted semantic/grammar change propagates to:

- this repo: `LANGUAGE.md` (canonical) + `grammar/LANGUAGE.md` (byte copy) + `LANGUAGE.ko.md` (manual translation), `grammar/ProperTee.g4` for grammar changes, `editors/vscode` + `editors/vim` for keyword changes
- [propertee2-java](https://github.com/flatide/propertee2-java) (reference implementation) — engine + conformance fixtures (new fixtures numbered 87+; existing `.expected` files change only with a spec version bump)
- [propertee-js](https://github.com/flatide/propertee-js) (playground) — interpreter + its fixture copy + playground examples
