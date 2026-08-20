# Design draft — `multi … limit K`: a concurrency cap on the multi block

**Status: decided & shipped** — spec v0.19.0, reference implementation propertee2-java 0.21.0
(fixtures 126–129), js synced same-day. No tracker issue — grew out of a user request to analyze
how the worker-pool pattern (playground example 22 "Worker Pool") could be made convenient, at
the language-spec level and the helper-function level; proposed and approved for shipping
in-session (2026-08-20). Of the open questions below, the keyword stayed `limit` and
PARTITION/FLATTEN were left unshipped (no worker-pool motivation remains; revisit on demand).

## The problem

"Run N jobs on K threads" is a natural batch-processing shape, but today ProperTee can only
express it as a **manual striping idiom** (playground example 22 is the exhibit):

```
// worker w takes jobs w, w+K, w+2K, ... — all of this is user-written boilerplate
function runSlice(w) do
    done = []
    i = w
    loop i <= LEN(::jobs) infinite do
        done = PUSH(done, runJob(::jobs.$i))
        i = i + ::workerCount
    end
    return done
end

multi result do
    loop w in [1..::workerCount] do
        thread $("worker" + TO_STRING(w)): runSlice(w)
    end
end
```

The user must hand-write: stride arithmetic, dynamic indexing (`::jobs.$i`), a per-worker slice
function, and result re-aggregation (results come back grouped per worker, not per job). Getting
any of it wrong is silent (skipped or double-processed jobs).

Two facts frame where the fix belongs:

1. **Under the single-baton cooperative model, "K threads" really means "at most K concurrent
   blocking operations".** Only one fiber executes at a time, so CPU work gains nothing from any
   K; K only bounds the overlap of SLEEP / SHELL / HTTP / external async. That bound is exactly
   what users need operationally: today, spawning one thread per job for 500 jobs launches **500
   concurrent SHELL processes** — there is no cap, and the safe version is the hard version.
2. **Load balancing is impossible at the script level — by design.** Worker purity (read-only
   global snapshot, no shared mutable state) rules out a shared job queue, so scripts can only
   distribute statically: a worker stuck on one long job cannot hand its remaining jobs to an
   idle worker. The runtime is the only layer where shared state is allowed, so "admit the next
   pending job the moment a slot frees" — work-stealing, effectively — can only be provided by
   the spec/runtime.

## The proposal

An optional `limit` clause on `multi`, capping how many spawned threads may run concurrently:

```
multi result limit 3 do
    loop job in ::jobs do
        thread $(job.name): runJob(job)
    end
end
```

The natural shape — **one thread per job** — becomes the safe shape. Striping, dynamic indexing,
slice functions, and re-aggregation all disappear; results collect per job in spawn order; load
balancing is automatic (a freed slot immediately admits the next pending thread); and the number
of concurrent SHELL processes / HTTP connections is bounded by K.

### Grammar (additive diff)

```
parallelStmt : K_MULTI resultVar=ID? (K_LIMIT limitExpr=expression)? K_DO block monitorClause? K_END ;
K_LIMIT : 'limit' ;
```

One new reserved word, `limit` — the same minor-breaking class as `elseif` (v0.9.0) and `null`
(v0.8.0): scripts using `limit` as an identifier stop parsing. The full 122-fixture corpus has
zero occurrences.

## Pinned semantics

1. **Evaluation**: `limitExpr` is evaluated **once, at multi entry, before the setup block runs**
   (alongside the global snapshot). It must be a positive **integer** (nominal, per spec
   v0.14.0). Zero, negative, decimal, or non-number values are a positioned runtime error —
   there is no silent "0 = unlimited". Omitting the clause means unlimited (today's behavior).
2. **Setup is unchanged**: every `thread` statement still executes during setup exactly as today —
   arguments are evaluated and deep-copied at the spawn statement, and the result entry is
   pre-registered as `{status: "running"}` in spawn order. Only **admission** (starting the
   worker's body) is deferred. Consequence: `{status, ok, value}` keeps its three statuses —
   a pending-not-yet-admitted worker is externally indistinguishable from a running one, so the
   Result contract, monitors, and host envelopes (TeeBox) see no new shape.
3. **Admission order is spawn order, deterministically**: at most K workers are admitted at multi
   start (in spawn order); when a worker finishes — success or error — the next pending worker is
   admitted at that point, on-baton. No timing dependence; the round-robin determinism guarantee
   is untouched.
4. **`K >= spawned count`** is exactly today's behavior. **`K = 1`** runs the workers
   sequentially in spawn order (still cooperatively interleaved with the monitor, and each worker
   can still suspend on SLEEP/blocking as usual).
5. **The monitor does not consume a slot.** It is a watchdog (spec v0.16.0), not a job; it spawns
   and ticks regardless of K. Its captured result snapshot simply shows pending workers as
   "running" (see 2). The guaranteed final tick is unchanged.
6. **Worker errors are unchanged**: `[THREAD ERROR]` reporting and the error Result work exactly
   as today; the failed worker's slot is freed and admission continues.
7. **Abort interaction** (reference runtime 0.16.0 host API): a run abort also terminates
   pending, never-admitted workers; they still receive terminal thread-observer states, same as
   admitted workers killed mid-flight.

## Rejected alternatives

- **`PMAP("funcName", jobs, K)` builtin** (or PARALLEL_MAP): ProperTee has no function values or
  references, so this requires inventing name-string dispatch — a second-class function-reference
  mechanism. It also inverts the layering (a builtin calling back into user functions) and hides
  spawn semantics (argument capture, worker purity) behind a catalog function. Rejected on
  language-philosophy grounds.
- **`loop job in ::jobs parallel K do … end`** (parallel loop): duplicates the parallel construct —
  result collection and purity semantics would exist in two places. `multi` already is the
  parallel construct; extending it is one clause, not a second construct.
- **`multi r 3 do`** (bare integer, like `monitor 500`): unreadable at the call site and blocks
  any future clause from attaching to `multi`. The keyword names what the number means.
- **Helper builtins instead** (`PARTITION(arr, k)` → k near-equal contiguous chunks,
  `FLATTEN(arrOfArrays)`): these soften the striping idiom (the worker takes its chunk as an
  argument; no stride arithmetic) and have generic value as array utilities, but distribution
  stays **static** — the load-imbalance and no-cap problems remain. Once `limit` ships they are
  no longer needed for worker pools; whether to add them anyway as general utilities is an
  independent, additive decision (FIND-class release).
- **Host-level / stdlib approaches**: a script-level stdlib needs a module system (out of scope);
  host-registered externals (e.g. TeeBox-only PARALLEL_MAP) fragment the language across hosts.
  Both rejected.

## Implementation sketch

- **Reference (propertee2-java)**: `Interpreter.execMulti` already runs setup first, collecting
  every thread statement into `MultiBuilder.pending`, then spawns them all in `runThreads`. The
  cap is local to `runThreads`: spawn the first K pending entries; in each worker's completion
  path (already the place that decrements `remaining`/signals the parent, on-baton), spawn the
  next pending entry if any. The coop scheduler likely needs no change. New keyword in
  `ProperTee.g4` + ANTLR regen; `limit` joins the keyword-hiding surface (`hidden 'multi'`
  already covers the whole construct).
- **propertee-js**: same collect-then-spawn structure (fixture 50 passes) — equivalent gating in
  its multi execution; grammar + regenerated parser + playground keyword highlight (`limit`).
- **v1 (propertee-java)**: out of scope (legacy, spec-sync only by decision; this is a runtime
  scheduling feature — same class as the features the two-line split reserves for the modern
  runtime). Note in LANGUAGE.md changelog if shipped.
- **TeeBox**: zero server change (composite-builds the runtime); editor static assets need the
  `limit` keyword added to highlighting (same touchpoint as the 0.17.0 FIND refresh).
- **Fixtures (expected)**: cap observed via interleaving (staggered SLEEP prints proving ≤K
  overlap), admission order determinism, `K = 1` sequential, the four error shapes for bad K,
  `K >= N` equivalence, monitor + limit (watchdog exempt, pending shown as running).
- **Docs**: LANGUAGE.md §multi gains the clause + a worker-pool example replacing the striping
  idiom; playground example 22 rewritten to the one-thread-per-job form.

## Open questions

1. **Keyword name**: `limit` reads naturally (`multi result limit 3 do`) but is also the word the
   loop-iteration cap uses informally in docs ("iteration limit"). Alternatives: `max`, `workers`,
   `pool`. Current lean: `limit` — it names the semantics (a concurrency limit), and the loop cap
   has no surface keyword to collide with (`infinite` is the loop's word).
2. **PARTITION / FLATTEN**: add anyway as generic array utilities in a separate additive batch,
   or leave the catalog minimal? No worker-pool motivation remains once `limit` ships.
