# Language Design Notes

Open design questions for the ProperTee language. This file is the **index**; the analysis and discussion live in the [GitHub issues](https://github.com/flatide/ProperTee/issues). Each issue follows the same format: current behavior (spec citation) → problem → proposal → impact/compatibility → alternatives.

Snapshot: **2026-07-05**, spec v0.12.0. Update this file when issues close or new ones are filed.

## Landed — spec v0.12.0: reserved all-uppercase function namespace (2026-07-05)

| Item | Resolution |
|---|---|
| ALL-CAPS builtins replaceable by script functions — signal/guarantee mismatch (no issue — grew out of a rejected `sleep`-keyword proposal; analyzed in [design-draft-reserved-uppercase-namespace.md](design-draft-reserved-uppercase-namespace.md), adopted by user decision) | **Breaking**: `function NAME` where NAME matches `^[A-Z][A-Z0-9_]*$` is a definition-time runtime error. The ALL-CAPS convention becomes a guarantee (always built-in/host); future built-in additions become structurally non-breaking; supersedes v0.11.0's shadowing rule for built-ins (the order rule survives for non-reserved host externals). Fixtures: 104 removed, 75 renamed its helper, 105/106 added. The `sleep`-keyword proposal is rejected and recorded in the draft §2; the suspension model is now spec'd in LANGUAGE.md §Blocking and Suspension. |

## Landed — spec v0.11.0: function-name resolution pinned (2026-07-05)

| Item | Resolution |
|---|---|
| Script-function vs built-in dispatch divergence (no issue — surfaced by a v0.10.0 docs-accuracy review, adopted directly by user decision) | Resolution order specified: host-blocked check → script-defined functions → built-ins/externals. Script functions shadow all built-ins/externals in every runtime (the reference runtime's existing order); v1/js switched from builtins-first to script-first. Externals cannot replace `FAIL`/`UNWRAP`; `PRINT`/`SLEEP`-named externals stay implementation-defined. Fixture 104 pins it. Rationale: new spec built-ins must never change what existing scripts' calls resolve to. |

## Landed — spec v0.10.0: Result escalation `FAIL`/`UNWRAP` + genuine Results (2026-07-04)

| Item | Resolution |
|---|---|
| Script failure escalation (no issue — analyzed in [design-draft-result-handling.md](design-draft-result-handling.md), adopted directly by user decision) | Non-breaking additive batch: `FAIL(message)` escalation, brand-keyed `UNWRAP(res[, msg])`, `OK`/`ERR` constructors, `IS_RESULT`, and the *genuine Result* origin rule (§9 B안 of the draft — full first-class type rejected). No grammar/keyword changes; existing fixtures byte-identical. The TeeBox-side unconditional Result envelope (draft §5) remains a separate, not-yet-scheduled track. |

## Landed — docs/tooling (no spec version): `not` precedence footgun (2026-07-03)

| # | Title | Resolution |
|---|---|---|
| [#8](https://github.com/flatide/ProperTee/issues/8) | `not a == b` parses as `(not a) == b` — silent-false footgun with mixed types | Documentation + tooling per the issue's proposal; no grammar change. LANGUAGE.md §Precedence warning (EN/KO); vscode extension 0.3.0 ships a diagnostics provider flagging the `not <operand> ==/!=` shape (the corrected `not (…)` form is not flagged); vim highlights the shape as `WarningMsg`; the playground prints a parse hint before running. |

## Landed — spec v0.9.0: `elseif` (2026-07-03)

| # | Title | Resolution |
|---|---|---|
| [#3](https://github.com/flatide/ProperTee/issues/3) | Add `elseif` — else-if chains require nested blocks with stacked `end`s | Lua-style `elseif` per the issue's proposal — one chain, one `end`; first true arm wins, later conditions unevaluated; strict-boolean (v0.7.0) applies per evaluated condition; hiding `if` covers the chain. Nearly non-breaking: `elseif` becomes reserved. |

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
| [#9](https://github.com/flatide/ProperTee/issues/9) | Host restrictions are runtime-only — opt-in parse-time validation pass | host API | No (opt-in) |

The open item is non-breaking and can proceed independently at any time. If a future breaking item appears, batch it the same way: one spec version, one migration note, loud failures preferred over silent behavior shifts.

## Drafts — analysis done, deliberately not filed as issues

| Draft | Title | Doc |
|---|---|---|
| (TeeBox track) | Unconditional Result envelope on the run-result API (run = "thread #0") | [design-draft-result-handling.md](design-draft-result-handling.md) §5 — the language half of the draft landed as spec v0.10.0 (2026-07-04); the TeeBox host-side envelope is deferred until scheduled |

## What an accepted change touches

Any accepted semantic/grammar change propagates to:

- this repo: `LANGUAGE.md` (canonical) + `grammar/LANGUAGE.md` (byte copy) + `LANGUAGE.ko.md` (manual translation), `grammar/ProperTee.g4` for grammar changes, `editors/vscode` + `editors/vim` for keyword changes
- [propertee2-java](https://github.com/flatide/propertee2-java) (reference implementation) — engine + conformance fixtures (new fixtures numbered 87+; existing `.expected` files change only with a spec version bump)
- [propertee-js](https://github.com/flatide/propertee-js) (playground) — interpreter + its fixture copy + playground examples
- [propertee-java](https://github.com/flatide/propertee-java) (legacy, Java 7/8) — language semantics only (policy revised 2026-07: spec syncs allowed; stepper/host API untouched)
