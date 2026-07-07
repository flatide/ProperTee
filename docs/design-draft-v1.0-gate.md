# Design draft — the v1.0 gate

> Status: **all items decided; spec v0.14.0 (items 2+4) implemented in the reference 2026-07-07
> (propertee2-java 0.11.0)**. Nominal number identity + ECMA-262 display + load-time rejection of
> blocked constructs + SUM fail-loud overflow; LANGUAGE.md updated; **112 fixtures / 299 tests
> green**, TeeBox composite-build suite green (187) on the new display. v0.13.0 had landed
> tri-runtime 2026-07-06 (reference 0.10.0 / propertee-java 1.6.0 / propertee-js). Item 2's
> v0.13.0 worker-containment is superseded by load-time rejection (§2). **Remaining before the 1.0
> stamp**: propertee-java v1 is out of scope for these corners (frozen legacy simple-evaluator on
> JVM 7 — §4); js follows best-effort (playground, new fixtures js-pending); then TeeBox
> production burn-in with no spec-level findings → v1.0.0 = content freeze of the last v0.14.x.
> Tracked **locally only** by user decision (no GitHub issues); this document is the record.

## Why

A v1.0 stamp promises "breaking changes now require v2.0". A 2026-07-06 maturity review found the
language core ready — issues #1–#9 all closed, zero open drafts, three implementations
byte-identical on the full fixture suite — but probing the **edges the fixtures don't cover**
exposed real divergence. The conclusion: v1.0 is warranted only after the corners below are
specified and the single production consumer (TeeBox) has burn-in time.

Empirical evidence (2026-07-06, all three runtimes):

| Probe | reference | v1 | js |
|---|---|---|---|
| `2147483647 + 1` | `-2147483648` (wrap) | `2.147483648E9` (promote + sci-notation) | `2147483648` |
| literal `9999999999` | unhandled `NumberFormatException` (stack trace) | `Runtime error: For input string: …` (unpositioned) | `9999999999` |
| `FLOOR(3000000000.7)` | `2147483647` (silent clamp) | `3.0E9` | `3000000000` |
| `-2147483647 - 1` | `-2147483648` ✓ | `-2147483648` ✓ | `-2147483648` ✓ |

All 103 conformance fixtures pass byte-for-byte on all three — i.e. the suite never touches this
envelope.

## Gate items

### 1. Integer model — **decided, spec v0.13.0**

- Integers are **32-bit signed** (−2³¹ … 2³¹−1).
- Integer **literals** must fit (tokens are unsigned; max `2147483647`); larger is a runtime error
  `Integer literal out of range: <token>`. −2³¹ is not writable as a literal (minus is an
  operator) but is a valid value, reachable via arithmetic (`-2147483647 - 1`) — no lexer
  special-case in any implementation.
- Integer arithmetic (`+`, `-`, `*`, unary `-`) that leaves the range → runtime error
  `Integer overflow`. No silent wrap (reference's old behavior), no silent promotion (v1/js —
  which didn't even agree with each other). Matches the fail-loud principle of the v0.7.0 batch.
  `/` always yields a decimal; `%` cannot overflow.
- `FLOOR`/`CEIL`/`ROUND` results outside the range → same `Integer overflow` (reference used to
  clamp silently — the worst of the three behaviors).
- **Data conversion is unchanged**: `JSON_PARSE`/`TO_NUMBER` keep promoting out-of-range integral
  values to decimals — data entry is not script arithmetic, and JSON must keep round-tripping.

### 2. Blocked function reached via `thread` spawn — **revised 2026-07-07: mandatory load-time rejection (targets spec v0.14.0)**

Divergence: reference contained the error in the worker (`[THREAD ERROR]` + error Result, run
continues); v1/js failed the whole run during spawn processing.

v0.13.0 decision (shipped, fixture 111): **worker containment** — consistent with the worker
error model (fixtures 46/103), on the reasoning that the runtime check is a backstop and should
not have a bigger blast radius than other worker errors.

**Superseded 2026-07-07 (user decision, same session as item 4): a script containing any blocked
construct does not run at all.** Execution is refused at load — before the first statement —
when the tree contains a hidden-keyword construct or an ignored-function call anywhere,
dead branches included (the same judgment `validate()` (#9) already makes). Rationale:

- **Partial-execution side effects**: under call-time enforcement, statements before the blocked
  call already ran (fixture 73's `x = 10` executes before the hidden `if` errors; a `WRITE_FILE`
  or `HTTP_POST` would have fired). An automation language should refuse the whole run upfront.
- **#9 already made the philosophical call**: scanning dead branches means "presence = invalid in
  this environment". Making enforcement mandatory completes that into one rule, instead of an
  opt-in scan plus separate runtime-containment semantics.
- **The static scan is complete**: the language has no indirect calls (call sites are literal
  names) and keywords are static, so load rejection covers every reachable path. The
  worker-containment question **evaporates** — no runtime path can reach a blocked construct.
  Runtime checks remain as (unreachable) backstops.
- **Cost ≈ 0**: the validate pass shipped tri-runtime in the #9 batch; `run` gains a pre-run
  scan wiring only.

Semantics pinned:

- Reject before executing any statement; the run fails with the **first violation in document
  order** (`Engine.validate` keeps returning all violations for host tooling).
- **Error surface unchanged by choice**: `Runtime Error at line L:C: 'X' is not available in
  this environment`, same string and position as the old call-time error — this keeps fixtures
  73/74 byte-identical and host `errorMessage` contracts stable.
- Deliberately sacrificed: the prop-guarded degradation pattern
  (`if ::hasShell == true then SHELL(...)`) no longer runs in a restricted host even when the
  guard is false. No known user (TeeBox uses no hiding — probed 2026-07-07), the language has no
  capability introspection so the pattern always needed host cooperation, and the decision's
  premise is exactly that such scripts should not run at all.

Work items (spec rev v0.14.0, bundled with item 4):

- LANGUAGE.md: the hiding/host-restriction section gains the load-time rejection rule.
- All three runtimes: wire the existing validate pass as a mandatory pre-run gate in `run`.
- Fixtures: 111 rewritten (single-line load failure); 73/74 unchanged by construction; new
  fixtures pinning "statements before the violation do not execute" (a `PRINT` before the
  blocked call produces no output) and "a dead-branch violation still rejects".

### 3. Interpreter-dispatched names in host registration — **decided, spec v0.13.0**

`PRINT`/`SLEEP`-named externals were explicitly implementation-defined (LANGUAGE.md §Name
Resolution); `FAIL`/`UNWRAP`-named externals were silently ignored (built-ins win, v0.10.0).
Decision: registering an external under any interpreter-dispatched name (`PRINT`, `SLEEP`,
`FAIL`, `UNWRAP`) is a **host-API error** at registration time — loud instead of silent, the
natural extension of the v0.12.0 reserved-namespace philosophy. Host-API surface, so no
conformance fixture (the #9 precedent); unit-tested per runtime.

### 4. Decimal envelope: display & number identity — **decided 2026-07-07, targets spec v0.14.0**

Two related corners, both reachable only via data or whole-decimal intermediates — no fixture
touches either. Both reduce to one question: *is the int/decimal distinction nominal
(provenance-based) or value-based?* Decision (user, 2026-07-07):

- **Number identity is nominal (provenance-based).** A number's representation is fixed where it
  is produced: integer literals, integer-integer `+`/`-`/`*`/`%`/unary `-` (overflow-checked,
  v0.13.0), and integer-producing built-ins yield integers; `/`, decimal literals, and
  decimal-marked data (`JSON_PARSE`/`TO_NUMBER`) yield decimals; a whole decimal never re-becomes
  an integer. The overflow rule applies only to provenance-typed integer arithmetic — whether an
  expression can overflow is decided by its structure, never by the runtime values flowing
  through it. Where an integer is *required* (indexing, dynamic keys, integer built-in
  arguments), whole decimals keep coercing — probed 2026-07-07, already convergent tri-runtime.
- **Display is ECMA-262 `Number::toString`** for all numbers, uniformly across
  `PRINT`/`TO_STRING`/`JSON_FORMAT`/collection rendering: shortest round-trip digits, plain
  decimal for magnitudes in [1e-6, 1e21), exponential (`1e+21`, `1e-7`) outside. Whole values
  render with no fraction part, so the existing ".0-stripping" rule becomes a corollary of the
  one-sentence spec.

2026-07-07 probes that hardened the case (beyond the v0.13.0-era table above):

| Probe | reference | v1 | js |
|---|---|---|---|
| `(1.5 + 1.5) * 2000000000` | `6000000000` | `Integer overflow` | `Integer overflow` |
| `2.0 * 1500000000` | `3000000000` | `3.0E9` (silent promotion) | `Integer overflow` |
| `UNWRAP(JSON_PARSE("2.0")) * 1500000000` | `3000000000` | `Integer overflow` | `Integer overflow` |
| `0.0001` | `1.0E-4` | `1.0E-4` | `0.0001` |
| whole `1e15` (data) | `1.0E15` | `1.0E15` | `1000000000000000` |
| `1e300` (data) | `1.0E300` | `1.0E300` | `1e+300` |

- v1 turned out to be internally incoherent: it re-boxes arithmetic *results* and parsed data
  but not literals/variables, so the same value `2.0` errors or silently promotes (the very
  behavior v0.13.0 banned) depending on where it came from.
- The only coherent value-based implementation (js) makes overflow errors **data-dependent**:
  `rate * count` fails iff `rate` happens to land on a whole value — the same expression passes
  with `2.0000001` and errors with `2.0`. Nominal typing keeps failures structural.
- Identity's observable surface is only the overflow rule plus display: indexing, dynamic keys,
  integer-argument built-ins, equality (`3 == 1.5+1.5` → `true`), and `TYPE_OF` already
  converge tri-runtime.
- The spec's existing wording is already nominal ("division always produces a decimal
  *internally*", "`10/2` *displays* as `5`") — this decision ratifies it. It is also zero
  behavior change for the production runtime (reference/TeeBox) during the burn-in.
- ECMA display: the JSON ecosystem's number rendering; the real-world bands (epoch ms ~1.7e12,
  `0.0001`) render plain — today v1 leaks `1.751856E12` and ref/v1 leak `1.0E-4`.

**Digit generation — resolved 2026-07-07: reformatting, no Ryu.** Probed all three engines'
`Double.toString` vs ECMA:

- Reference (JDK 25): `Double.toString` already yields ECMA significant digits for every normal
  value and most subnormals; the only divergence is a handful of values near `Double.MIN_VALUE`
  (e.g. `5e-324`, where JDK 25 emits `4.9E-324`). So the reference reaches ECMA by reformatting
  `Double.toString`'s output (exponent threshold `1e21`/`1e-6`, style `e+`/`e-`, drop mantissa
  `.0`) — no shortest-digits algorithm needed.
- Java 7/8 `Double.toString` (the old FloatingDecimal, unchanged JDK 1.0–18; JDK 19 replaced it,
  JDK-4511638) is *non-shortest* for a few normal values (`2e23` → `1.9999999999999998E23`),
  which would have forced a Ryu/Schubfach vendor port **only if v1 were a display target**.
- It is not (see scope below), so **no Ryu anywhere**. Every realistic display-band value —
  `0.0001`, `15000000.5`, `6e9`, `1.23e20`, `0.1+0.2`, `10/3`, `0.7+0.1` — has byte-identical
  significant digits on Java 7 and ECMA (probed); only the exponent format differs. The
  extreme-precision zone where a platform's `Double.toString` is non-shortest (`2e23`, deep
  subnormals) is **implementation-defined and kept out of fixtures** (the #5 precedent).

**Runtime scope — narrowed 2026-07-07 (user decision).** v1 (`propertee-java`) is a frozen
legacy runtime: it evaluates only simple statements (`if a==b then c`) on one legacy server,
runs on **JVM 7**, and will not expand. The number-representation corners are *unobservable* in
that usage (equality is representation-agnostic; simple values never enter the exponential band),
so v1 is **not a display/identity target for v0.14.0** — this narrows the earlier "v1's 1.x line
tracks the spec byte-for-byte" stance to "v1 tracks the spec for the simple subset it runs; the
number-representation edge corners are out of scope." The must-do target is the **reference**
(which TeeBox runs on); js follows best-effort (playground).

Work items (the existing 108 fixtures are untouched by construction — byte-identical tri-runtime
today, so none touches a divergent band; new fixtures only):

- LANGUAGE.md: §Number Representation gains the provenance rule; §Output Formatting pins
  ECMA-262 `Number::toString` (with the extreme-subnormal digit zone noted as impl-defined).
- **reference (must-do)**: `TeeFormat.formatDouble` → ECMA reformatting (one method, shared by
  PRINT/TO_STRING/JSON_FORMAT). Identity: **no change** — already nominal and v0.13.0-correct
  (verified: SUM `allInt` branch, ABS/MAX/MIN preserve provenance, FLOOR/CEIL/ROUND overflow-check,
  data entry already lexical `.`/`e`/`E` → Double).
- **v1**: none required (out of scope). Its current behavior stays correct for simple evals. New
  fixtures are v1-exempt. *(Optional cheap upgrade if display parity is ever wanted: the exponent
  reformatter alone — a string transform, Java 7 compatible, no identity refactor.)*
- **js (best-effort, deferred)**: represent the int/decimal distinction (BigInt-backed integers
  or a decimal wrapper) — the largest item; playground-only, so new fixtures are js-pending.
- New fixtures (reference-primary): display bands (`0.0001`, `15000000.5`, whole `6e9`/`1e15` via
  data, `1e21`, `1e-7`, `1e300` via JSON) + identity (`2.0 * 1500000000` → `3000000000`,
  `(10/2) * 1000000000` → `5000000000`, JSON `2.0` × int → decimal;
  `FLOOR(2.5) * 2000000000` → still `Integer overflow`).
- Adjacent optional cleanup: `SUM`/`MAX` integer paths currently do not overflow-check (`SUM`
  silently wraps `i += n`) — v0.13.0 pinned the `+`/`*` operators and FLOOR/CEIL/ROUND/ABS but
  not these built-ins. Pin them in v0.14.0 for consistency, or leave as a known gap.

### 5. Resource limits — **decided, documented as host discretion (v0.13.0, non-normative)**

Loop iteration cap is already specified (1000, host-configurable). Recursion depth and memory are
runtime/host territory; exceeding them fails the run with an implementation-defined surface.
Documented explicitly so 1.0 doesn't imply a promise the spec never made.

## The 1.0 condition

1. v0.13.0 landed tri-runtime, fixtures byte-identical (items 1–3). ✅ *(this batch)*
2. Item 4 decided (one more small spec rev if pinning display). ✅ *(2026-07-07: nominal
   identity + ECMA-262 display → spec v0.14.0, to be shipped tri-runtime, bundled with the
   item-2 revision to mandatory load-time rejection)*
3. TeeBox production adoption + burn-in with no spec-level findings.
4. Then **v1.0.0 = content freeze** of the last v0.14.x — a stamp, no new features.

## Rejected along the way

- **Silent promotion to decimal on overflow** — v1 and js already promoted *differently* (display
  divergence), and promotion silently changes `TYPE_OF`/formatting downstream. Fail-loud wins.
- **Lexer special-case for `-2147483648`** — three implementations would each need parse-tree
  context inspection; arithmetic reachability of −2³¹ makes it unnecessary.
- **Setup-phase failure for blocked spawns** (v1/js behavior) — would make a blocked worker the
  only worker error that kills the whole run. (Moot since the 2026-07-07 item-2 revision:
  blocked constructs now reject at load, before any execution — categorically earlier than a
  mid-run kill.)
- **Value-based number identity** (js behavior; item 4) — makes overflow errors data-dependent
  (`2.0 * 1500000000` errors, `2.0000001 * 1500000000` passes), contradicts the spec's own
  nominal wording, and would churn the production runtime mid-burn-in. v1's hybrid (re-box
  results but not literals) was never a candidate — it silently promotes on one path and errors
  on another.
- **Java-style display** (`1.0E-4`, `1.50000005E7`; item 4) — enshrines scientific-notation
  leakage in the most common real-world bands (epoch ms, small rates) because two runtimes
  happened to inherit `Double.toString`.
- **Plain-decimal-always display** (item 4) — deterministic but hostile at the extremes
  (`1e300` → a 301-digit string, `5e-324` → 325 chars) and custom formatting work in all three
  runtimes; ECMA's exponential fallback outside [1e-6, 1e21) keeps logs and JSON sane.
