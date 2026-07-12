# Design draft — the monitor is a watchdog thread (spec v0.16.0)

**Status: decided & shipped** — spec v0.16.0, reference implementation propertee2-java 0.14.0
(fixtures 32 rewritten, 117–118 added). No tracker issue — user proposal, analyzed and adopted
in-session (2026-07-12).

## The proposal

The `monitor` clause was specified as "runs code periodically while threads execute" — a polling
timer. That framing sits outside the language's thread model: everything else in a `multi` block
is a cooperative thread, but the monitor was described (and in v1, implemented) as scheduler
machinery. The proposal: re-specify `monitor` as an **automatically spawned watchdog thread** —
`monitor 500` means the watchdog *sleeps 500 ms between iterations* (like a thread running
`SLEEP(500)` in a loop), follows the same global-purity rules as any other thread, and observes
the other threads' state by **capture**.

## Finding: the reference already is a watchdog

Probing the reference (propertee2-java) showed the proposal is mostly a description of what the
production runtime already does. `Interpreter.runThreads` spawns the monitor with the same
`Scheduler.spawn` as workers; its loop is literally `coop.sleep(interval)` → run body →
repeat, with one final run after the workers finish. Fixed-delay, not fixed-rate — the "poll
every N ms" story was v1's implementation (a timer checked between scheduler steps) and the
spec's wording, not the reference's mechanics. So the adoption is chiefly **promoting the
implementation's reality into the spec's semantics**, plus deciding the deltas below.

Probing also surfaced a latent reference bug the old model hid: a user function called from a
monitor body could not see its own parameters/locals (the MONITOR variable-lookup branch
consulted only the injected result var and globals, never the call frames). The new model
removes that special-cased branch entirely, fixing it structurally.

## Decisions

### 1. Iteration scope: fresh per iteration, assignment allowed (not persistent)

The old rule — *any* assignment in a monitor is a runtime error — was a blunt instrument: it
also banned loop bindings and made function calls from the body useless. Two replacements were
considered:

- **Persistent locals** (a thread with a loop — locals carry over across iterations, enabling
  tick counters and running→done delta detection). **Rejected**: ProperTee has no
  "is-defined" test and reading an undefined variable is a runtime error, so a persistent local
  can never be initialized (`n = n + 1` errors on the first iteration; `n = 0` resets every
  iteration). The capability would be unusable without new syntax (an `init` clause — scope
  creep), and it contradicts the language's function-invocation scoping.
- **Fresh scope per iteration, like a function invocation** — **adopted**. Each iteration runs
  in a fresh local frame; local assignment, loops, and function calls all work; nothing carries
  over. Consistent with how every other body of code in the language behaves.

### 2. Purity: exactly the worker rules

`::` writes raise the *same* error as in a worker (`Cannot assign to global variable '::x'
inside multi block. ...`) — the monitor-specific "read-only" error is retired. Bare names are
locals, exactly as inside a function; the undocumented fallthrough that let a monitor read a
global by bare name is removed (the spec always said globals are read via `::`). Globals remain
the read-only multi-entry snapshot.

### 3. Observation: capture, not live view

Previously the scheduler injected the *live* result collection into the monitor's scope; the
draft's "captures the other threads' state" wording was adopted literally: each iteration binds
a **deep-copied snapshot** of the collection, taken as the iteration starts. Rationale:

- With assignment now legal, a live view would let the body mutate the real collection through
  member writes (`result.a.status = ...`) — the capture closes that hole without a new rule.
- A capture is consistent for the whole iteration even if the body suspends (`SLEEP`, blocking
  calls — legal in the reference); a live view would shift under it mid-iteration.
- It matches the language's own assignment semantics (assignment deep-copies).

Observable difference vs. live: only in bodies that suspend mid-iteration (fixture 118 pins it).
Per-iteration freshness still shows running→done transitions across iterations (fixture 56,
byte-identical).

### 4. Kept as-is

- **Cadence**: sleep-first, fixed-delay (first observation at ≈ interval; body time extends the
  cycle). Unchanged reference behavior; tick-count fixtures 20/32/56 unaffected.
- **Guaranteed final iteration** after all workers finish — the one place the watchdog is not
  sugar for a user-spawned thread (a user thread can't know its siblings finished). The runtime
  manages spawn, wake-up, and termination; that is the point of the construct.
- **Error handling**: `[MONITOR ERROR]` + skip remaining mid-run iterations + the final
  iteration still runs.
- **No setup-locals visibility.**
- Deliberately **not** done now: waking the watchdog early when the last worker finishes (today
  the reference's final iteration waits out the in-flight sleep, delaying `multi` completion by up
  to one interval — v1-compatible, invisible in fixture output). A pure-latency refinement,
  possible later without a spec change — the spec text explicitly leaves the final iteration's
  start time to implementation timing (js already runs it immediately on the last worker's
  completion; both behaviors are conformant).

## Compatibility

Breaking, mildly — in corners no realistic script occupies: (a) scripts relying on the
assignment *error*; (b) scripts reading globals by bare name in a monitor (undocumented) must
switch to `::`. Everything else is strictly more permissive. The error-message change is pinned
by rewritten fixture 32; new fixtures 117 (iteration locals, loops, function calls, capture
read), 118 (capture vs. live under suspension), 119 (nested `::g.x` member write is a global
write — banned, global untouched), and 120 (fresh scope per iteration — a mid-run local read in
the final iteration is undefined) pin the new semantics. 20/56 (cadence, running→done
visibility) are byte-identical.

## Post-ship review findings (2026-07-12)

An adversarial review of the initial ship surfaced three real gaps, all fixed same-day:

1. **js: nested `::` writes escaped to the live globals** (release-blocking). The js monitor's
   thread context took the *parent thread's* global snapshot — which for a top-level `multi` is
   the live variables — and js (unlike the reference's `rootLvalue()` guard) never checked the
   root of a property-assignment chain, so `::g.x = 2` in a monitor silently mutated the real
   global. Fixed by storing the multi-entry snapshot on the monitor entry and adding the
   root-`::` guard to property assignment (which also closes the same pre-existing hole for
   workers). Fixture 119 pins it tri-fold: the error, its position, and the untouched global.
2. **js: a failed iteration did not stop mid-run iterations** — `[MONITOR ERROR]` repeated every
   tick (fixture 32 passed only by timing luck). Fixed with an `aborted` flag; the final
   iteration still runs.
3. **Fixture 117 could not distinguish fresh from persistent scope** (fast workers → single
   final iteration; explicit `done = 0` init). Fixture 120 added as the discriminator.

Also folded in: the spec's final-iteration sentence was reworded to promise only *that* the
final run happens, not *when* (reference: at the in-flight sleep's expiry; js: immediately);
and the stale spec copies (`grammar/LANGUAGE.md`, propertee-js `LANGUAGE.md` — byte-copies;
`LANGUAGE.ko.md` and propertee2-java's annotated `docs/LANGUAGE.md` — manual/content syncs,
which had silently lagged since v0.14.0) were brought up to v0.16.0.

Runtime scope: reference shipped (0.14.0); js synced best-effort — **known js divergences**,
recorded here rather than papered over: fixture 118 pending (its monitor body executes
synchronously and cannot suspend — the v1-era async-in-monitor ban is still in place), the
final iteration runs immediately on completion (allowed by the spec wording above), and its
mid-run cadence is timer-checked between scheduler steps (fixed-delay measured from body end
after the review fix, but not a sleeping fiber). v1 out of scope (legacy simple-evaluation
server, consistent with v0.14.0/v0.15.0 practice).
