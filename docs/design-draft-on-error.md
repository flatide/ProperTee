# Design draft: `on error` and `otherwise`

**Status:** stage 1 landed in spec v0.37.0 (propertee2-java 0.46.0, propertee-js, TeeBox pickup);
stage 2 is a draft · **Targets:** stage 1 — the handler, `otherwise` on Results and two rules that
come with it — in spec v0.37.0; stage 2 — built-in failures stop unless `otherwise` — in one
breaking batch before v1.0.

This draft states the language. [Fit with the existing spec](#fit-with-the-existing-spec) checks it
against each section of LANGUAGE.md, and the work in the runtimes and hosts is under
[Implementation](#implementation). Where the spec decides, both runtimes follow it. Where it is
silent and the runtimes differ, the JavaScript runtime follows the Java runtime, the reference.

## Summary

A failure reaches a script in one of two ways, and each gets one construct:

- **A failure nobody planned for stops the run.** `on error` gives the script one place to log,
  notify and report just before the run ends. It is not try/catch — nothing resumes.
- **A failure the script expects is handled on its own line.** `otherwise` says what to use or do
  instead: a value, the next item, or a block.

`UNWRAP` stays beside them, for a value that must be there ([`UNWRAP` stays](#unwrap-stays)).

```
on error do
    PRINT("Job failed:", _ERROR.message, "at line", _ERROR.line)
    APPEND_FILE("/logs/job.log", DATE() + " " + _ERROR.message + "\n")
    return {"failed": true, "reason": _ERROR.message}
end

input = _ARGS.1
loop line in FILE_LINES(input) infinite do      // a file that cannot be read stops the run
    record = JSON_PARSE(line) otherwise err do  // a line that is not JSON is skipped
        PRINT("skipped:", err.message)
        continue
    end
    PRINT(record.id)
end
```

## Problem

Scripts are written by people who do not plan for errors. Today a failure reaches them in one of
two ways:

- A runtime error stops the run at the point of failure.
- Most file, shell and HTTP built-ins return a Result instead. A script that does not check it
  carries the failure on as a value: an unchecked `WRITE_FILE` fails silently, and a Result used
  as data produces wrong output. After `x = READ_LINES(f)` on a missing file, `LEN(x)` is 3 and
  `loop line in x` goes through `"error"`, `false` and the message.

Handling the second kind takes `res.ok`, `res.value`, `UNWRAP` and the notion of a genuine
Result — mechanics a non-programmer should not need. When a failure *is* expected — a file that
may be missing, a line that may not parse, one bad item among many — the same mechanics are the
only tool, and making every I/O failure stop the run would leave none.

The goal is two rules: *a failure nobody handled stops the run*, with one place to act on it, and
*a failure the script expects is handled on the line where it happens*.

## Alternatives rejected

| Alternative | Why not |
|---|---|
| try/catch, or an `otherwise` that catches errors | Resumes after any error, bugs included. If `otherwise` caught the errors raised on its left, `READ_JSON_FILE(f).enabled otherwise false` would always be `false`, because `.enabled` is applied to the Result. The `otherwise` below looks only at a Result value; an error on its left stops the run as before. |
| `otherwise` alone, Results kept as they are | Protects only the lines that use it; a line without it still carries the failure on as a value (see Problem). `otherwise` comes with `on error` and stage 2, not instead of them. |
| Continue by default — errors become values, only resource exhaustion stops | Wrong results and wrong side effects, unnoticed: an empty array written over yesterday's output, a shell command run in the wrong directory. Reverses v0.7, v0.8, v0.13, v0.30 and v0.32–v0.36. Excel's `#DIV/0!` works only because a cell has no side effects, shows its error, and has no control flow. |
| `UNWRAP` as a keyword | As a function it already acts like syntax: a script cannot define it (v0.12.0), a host cannot replace it (v0.13.0), and every call is found at load, which is all stage 2's exception needs. A keyword brings a precedence trap whichever way it binds. `UNWRAP(result.job).key` (fixture 132) needs both orders: `unwrap result.job.key` applies `.key` to the Result if `unwrap` binds like `not`, and `unwrap` to `result`, which is no Result, if it binds tighter — so the parentheses come back. Its second argument, `message`, would need syntax of its own; `unwrap` could no longer name a variable or a key (`x.unwrap`); `FAIL`, `OK`, `ERR` and `IS_RESULT` would stay functions. A trailing symbol (`f()!`) has no trap, but is not notation a non-programmer reads. v0.10.0 added no keywords, and the 2026-07-05 decision kept `UNWRAP` as the answer. |
| An automatic-unwrap block (`strict do ... end`) | Rejected 2026-07-05 (`design-draft-result-handling.md` §6.2): the block moves "this call can stop the run" off the line, and saved one token over `UNWRAP`. Stage 2 unwraps per call with no block, and `otherwise` adds what `UNWRAP` cannot: recovery. |
| `otherwise` anywhere in an expression | `continue`, `break`, `return` and a block mean nothing inside an expression, and precedence would matter: `"Lines: " + READ_LINES(f) otherwise []`. At the end of a statement there is one place to look. |
| An `otherwise` block that may simply end | In a loop, `lines = READ_LINES(f) otherwise err do PRINT(err.message) end` would go on with the previous file's lines in `lines`. |
| An error for a discarded failed Result (`WRITE_FILE(...)` as a statement) | Not needed once a built-in's Result is unwrapped (stage 2). |
| An HTTP response as data whatever its status | An error page would pass as data — the `.body` of a 500 — the silent failure this draft removes. The spec's rule stays: only a 2xx response succeeds, and a script that expects a status reads it in the block (`err.value.status`). |
| Binding a check and the action into a transaction (`FILE_EXISTS`, then `READ_FILE`) | Impossible: another process deletes the file, and file systems are not transactional. The check goes inside the operation instead — see [Stage 2](#stage-2-built-in-failures-stop-unless-otherwise). |

## The handler

### Syntax and placement

- `on error do ... end`. `on` becomes a reserved word; `error` does not — it means something only
  after `on`, so a variable named `error` still works.
- At most one handler, at the top level, right after the imports.
- The grammar accepts it as a statement, and the load-time check refuses it anywhere else, so the
  user gets a plain message rather than a parser's:
  - `'on error' must come right after the imports`
  - `A script can have only one 'on error'`
  - `Expected 'error' after 'on'`
- In import mode the handler is skipped, like all top-level code. A module executed directly uses
  its own handler.

```
statement    : ...
             | errorHandler   # ErrorHandlerStmt
             ;
errorHandler : K_ON ID K_DO block K_END ;   // ID must be 'error'; place and count checked at load

K_ON : 'on' ;
```

### When it runs

| Situation | Handler |
|---|---|
| A runtime error while the script runs — a built-in, an operator, an undefined name, the loop limit, `FAIL`, `UNWRAP` | Runs |
| An error inside an `otherwise` block | Runs |
| A failure taken by `otherwise` | Does not run — it never became an error |
| An error inside an imported function | Runs; `_ERROR.source` names the module |
| An error in a `multi` setup phase, or after the block | Runs |
| A worker's error, a monitor iteration's error | Does not run — collected and reported as today |
| A normal end, including a top-level `return` (an `otherwise return` at the top level too) | Does not run |
| A script refused before it starts — parse error, blocked construct, import resolution, the load-time checks of this draft | Does not run |
| A stop asked for before the error — the host's time limit, the user's Stop, the debugger's Quit — a failure the stop causes included, such as a killed `SHELL` command | Does not run — the run is stopped, not failed |
| A stop asked for while the handler runs | Ends the handler; the run stays failed |
| Resource exhaustion (memory, stack) | Not guaranteed |

The handler runs at most once per run.

### `_ERROR`

| Field | Value |
|---|---|
| `message` | The error message, without the `Runtime Error at line L:C:` prefix |
| `line`, `column` | Where the error happened, as the error report gives it — both counted from 1; for a built-in's error, the position of the call |
| `source` | The source id — the entry script's or the module's |

- `_ERROR` is set as a global just before the handler runs, replacing any global of that name.
  Outside the handler it is an ordinary name. As a global it comes before a host property of the
  same name in the lookup order, so a caller cannot hide the error.
- In a function called from the handler it is `::_ERROR`, as with `_ARGS`. Passing it reads
  better: `notify(_ERROR)`.
- Fields may be added in later versions, never removed or renamed.
- The position takes two changes to the error report: a built-in's error gets one, and the column
  counts from 1 ([Fit](#fit-with-the-existing-spec), Runtime Errors).

### Rules

1. **Order.** The runtime reports the original error, runs the handler, and ends the run as
   failed. The error is reported before the handler starts, so a handler that hangs or fails
   cannot hide it.
2. **Scope.** The handler is top-level code: it reads and writes globals by plain name. It sees the
   state at the moment of the error — the failed function's locals are gone, and a global not yet
   assigned does not exist, so assign the globals it reports right after it (`done = 0`). A
   function exists once its definition has run. Before the handler starts, the runtime runs the
   definitions directly under the root that the script has not reached, in order, as import mode
   registers them. So the handler can call a function defined below the line that failed, and a
   later definition of a name replaces an earlier one, as it would have had the run reached it. A
   definition that fails — an all-uppercase name (v0.12.0) — is an error in the handler (rule 5).
3. **Value for the host.** `return value` in the handler hands the value to the host with the
   failure ([What the host gets](#what-the-host-gets)); without a `return` it is `{}`. The run
   still fails.
4. **No resuming.** Nothing in the handler can continue the script or turn the failure into
   success.
5. **An error in the handler** stops the handler and is reported as `[HANDLER ERROR] ...`; the
   handler is not entered again. The run fails with the original error, and the host gets `{}` as
   the returned value.
6. **Limits and stops.** The handler runs under the run's limits: the loop limit and the host's
   time limit. A stop asked for while it runs — the time limit, the user's Stop, the debugger's
   Quit — ends it, and the run stays failed with the original error.
7. **Debugging.** `debug` statements and breakpoints in the handler act as in other main-thread
   code.
8. **`otherwise` works in the handler** as anywhere, so one step can be best-effort:
   `APPEND_FILE(log, line) otherwise err do PRINT("log not written:", err.message) end`.
9. **Alone.** No worker or monitor is running when the handler starts. The main thread waits at a
   `multi` block until every thread has ended (Multi Blocks, Semantics 8), worker and monitor
   errors do not reach the handler, and a `multi` block checks its monitor interval before its
   first worker starts, as it does `limit`. If the main thread ever fails while workers are alive,
   the runtime stops them, as a stop does, before the handler starts.

### What the host gets

- A run ends in one of three ways. It **completes**, with the value it returned. It **fails**,
  with the original error — `message`, `line`, `column` and `source`, as in `_ERROR` — and how the
  handler ended: the value it returned (`{}` without a `return`), its error, or the stop that
  ended it. Or the host **stops** it.
- **Failed or stopped is settled once, when the error happens.**
  - No stop asked for yet: the run has failed. A stop asked for later — the time limit, the user's
    Stop, the debugger's Quit — still ends the handler and whatever the run has running, but the
    run stays failed with the original error.
  - A stop already asked for: the run is stopped and the handler does not run, whatever the error,
    since a stop can itself make a call fail — it kills a `SHELL` command.
- How the host shows the returned value is host-defined; which way the run ended is not.

## `otherwise`

A failure the script expects is handled on the line where it can happen:

```
lines = READ_LINES(f) otherwise []                  // a value instead
lines = READ_LINES(f) otherwise continue            // the next item; also break, return
lines = READ_LINES(f) otherwise err do              // a block; err describes the failure
    PRINT("skipped", f, err.message)
    continue
end
WRITE_FILE(path, text) otherwise PRINT("not saved") // a statement: the value is computed, then dropped
```

The value form does what a spreadsheet's `IFERROR` does. `or` stays boolean-only.

### Syntax

- `otherwise` ends a statement: an assignment, a `return` with a value, or an expression
  statement. It never appears inside an expression.
- The fallback is a value, `continue`, `break`, `return` with or without a value, or a block
  `do ... end`, which may name the failure: `otherwise err do ... end`.
- `otherwise` is a reserved word. It follows an expression, so it cannot be contextual like
  `error`: `x = f() otherwise 0` also reads as the three statements `x = f()`, `otherwise` and `0`.
- A `thread` statement takes none: a worker's failure becomes its entry.

```
statement       : assignment otherwiseClause?                # AssignStmt
                | ...
                | expression otherwiseClause?                # ExprStmt
                ;
flowControl     : ...
                | K_RETURN (expression otherwiseClause?)?    # ReturnStmt
                ;
otherwiseClause : K_OTHERWISE fallback ;
fallback        : K_CONTINUE                                 # FallbackContinue
                | K_BREAK                                    # FallbackBreak
                | K_RETURN (expression otherwiseClause?)?    # FallbackReturn
                | name=ID? K_DO block K_END                  # FallbackBlock
                | expression otherwiseClause?                # FallbackValue
                ;

K_OTHERWISE : 'otherwise' ;
```

### Rules

1. **What it looks at** is the value on its left:
   - a genuine Result with `ok` true gives its `value`;
   - a genuine Result with `ok` false, `"running"` included, gives the fallback;
   - anything else is a runtime error, even when nothing failed:
     `'otherwise' needs a Result, but TO_NUMBER() gave a number`. A function that returns no
     Result shows up on the first run, not on the first failure.

   Genuine is the v0.10.0 brand: a plain object with `ok` and `value` fields is not a Result.
2. **Not try.** An error raised while the left side is computed — an argument, a member access,
   the body of a called function — stops the run as usual.
   `READ_JSON_FILE(f).enabled otherwise false` stops with `Property 'enabled' does not exist`.
3. **The fallback runs only on failure.** `otherwise defaultLines()` calls `defaultLines` only when
   the read failed. A value that came back normally — `false`, `0`, `""`, `[]`, `null` — is not a
   failure.
4. **A Result as the fallback is unwrapped** like `UNWRAP`: its value, or the run stops with its
   message. `x = READ_FILE(a) otherwise READ_FILE(b)` reads "a, else b, else stop". Fallbacks
   chain: `READ_FILE(a) otherwise READ_FILE(b) otherwise ""`. As with `UNWRAP`, one level comes
   off, on either side of `otherwise`: a Result inside the value stays a Result, so
   `x = ERR("a") otherwise OK(OK(1))` sets `x` to `OK(1)`.
5. **The block** must end in a way that depends on the statement:

   | The block follows | It must |
   |---|---|
   | An assignment to a variable — `lines = ...` | Leave — `continue`, `break`, `return` or `FAIL` — or set `lines` |
   | An assignment to a member or an element — `config.port = ...`, `rows.$i = ...` | Leave |
   | A `return`, a fallback `return` included | Leave |
   | An expression statement | Nothing; it may simply end |

   Reaching `end` without doing so is a runtime error:
   `The 'otherwise' block must set 'lines' or leave with continue, break, return or FAIL`, or
   `The 'otherwise' block must leave with continue, break, return or FAIL`. Rust's `let ... else`
   and Swift's `guard` require leaving. Setting is allowed because some failures decide the value
   ([SHELL](#stage-2-built-in-failures-stop-unless-otherwise) below), and only for a variable,
   because a member's place can move while the block runs: in
   `rows.$i = f() otherwise err do i = i + 1; rows.$i = 0 end` the block sets another element.
   The block sets the variable by running an assignment to it itself, not in a function it calls;
   at the top level `lines` and `::lines` are one variable. A value fallback works with any
   target (`rows.$i = f() otherwise 0`): the right side, fallback included, is computed before
   the target's place, as in every assignment.
6. **The failure** the block names is an object:

   | Field | Value |
   |---|---|
   | `message` | Always a string — the text `UNWRAP` would report (`TO_STRING(value)`) |
   | `value` | The failed Result's value as it is — for HTTP, `{status, body, headers}` |

   Fields may be added later, never removed. The name follows the loop-variable rule: a global at
   the top level, a local in a function, replacing a variable of that name.
7. **Flow.** A fallback `continue`, `break` or `return` does what the statement does where it
   stands. `continue` and `break` act on the innermost loop around them in the same function body
   ([the two rules](#two-rules-that-come-with-it)). `return` returns from a function, ends a
   monitor iteration, and at the top level ends the run as a success — without the handler. In a
   `multi` setup the same rules hold. When one of them leaves the setup itself — a `return`, or a
   `break` or `continue` whose loop is outside the block — the threads collected so far do not
   start; a `break` or `continue` on a loop inside the setup leaves the setup running.
8. **Everywhere.** `otherwise` works in functions, `multi` workers, monitor bodies and the
   handler. A worker's entry is a Result, so `n = r.count otherwise 0` reads a worker's value or
   0. In a monitor it reads the captured entry as `UNWRAP` does: a finished entry gives its
   thread-information object (v0.21.0), and a `"running"` entry gives the fallback.

`otherwise` never unwinds script code. A script function that wants its caller to recover returns
`ERR(...)`; an error inside it stops the run. Capturing every error of a whole function stays the
job of a `multi` worker (`design-draft-result-handling.md` §6.1). Purity keeps a failed worker
from leaving half-written globals behind; it does not undo the worker's file writes, requests or
commands.

### Two rules that come with it

`otherwise` puts `return`, `continue` and `break` right after a call, where two corners of the
language become traps.

1. **A `return` value starts on the same line.** Line breaks do not end statements (Semicolons),
   so a bare `return` takes the next line as its value: `return` with `PRINT("x")` on the next
   line prints `x` and returns `{}`. Today that line is dead code anyway; after `otherwise` it is
   the success path:

   ```
   lines = READ_LINES(f) otherwise return
   process(lines)          // read as: otherwise return process(lines)
   ```

   `process` would never run on success. A `return` whose value starts on a later line is refused
   at load: `The value of 'return' must start on the same line`. It is the one place where a line
   break matters.
2. **`break` and `continue` belong to a loop in the same function body.** The spec has them act on
   "the innermost enclosing loop". *Enclosing* is lexical: a loop around the statement in the same
   function body, never a loop in the caller. A monitor body counts as a function body, since each
   iteration runs like a function invocation; the handler is top-level code; a `multi` setup is no
   boundary ([rule 7](#rules-1)). A `break` or `continue` without such a loop is refused at load:
   `'continue' must be inside a loop`.

## `UNWRAP` stays

Each of the three tools answers its own question:

| Tool | For | Where |
|---|---|---|
| `UNWRAP` | A value that must be there: its value, or the run stops | Anywhere in an expression |
| `otherwise` | A failure the script expects: what to use or do instead | At the end of a statement |
| `on error` | What to do when the run stops | Once, right after the imports |

`otherwise` does not replace `UNWRAP`:

- **Inside an expression.** `otherwise` never stands there; `UNWRAP` does:
  `loop entry in UNWRAP(LIST_DIR_NAMES(dir)) do`, `PRINT(UNWRAP(result.job).key)`. Without it the
  value needs a line of its own and a block:
  `entries = LIST_DIR_NAMES(dir) otherwise err do FAIL(err.message) end`.
- **In stage 1** a failure a built-in reports with a Result does not stop the run by itself.
  `UNWRAP` is the short way to make it stop, and so to reach the handler.
- **After stage 2** what script functions return with `OK`/`ERR`, and `multi` entries, are still
  Results. `UNWRAP` takes their value inside an expression.
- **Its second argument, `message`,** names the step in the error and in `_ERROR.message`:
  `UNWRAP(JSON_PARSE(text), "config parse")` reports `config parse: <parse error>`.
- **`otherwise` is defined by it.** The fallback Result, `err.message`, a monitor entry and stage
  2's stopping message all read a Result as `UNWRAP` does.

In stage 2, `UNWRAP` around a built-in's call without `message` gives what the call alone gives.
The spec suggests it there only to add a `message`; it is not deprecated. It stays a built-in
function, not a keyword ([Alternatives rejected](#alternatives-rejected)).

## Stage 2: built-in failures stop unless `otherwise`

The handler and `otherwise` are useful on their own. The model is complete only when a failure
nobody handled stops the run; until then, a failure the user did not check never reaches the
handler. Stage 2 does this with one rule:

> A built-in that reports its outcome with a Result, and every host function, gives its value
> directly, unless `otherwise` or `UNWRAP` reads the call's Result: the call is the whole left
> side or the whole value fallback of an `otherwise`, or the whole first argument of `UNWRAP`.
> On failure the run stops with the message `UNWRAP` would report.

- The rule is keyed on the callee, not on the shape of a value
  (`design-draft-result-handling.md` §6.2): the runtime knows at the call which function it
  called.
- **Which built-ins.** Those whose entry says they return a Result — the file built-ins other
  than `FILE_EXISTS` and `FILE_LINES`, `SHELL`, `SHELL_CTX`, the HTTP family, `JSON_PARSE` — and
  any the audit adds. The Result tools are not among them: `OK` and `ERR` make a Result as a
  value, which is what they are for, and `UNWRAP`, `IS_RESULT` and `FAIL` take one. So
  `return ERR("missing")` still hands the caller a Result to take with `otherwise`.
- **Only the outcome, one level.** A Result the call passes through as a value stays a Result:
  the `default` of `READ_FILE(path, default)`, the value `UNWRAP` returns, a Result a host
  function returned.
- **A value fallback.** Rule 4 takes off the call's Result itself, as before, so a call there is
  not unwrapped twice. In `x = ERR("a") otherwise HOST()`, a host that returns `OK(1)` as its
  value still sets `x` to `OK(1)`, and one that returns `ERR("data")` sets it to `ERR("data")`
  instead of stopping the run. A failed call stops the run either way, with the same message.
- **`UNWRAP`'s argument.** `UNWRAP` reads the call's Result itself, so it works as before. Its
  second argument, `message`, still shows in the error: `UNWRAP(JSON_PARSE(text), "config parse")`
  reports `config parse: <parse error>`. And `UNWRAP(HOST())` takes off the call's Result and
  nothing more, also when the host returned a Result. `UNWRAP` stops the run on a failure anyway,
  so the exception hides nothing. `IS_RESULT` gets none: it would turn a failed call into `false`
  and carry on.
- What stays a Result: what script functions return with `OK`/`ERR`, and `multi` entries.
  `otherwise`, `UNWRAP` and `.ok` keep working on them.
- In `x = JOIN(READ_LINES(f), ",") otherwise ""` the inner `READ_LINES` is unwrapped and `JOIN`
  gives a string, so rule 1 refuses the line: the read goes on a line of its own.
- Which lines change is listed under [Compatibility](#compatibility).

| Change | Detail |
|---|---|
| Mistakes in a call always stop | A wrong argument type, a position out of range or a malformed pattern is a runtime error in every built-in, never a failure `otherwise` can take. Some are error Results today: `HTTP_GET(5)`, `SHELL(5)`, `SHELL_CTX(".", 5)`, `READ_LINES(p, 0)`, `LIST_DIR(p, "[")`. |
| Failures of the input or the environment can be taken | Runtime errors that are such failures — `TO_NUMBER` of text that is not a numeral, `FILE_LINES` of a file that cannot be read — become failures `otherwise` can take: the built-in reports the failure as a Result when the call is the left side of `otherwise`, and stops without it, as today. The audit fixes the list. Non-breaking, so it can come before the batch. |
| What a failure carries | A message string, except HTTP and SHELL, whose failures carry an object (below). `err.message` is a string either way. |
| A default for a missing file | `READ_FILE(path, default)`, `READ_JSON_FILE(path, default)` and `FILE_LINES(path, default)` return `default` — any value, as with `ENV(name, default)` — when the path does not exist, a missing parent directory included. A directory, a permission problem or invalid JSON still fails: narrower than `otherwise {}`, which would also replace a corrupt config. `READ_LINES` is left out: its second argument is `start`. |
| Idempotent operations | `DELETE_FILE` succeeds when the file is already gone (`rm -f`). `MKDIR` of an existing directory succeeds (`mkdir -p`), and the spec says so. A file where the directory should be still fails. |
| What the action built-ins give | `WRITE_FILE`, `WRITE_LINES`, `WRITE_JSON_FILE`, `APPEND_FILE`, `MKDIR` and `DELETE_FILE` give `{}`, the value their Results carry today. |
| SHELL | A non-zero exit is a failure carrying `{exitCode, output}` — today only the output, so a script cannot see the code. `SHELL_CTX` gives the plain context `{cwd, env}`, and `SHELL(ctx, cmd)` takes exactly that. |
| HTTP | As the spec says today: a response with a 2xx status is the value `{status, body, headers}`; any other status is a failure carrying that object, and a transport failure — bad URL, DNS, connection refused, timeout — one carrying `{status: 0, body: <message>, headers: {}}`. A script that expects a status reads it in the block (below). A retry is a loop with `otherwise continue`. |
| External functions | Unchanged: a call succeeds with whatever the host returned — a Result included, as a value — and fails with what the host threw (Genuine Results). Stage 2 unwraps the call's own Result, as for a built-in. |

A command whose exit code is part of the answer:

```
count = SHELL("grep -c ERROR app.log") otherwise err do
    if err.value.exitCode != 1 then FAIL(err.message) end   // 1 means no match
    count = "0"
end
```

A status the script expects:

```
page = HTTP_GET(url) otherwise err do
    if err.value.status != 404 then FAIL(err.message) end   // only "not found" is expected
    page = ""
end
```

Why a default instead of a check: between `FILE_EXISTS(p)` and `READ_FILE(p)` another process can
delete the file — log rotation does this routinely. A default argument decides when the file is
opened, and `READ_FILE` and `READ_JSON_FILE` read it in the same step. `FILE_LINES` reads as the
array is used, so its default covers a file missing at the call; a file deleted or replaced later
fails when the runtime reaches it, as today (v0.26.0). `FILE_EXISTS` stays, for branching on
intent ("skip the job if the marker file exists").

## Fit with the existing spec

Each section of LANGUAGE.md this draft touches, what it says, and how the draft fits. The last
column is the spec text that changes in v0.37.0 (stage 2 changes more, with its batch).

| Section | How the draft fits | Spec text that changes |
|---|---|---|
| Keywords; reserved words — `elseif` (v0.9.0), `limit` (v0.19.0), `import`/`as` (v0.23.0) | `on` and `otherwise` become reserved, the same class. `error` stays a name. | The keyword list; the v0.37.0 migration note |
| Semicolons — `;` is whitespace, and the grammar treats a line break the same | One exception: a `return` value starts on the `return` line. A script that breaks it is refused, never read a new way. | Semicolons; Return Values |
| Break and Continue — "the innermost enclosing loop only" | Kept, and made precise: the loop around the statement in the same function body. A monitor body counts as one; a `multi` setup does not. Without such a loop: refused at load. | Break and Continue |
| Return Values; Monitor Clause — "each iteration runs like a function invocation" | `otherwise return` is a `return`. In a monitor body it ends the iteration, as in a function; in a `multi` setup it leaves the block, whose collected threads do not start. | Monitor Clause; Multi Blocks, Semantics |
| Functions — the spec does not say when a function becomes callable; it is when its definition runs, and a later definition replaces an earlier one | The handler starts after the root's remaining definitions have run, in order (rule 2). No hoisting anywhere else. | Functions: when a function becomes callable |
| Variable Scope; Lookup Order; Scope in Loops | The handler is top-level code. The failure name `err` follows the loop-variable rule. `_ERROR` is a global, so it comes before a host property of that name. | — |
| Value Semantics — an assignment deep-copies its right side | A fallback value and `err` are copies. Rule 5 relies on an order the spec does not state: the right side, fallback included, is computed before the target's place. | Value Semantics: that order |
| Imports and Modules — imports first; import mode runs no top-level statement; source ids | The handler comes right after the imports and is skipped in import mode. `_ERROR.source` is the source id the spec already uses for modules. | — |
| Multi Blocks; Thread Purity — workers end before the block does; a worker's error is its entry | A setup error runs the handler; a worker's error stays its entry and a monitor iteration's stays `[MONITOR ERROR]`. The handler starts after every thread has ended (rule 9). Purity is unchanged; it covers globals, not files, requests or commands. | Monitor Clause: the interval is checked before the first worker starts, as `limit` is |
| Monitor-only thread values (v0.21.0) | `otherwise` reads a captured entry as `UNWRAP` does: a finished entry gives its thread-information object. | — |
| Genuine Results — the brand is "observed only by `IS_RESULT` and `UNWRAP`" | `otherwise` is a third observer and reads a Result as `UNWRAP` does: `ok` gives the value; not `ok`, `"running"` included, gives the fallback where `UNWRAP` raises; a non-Result is an error in both. | That sentence |
| External Functions — the runtime creates the Result of an external call; what the host throws becomes an error Result | `otherwise` takes an external call as it takes a built-in's. The host-side examples return `Result.ok(...)`, which contradicts that text and the reference runtime: the runtime wraps whatever the host returns, a Result included. | The examples: return the value itself |
| Truthiness; Logical operators — strict booleans, `or` boolean-only | `otherwise` decides by Result, never by falsiness; `or` is unchanged. | — |
| No implicit null; Return Values — absence is `{}` | `otherwise return` without a value, and a handler without `return`, give `{}`. | — |
| Runtime Errors — `Runtime Error at line L:C`; Formatted output — built-in errors come "without a line number" | Every runtime error has a position, a built-in's included (its call), and positions count from 1, the column too. The spec never fixed the column's base; the runtimes print it from 0. | Runtime Errors: the format and the new messages; Formatted output |
| Host Environment Restrictions — hideable keywords; a refusal comes before the first statement, at the first violation in document order | `on` and `otherwise` are not hideable: what a handler or a fallback runs stays under the host's restrictions. The new load-time checks refuse a script the same way. | A note on the new checks |
| Debug Statement — main thread and workers; monitor bodies excluded | The handler is main-thread code. | — |
| Resource Limits | The loop limit applies to the handler; exhaustion may skip it. | — |
| Results and Error Escalation — `FAIL`, `UNWRAP`, `OK`, `ERR`, `IS_RESULT`; Name Resolution — `UNWRAP` is dispatched by the interpreter | Unchanged in stage 1; `UNWRAP` stays a built-in function ([`UNWRAP` stays](#unwrap-stays)). In stage 2 `UNWRAP` reads a call's Result itself, so its second argument, `message`, still shows in the error (`UNWRAP(JSON_PARSE(text), "config parse")` reports `config parse: <parse error>`). A value that is not a Result stays an error, as in `otherwise`. | One section presents `UNWRAP`, `otherwise` and `on error` together, and the catalog rows of `FAIL` and `UNWRAP` point to it. Stage 2: `UNWRAP` reads the Result of a call that is its whole first argument |

## Compatibility

- **Stage 1.**
  - `on` and `otherwise` become reserved, the same class as `elseif` (v0.9.0), `limit` (v0.19.0)
    and `import`/`as` (v0.23.0): a variable of either name, or `config.on`, stops parsing;
    `config."on"` still reads the key. `on` alone could have been contextual (`ID ID do`, both
    names checked at load), but `otherwise` cannot, and one kind of keyword is simpler to explain
    and to highlight.
  - Refused at load: a `return` whose value starts on a later line, and a `break` or `continue`
    without a loop in the same function body — a function that continues its caller's loop
    included, which the spec never allowed.
  - Error text: a built-in's error gains the call position, and the column counts from 1.
  - A `return` in a monitor body ends that iteration, and the watchdog keeps going.
  - A `multi` whose monitor interval is out of range starts no worker.
  - An external call always gives a Result, as the spec says — also on the JavaScript runtime,
    which passes a host's plain value through today.
  - The reference CLI exits 1 after a runtime error, as the JavaScript CLI does; its output is
    unchanged.
  - Apart from these, a script without a handler and without `otherwise` behaves exactly as
    before.
- **Stage 2** is breaking. A line changes in one of three ways, and a syntax-tree scan finds each
  before the switch — deployed scripts (TeeBox) first:
  - **A built-in's Result kept to check later** — `res = READ_FILE(p)`, then `res.ok` or
    `UNWRAP(res, "config")` — fails loudly on the first run, since `res` is now the text:
    `UNWRAP() requires a Result`, as today for any value that is not a Result. A failed read stops
    the run at the read, without the `message`. So does a field read inside an argument:
    `JSON_PARSE(READ_FILE(p).value) otherwise {}` stops at `.value`. Two cases change without
    failing on the first run: `IS_RESULT(res)` becomes `false`, and after `r = HOST()`, for a host
    that returns `ERR("data")` as its value, `UNWRAP(r)` now meets that `ERR` and stops, where it
    returned it before. The scan finds `.ok`, `.value`, `.status`, `UNWRAP` and `IS_RESULT` applied
    to a built-in's or a host function's result, through a variable or a nested call.
  - **A function that returns a built-in's Result** for its caller to check. In
    `function load(p) do return READ_FILE(p) end` the read is unwrapped inside `load`, so
    `load(p) otherwise ""` stops when the file is missing, and is refused when it is not, since
    `load` now gives text (rule 1); so is `UNWRAP(load(p))`. The scan finds such functions and
    their callers. The function becomes:

    ```
    function load(p) do
        text = READ_FILE(p) otherwise err do return ERR(err.value) end
        return OK(text)
    end
    ```

  - **A call the batch changes**, even where `otherwise` reads it: a failed `SHELL`
    (`err.value` becomes `{exitCode, output}`, and `err.message` its text), `DELETE_FILE` of a
    missing file (the fallback no longer runs), and a mistake in a call (it stops instead of
    taking the fallback). The scan lists every `otherwise` on these.

  Every other line with `otherwise` keeps working, a call as its value fallback included. So does
  every `UNWRAP` whose first argument is a direct call to a built-in that reports its outcome with
  a Result, or to a host function.
- The frozen Java 7/8 runtime implements neither.

## Plan

1. **Stage 1 — v0.37.0:** the spec text — the handler, `otherwise`, the two rules and the changes
   under [Fit](#fit-with-the-existing-spec) — then both runtimes and the hosts
   ([Implementation](#implementation)). The spec presents `UNWRAP`, `otherwise` and `on error` in
   one section, as the three tools of [`UNWRAP` stays](#unwrap-stays). Small, nearly
   non-breaking, and useful now; it gets real use before the large switch.
2. **Built-in audit**, under the rule *a mistake in the call stops the run; a failure of the input
   or the environment can be taken by `otherwise`*. Record, for each built-in in both runtimes —
   TeeBox's host built-ins (`STREAM_FILE`, `THUMBNAIL`) included: success, nothing found, failure
   of the input or the environment, mistake in the call. Include the cases the spec leaves open:
   `DELETE_FILE` of a missing file (an error Result today), `MKDIR` where a file exists. The
   Result-consistency check (43 calls in both runtimes) is the starting list. The audit also
   fixes stage 2's set: the built-ins that report their outcome with a Result.
3. **Stage 2 — before v1.0, one breaking batch** with the rule and the table above.

## Implementation

Where the spec decides, both runtimes follow it; where it is silent and they differ, JavaScript
follows Java, the reference runtime.

### Runtimes, stage 1

| Item | Java (reference) | JavaScript |
|---|---|---|
| The handler, `otherwise`, `_ERROR`, the load-time checks, the remaining root definitions before the handler | New | New |
| `break`/`continue` in a function without a loop of its own | Act on the caller's loop — refuse at load | The same — refuse at load |
| `break`/`continue` outside any loop | Ends the run silently — refuse at load | Stops with `Runtime error: continue` — refuse at load |
| `return` in a monitor body | Silently skips the remaining mid-run iterations — end only the iteration | Reports `[MONITOR ERROR] return` and skips them — end only the iteration |
| `continue` in a monitor body without a loop | Silently skips them too — refuse at load | Reports `[MONITOR ERROR] continue` — refuse at load |
| The monitor interval | Checked after the workers start: with `monitor 9007199254740992` both workers run to the end — check first | Checked first |
| An external call's Result | Wraps whatever the host returns | Passes the host's value through — wrap as Java does; the stubs registered as externals throw instead of returning error Results, and so do the playground's host functions |
| A built-in's error | Gains the call position | Gains the call position |
| The column in the error report | From 1 | From 1 |
| The CLI after a runtime error | Exits 0, the error on stdout — exit 1 | Exits 1 |

Fixtures: 20 of the 157 expect a built-in's error without a position, and 42 a column counted
from 0.

### Hosts, stage 1

- **The CLIs**, both: exit 0 when the run completes, and 1 when it fails or is refused — a
  runtime error, the handler or not, a syntax error, a refusal at load, a file that cannot be
  read. Bad command-line usage stays 2, as in both today. The Java CLI exits 0 after a runtime
  error today, so that its output carries the error for comparison; the error line stays where it
  is, only the code changes. No fixture runner looks at the code: Java runs the fixtures in
  process, and JavaScript's `run_tests.sh` compares the output only.
- **Engine API.** A failed run hands over what [What the host gets](#what-the-host-gets) lists.
  Proposal: the failure each engine reports today — the exception in Java, the error in JS —
  carries the error's fields and the handler's outcome, so a host that ignores them keeps
  working. Java first; JS follows.
- **TeeBox:**
  - A failed run keeps the handler's value. `markFailed` clears `resultData` today. Proposal: the
    run's `resultData`, beside `status: FAILED` and `errorMessage`.
  - The engine decides failed or stopped. Today a stop that arrives before the engine returns
    turns any failure into `CANCELLED`.
  - The run's processes are killed after a failed run that had a stop asked for, too. Today that
    happens only after `CANCELLED`.
- **Host tests:** a stop asked for before the error — one that kills a `SHELL` command included —
  stops the run without the handler; a stop asked for while the handler runs ends it, the run
  stays failed with the original error, and its processes are killed; the handler's value
  reaches the host with the failure.
- **Editors and documents:** the new keywords in the VS Code and Vim highlighting;
  `LANGUAGE.ko.md` and the spec's copies.

## Open questions

- **Time limit.** A stop does not run the handler, so a job stopped by its time limit is not
  reported through it, and a stop during the handler cuts it short. Give the handler a short grace
  period?
- **Unwatched workers.** In a `multi` without a result variable, a failed worker prints
  `[THREAD ERROR]` and the run ends as a success, without the handler. Should the run fail?
- **The message of a failure.** A failure's message has no function name today
  (`No such file or directory: /in/a.txt`). Prefix it when stage 2 stops the run
  (`READ_FILE() No such file or directory: …`)? And the message of an HTTP or SHELL failure is
  its whole object as text, the body included — what `UNWRAP` reports today. Give them a short
  message of their own (`HTTP_GET() got status 404`; for SHELL the output, which would keep
  `err.message` as it is in stage 1)?
- **Passing a failure to the caller.** In stage 2 a function whose caller should recover writes
  `text = READ_FILE(p) otherwise err do return ERR(err.value) end`, then `return OK(text)`. A
  shorter form?
- **Wording** of the new messages in this draft.
- **`otherwise return` followed by a statement.** Rule 1 of the two rules refuses a bare `return`
  whose next line could be its value, so `v = r otherwise return` followed by `PRINT(v)` is refused
  at load, and a script writes `otherwise return {}` or ends the block. That is safe and loud, but
  the bare form is usable only before `end`, `else`, `elseif` or a statement that cannot start an
  expression. The alternative — a line break ends a bare `return`, so the next line is a new
  statement — would make that line the success path silently instead.
- **The name `on error`.**

## Fixtures

Stage 1, the handler:

- A runtime error runs the handler; each `_ERROR` field; `column` counts from 1.
- The handler's `return` value reaches the host; the run still fails; a `return` without a value
  gives `{}`.
- No handler run on a normal end, on a top-level `otherwise return`, or for a script refused at
  load.
- The original error is reported before the handler's output.
- An error in the handler: both errors reported, no second entry.
- A worker's error does not run the handler; a setup-phase error does.
- The handler calls a function defined below the line that failed; with two definitions of a
  name, the later one.
- `_ERROR.source` for an error inside an imported function; the handler is skipped in import mode.
- Load-time errors for a misplaced handler, a second handler, and `on` without `error`.
- `FAIL` and an escalating `UNWRAP` run the handler with their messages.
- A monitor interval out of range stops the run before any worker starts; the handler runs.

Stage 1, `otherwise`:

- Each form: a value, `continue`, `break`, `return` with and without a value, a block with and
  without a name — after an assignment, a `return` and an expression statement.
- The fallback is not computed on success: a side effect in it does not happen.
- A normal `false`, `0`, `""`, `[]` or `null` is not a failure.
- A left side that is not a Result is an error, on success too; a plain `{"ok": false, ...}`
  object is not a Result.
- An error while the left side is computed is not caught.
- A block that reaches `end` is an error after a variable it did not set, after a member or an
  element target, and after a `return`; one that sets the variable, at the top level through `::`
  too; a block after an expression statement that just ends.
- A value fallback with an element target: the target's place is computed after the fallback.
- A Result as the fallback is unwrapped; a chain of two fallbacks.
- `err.message` and `err.value` for a string failure and a structured one
  (`ERR({"status": 404})`).
- A failed worker entry with `otherwise`; in a monitor, a `"running"` entry gives the fallback and
  a finished one its thread-information object.
- `otherwise return` in a monitor body ends the iteration. In a `multi` setup, `otherwise continue`
  on the loop around the block leaves it, and its collected threads do not start; on a loop inside
  the setup, the setup goes on and its threads start.
- `x = ERR("a") otherwise OK(OK(1))` sets `x` to `OK(1)`.
- An error inside an `otherwise` block runs the handler.

Stage 1, the two rules and the error report:

- A `return` value on the next line is refused at load.
- `continue` and `break` in a function without a loop of its own, in a monitor body without one,
  and outside any loop, are refused at load.
- A `return` in a monitor body ends the iteration, and the watchdog keeps going.
- A built-in's error carries the call position; columns count from 1.

Stage 2 brings its own fixtures with the batch.

## Decisions

- **2026-10-27** — Stage 1 implemented (spec v0.37.0). Choices the draft left to the implementation:
  - Messages: a left side that is not a Result is named by what it is —
    `'otherwise' needs a Result, but TO_NUMBER() gave a number`, `… but plain is an object`, and
    `… but the value on its left is an array` for any other expression; `null` reads `gave null`.
  - Positions: rule 1's error at the left side; a block's errors at its `end`; the same-line
    refusal at the `return`; `break`/`continue` at the keyword; a misplaced or second handler at
    `on`, a misnamed one at its name. A built-in's error is at its call; an error raised without a
    position gets its statement's.
  - The monitor interval is checked at `multi` entry with `limit`, before the setup.
  - Columns count from 1 in syntax errors, the hosts' validation lists and the Java REPL's
    debugger positions too, so one tool never shows two bases.
  - Hosts: the error carries the handler's outcome (Java `TeeError.handler()`, the façade's
    `ProperTeeError.handlerEnd()`/`handlerResult()`/`handlerError()`, JavaScript
    `error.handler`); a failure reporter reports the error before the handler. `--result-only`
    prints the handler's value after a failure. TeeBox keeps it as the failed run's `resultData`,
    lets the engine settle failed or stopped, kills a failed run's processes when a stop was asked
    for, and its editor check reports the load-time rules.
  - The JavaScript runtime now gives the spec's `Variable 'x' is not defined` for an undefined
    `::x`. Found, not changed: its `TO_STRING` of an object or array is compact JSON
    (`{"code":404}`) where the reference gives the display form (`{ "code": 404 }`), so
    `err.message` for an object failure differs between the runtimes; the fixtures avoid it.
- **2026-10-27** — A review of the stage 1 implementation, fixed in the runtimes (the spec text
  already decided each case):
  - A stop while the handler runs in the JavaScript runtime — at a breakpoint or in a `SLEEP` —
    kept the run failed with the original error: it replaced the error with the stop, or ended the
    run as completed. A stop now never ends a run as completed.
  - A host function's exception — a TeeBox builtin such as `STREAM_FILE`, a playground function —
    is a runtime error at its call, so the handler runs; in the handler it is a handler error.
  - A handler's or a snippet's `return` value that cannot be read (a FILE_LINES array whose file
    changed) is an error in the handler, or the snippet's error; it replaced the original error.
  - Rule 5's "the block sets the variable itself" compares the variable, not a scope depth: a
    function in another module setting its own `x` no longer counts for the caller's `x`
    (JavaScript), and a `::x` assignment in a `multi` setup in the block counts for the top level's
    `x` (both). The spec text says so now.
  - The Java debugger's `eval` keeps the last expression's `otherwise`.
  - The façade's `ProperTeeError` says how the handler ended and with which error, as
    [What the host gets](#what-the-host-gets) lists.
- **2026-10-30** — A second review of the implementation, fixed in the runtimes:
  - A stop asked for before an error settles the run as stopped, also when the stop made that
    same call fail (a host function that stops the run and then throws). Before the handler, the
    run is stopped and the handler does not run (JavaScript; Java did so). In the handler, it ends
    the handler as stopped, not with a handler error (both).
  - A host function's exception in a `multi` worker has its call's position, as at any call
    (JavaScript).

- **2026-10-26** — Reviewed: this draft, and a proposal to add `otherwise` while keeping Results.
- **2026-10-27** — Accepted as recommended:
  - `otherwise` comes with `on error`, in two stages, not alone.
  - It ends a statement; it is never inside an expression.
  - Its block leaves or sets the target.
  - The failure it names is `{message, value}`.
  - From the review of this draft: functions callable from the handler before their definition
    runs, `_ERROR.column` from 1, no handler on cancellation, HTTP transport failures stop, the
    two grammar fixes, and the companion changes as one rule.
- **2026-10-27** — A second review, applied:
  - Stage 2 unwraps only the outcome of the built-ins that report one with a Result, and of host
    functions; `OK`, `ERR` and `UNWRAP` are left alone.
  - The stage-2 compatibility promise is narrowed to what holds; the scan also covers nested
    reads and functions that return a built-in's Result.
  - HTTP keeps today's rule — a status other than 2xx is a failure — instead of treating every
    response as data.
  - A block after a `return`, or after a member or element target, must leave; only a variable
    can be set.
  - No worker runs when the handler starts; a `multi` checks its monitor interval before its
    workers start.
  - Failed or stopped is settled when the error happens; a later stop ends only the handler.
- **2026-10-27** — The draft states the language and is checked against the spec section by
  section; the runtime and host work is listed apart. Where the spec is silent and the runtimes
  differ, JavaScript follows Java. With it:
  - A `multi` setup is no boundary for `break` and `continue`, as it is none for `return`: in both
    runtimes they act on their loop, inside the setup or around the block. This replaces "a setup
    counts as a function".
  - A `return` in a monitor body ends the iteration, as in a function.
  - The error report counts columns from 1, as `_ERROR` does, so one error has one position.
  - An external call's Result wraps whatever the host returns, as the reference runtime does; the
    spec's host examples are corrected, and the JavaScript runtime follows.
  - The engine API's form, TeeBox's field for the handler's value and the CLI's exit code are
    implementation choices.
- **2026-10-27** — Decided by the user:
  - Error positions count from 1, the column included, in the error report as in `_ERROR`.
  - Both CLIs exit 0 when a run completes and 1 when it fails — the usual convention. The Java
    CLI changes; the one exception, so far, to JavaScript following Java.
- **2026-10-27** — A third review, applied:
  - Stage 2 also leaves the whole first argument of `UNWRAP` alone, as it does the left side of
    `otherwise`: `UNWRAP`'s second argument, `message`, still shows in the error, and `UNWRAP`
    takes off only the call's own Result. The review suggested listing both cases as migration
    exceptions; the exception keeps the spec's own `UNWRAP(JSON_PARSE(text), "config parse")`
    meaning what it says. A Result kept in a variable still changes, and goes on the scan list.
  - `otherwise` takes off one level, as `UNWRAP` does: a Result inside a fallback's value stays
    one.
  - The threads of a `multi` setup do not start only when control leaves the setup itself; a
    `break` or `continue` on a loop inside it leaves the setup running.
- **2026-10-27** — Decided by the user, after reviewing `UNWRAP`:
  - `UNWRAP` stays. `otherwise` cannot stand inside an expression, built-ins do not stop by
    themselves in stage 1, script Results and `multi` entries stay Results after stage 2, and
    `otherwise` is defined by it.
  - It stays a built-in function, not a keyword; the reasons are under Alternatives rejected.
  - Stage 2 keeps the v0.10.0 check: a value that is not a Result is an error in `UNWRAP`, as in
    `otherwise`. This replaces a pass-through that kept `UNWRAP(res)` working after
    `res = READ_FILE(p)`; such a line now fails loudly on its first run and is on the scan list.
  - The spec presents `UNWRAP`, `otherwise` and `on error` together, as three tools.
- **2026-10-27** — A fourth review, applied:
  - A call that is the whole value fallback of `otherwise` keeps its Result in stage 2, as the
    left side does, so rule 4 takes off one level as in stage 1: `x = ERR("a") otherwise HOST()`
    gives the host's `OK(1)` or `ERR("data")`, not `1` or a stop. The review proposed listing this
    as a migration case and scanning fallbacks; the exception removes the case, as it did for
    `UNWRAP`. The stage 2 rule now reads: a call keeps its Result where `otherwise` or `UNWRAP`
    reads it.
  - The compatibility promise for `UNWRAP` names direct calls to the built-ins and host functions
    stage 2 changes; `UNWRAP(load(p))` is one of the changed cases.
