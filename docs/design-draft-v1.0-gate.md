# Design draft — the v1.0 gate

> Status: **open — v0.13.0 landed, burn-in pending** (2026-07-06).
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

### 2. Blocked function reached via `thread` spawn — **decided, spec v0.13.0**

Divergence: reference contained the error in the worker (`[THREAD ERROR]` + error Result, run
continues); v1/js failed the whole run during spawn processing.

Decision: **worker containment** — consistent with the rest of the worker error model
(fixtures 46/103: any runtime error inside a worker, including `FAIL`, fails that worker only and
lands as `{status:"error"}` in the collection). The call to the blocked function is worker work;
its failure is that worker's failure. Static validation (#9) already reports at parse time —
the runtime check is a backstop and should not have a bigger blast radius than other worker
errors. v1/js change; the reference already conformed.

### 3. Interpreter-dispatched names in host registration — **decided, spec v0.13.0**

`PRINT`/`SLEEP`-named externals were explicitly implementation-defined (LANGUAGE.md §Name
Resolution); `FAIL`/`UNWRAP`-named externals were silently ignored (built-ins win, v0.10.0).
Decision: registering an external under any interpreter-dispatched name (`PRINT`, `SLEEP`,
`FAIL`, `UNWRAP`) is a **host-API error** at registration time — loud instead of silent, the
natural extension of the v0.12.0 reserved-namespace philosophy. Host-API surface, so no
conformance fixture (the #9 precedent); unit-tested per runtime.

### 4. Double display envelope — **open, deferred (decide before the 1.0 stamp)**

Large-magnitude decimals display differently per runtime: reference formats plain decimal, v1
leaks Java scientific notation from ~1e7 (`1.5E7`), js switches to exponential at 1e21. Only
reachable via data (`JSON_PARSE`/`TO_NUMBER`/host values) — no fixture touches it. Candidate
decisions: pin plain-decimal display everywhere (v1/js formatting work), or spec an explicit
display range with documented fallback. **Not in v0.13.0** — needs its own small analysis
(cost: v1 formatter rework; risk of digit-string explosions for 1e300).

### 5. Resource limits — **decided, documented as host discretion (v0.13.0, non-normative)**

Loop iteration cap is already specified (1000, host-configurable). Recursion depth and memory are
runtime/host territory; exceeding them fails the run with an implementation-defined surface.
Documented explicitly so 1.0 doesn't imply a promise the spec never made.

## The 1.0 condition

1. v0.13.0 landed tri-runtime, fixtures byte-identical (items 1–3). ✅ *(this batch)*
2. Item 4 decided (one more small spec rev if pinning display).
3. TeeBox production adoption + burn-in with no spec-level findings.
4. Then **v1.0.0 = content freeze** of the last v0.13.x — a stamp, no new features.

## Rejected along the way

- **Silent promotion to decimal on overflow** — v1 and js already promoted *differently* (display
  divergence), and promotion silently changes `TYPE_OF`/formatting downstream. Fail-loud wins.
- **Lexer special-case for `-2147483648`** — three implementations would each need parse-tree
  context inspection; arithmetic reachability of −2³¹ makes it unnecessary.
- **Setup-phase failure for blocked spawns** (v1/js behavior) — would make a blocked worker the
  only worker error that kills the whole run.
