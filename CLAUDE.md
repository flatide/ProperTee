# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProperTee is a lightweight, dynamically-typed scripting language (v0.8.0) for property-based data processing, configuration management, and embedding in host applications. Developed by FLATIDE LC under BSD 3-Clause License.

This repository contains the **language specification, grammar, documentation, and editor extensions**. The interpreter implementations live in separate repositories:
- **Java (reference implementation)**: [propertee2-java](https://github.com/flatide/propertee2-java) — Java 25, virtual-thread cooperative runtime; consumed by [TeeBox](https://github.com/flatide/TeeBox)
- **JavaScript**: [propertee-js](https://github.com/flatide/propertee-js) — Node.js, ES modules, generator-based concurrency; powers the online playground
- **Java (legacy)**: [propertee-java](https://github.com/flatide/propertee-java) — Java 7+, Stepper pattern; **frozen at v1.0.0** (security/bugfixes only, do not add features)

All repos share the same ANTLR4 grammar (`grammar/ProperTee.g4`) — keep this repo, propertee2-java, and propertee-js in sync (propertee-java is frozen). Conformance is fixture-based (`.tee`/`.expected` pairs, byte-exact): the reference Java runtime passes 94 fixtures (spec v0.8.0), the JavaScript runtime 90 (host-dependent SHELL/file-I/O fixtures are Java-only); the frozen v1 runtime stays at its 84 (spec v0.6.0 semantics).

## Repository Structure

- `grammar/ProperTee.g4` — ANTLR4 grammar (canonical source of truth for syntax)
- `grammar/LANGUAGE.md` — Full language specification (English, copy of root)
- `LANGUAGE.md` — Full language specification (English)
- `LANGUAGE.ko.md` — Full language specification (Korean, manually maintained translation)
- `editors/vscode/` — VS Code syntax highlighting extension + formatter
- `editors/vim/` — Vim/Neovim syntax highlighting plugin
- `docs/design-notes.md` — index of open language-design questions (tracked as GitHub issues; includes breaking-change batching guidance)

No build step in this repo — grammar compilation and bundling happens in the implementation repos.

**LANGUAGE.md sync workflow:** **this repo's `LANGUAGE.md` is the canonical language spec** (currently v0.8.0); `grammar/LANGUAGE.md` and propertee-js's `LANGUAGE.md` are byte-identical copies of it. propertee2-java's `docs/LANGUAGE.md` deliberately adds runtime-specific annotations (cooperative-suspension notes, `Coop.blocking` external-function behavior) on top of the spec, so sync spec-level changes both ways by content, not by byte-copy. propertee-java's copy is frozen with that runtime. Update `LANGUAGE.ko.md` manually when the English spec changes.

## Editor Extensions

### VS Code
```bash
cd editors/vscode
npm install -g @vscode/vsce
vsce package
# Then install the .vsix via VS Code Extensions sidebar
```

### Vim
```bash
cp -r editors/vim/ftdetect editors/vim/ftplugin editors/vim/syntax ~/.vim/pack/plugins/start/propertee/
```
Note: `.tee` is the ProperTee script file extension — the ftdetect script uses `setlocal filetype=` to set the filetype.

## Language Design Essentials

When editing grammar, specs, or examples, keep these design rules consistent:

- **1-based indexing**: First array element is `.1`, not `.0`. `arr.0` is a runtime error.
- **No implicit null** (spec v0.8.0): the empty object `{}` remains the language's "no value" sentinel (missing args, bare `return`). `null` exists as a seventh value type purely for lossless JSON round-trips — the language never produces it; it enters only via the `null` literal or data (`JSON_PARSE`, host values). Equality and `TYPE_OF` work on it; conditions, logic, arithmetic, and member access on `null` are runtime errors (no null propagation).
- **String concatenation coercion**: `+` with at least one string operand auto-coerces the other via `TO_STRING()`. `5 == "5"` is still false (no comparison coercion).
- **Strict boolean conditions** (spec v0.7.0): `if`/`loop` conditions require a boolean — any other type is a runtime error (`Condition requires a boolean value`). There is no truthiness coercion.
- **Short-circuit `and`/`or`** (spec v0.7.0): left to right, the right operand is not evaluated (side effects included) when the left side decides; operands are type-checked only when evaluated.
- **Division by zero**: Runtime error, not Infinity.
- **Block structure**: Pascal/Lua-style `if-then-end`, `loop-do-end`, `function-do-end`.
- **Unified loop**: Single `loop` keyword for condition, value, key-value, and infinite iteration.
- **No separate thread functions**: The `thread` keyword is a spawn statement used only inside `multi` blocks to run regular functions concurrently. There is no `thread ... do ... end` definition syntax.
- **Result collection**: `multi result do ... end` collects all thread results into a single object. Spawn keys use the same `access` syntax as property access. Named threads (`key: func()`) use the key; unnamed threads (`thread : func()`) use `"#1"`, `"#2"`, etc. Keys can be ID, STRING, INTEGER, `$var`, or `$(expr)` — all auto-coerced to string via `TO_STRING()`. Each entry is `{status, ok, value}` — `"running"` / `"done"` / `"error"`.
- **Thread purity**: Functions running inside `multi` can read globals via `::` (from a snapshot) but cannot write them. No locks — purity enforced by design.
- **Async external functions**: Host applications can register async functions via `registerExternalAsync()` for blocking I/O without freezing other threads. The current thread blocks while other threads continue. Uses statement re-execution with cached results.
- **No `shared` keyword**: Removed. No `uses` clause. No locks exposed to users.
- **`::` global prefix**: Inside functions and multi setup, plain `x` is local. Use `::x` to access globals. Multi setup runs in isolated scope like a function.

## Keywords (complete set — from grammar)

```
if then else end
loop in do infinite
break continue debug
function thread return
multi monitor
not and or
true false null
```

`null` was removed in v0.1.0 and reintroduced in spec v0.8.0 as a pure data value (see Design Essentials — no implicit null). `parallel` was renamed to `multi` in v0.2.0. `shared` was removed.

## Grammar-to-Keyword Mapping (non-obvious)

In the grammar, some internal rule names don't match the keyword:
- `K_SPAWN` → `'thread'` (the `thread` keyword is used for spawning, not defining)
- `spawnStmt` → the `thread key: funcCall()` syntax inside multi blocks (key uses `access` rule — same as property access: ID, STRING, INTEGER, `$var`, `$(expr)`)
- `parallelStmt` → the `multi resultVar do ... end` block (resultVar optional)

## Syntax Highlighting Consistency

Both editor extensions highlight the same token categories — keep them in sync when adding keywords or built-ins:
- Keywords, logical operators (`not and or`), booleans (`true false`), `null`
- Built-in functions: `PRINT SLEEP SUM MAX MIN ABS FLOOR CEIL ROUND RANDOM LEN TO_NUMBER TO_STRING PUSH POP CONCAT SLICE CHARS SORT SORT_DESC SORT_BY SORT_BY_DESC REVERSE SPLIT JOIN SUBSTRING UPPERCASE LOWERCASE TRIM HAS_KEY KEYS MILTIME DATE TIME`
- Comments (`//` line, `/* */` block), strings (double-quoted), numbers, operators
- Vim syntax note: comments and strings must be defined last in the syntax file (Vim's last-defined-wins priority rule)
