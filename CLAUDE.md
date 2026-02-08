# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProperTee is a lightweight, dynamically-typed scripting language (v2.4) for property-based data processing, configuration management, and embedding in host applications. Developed by FLATIDE LC under BSD 3-Clause License.

This repository contains the **language specification, grammar, documentation, and editor extensions**. The interpreter implementations live in separate repositories:
- **JavaScript**: [propertee-js](https://github.com/flatide/propertee-js) — Node.js, ES modules, generator-based concurrency
- **Java**: [propertee-java](https://github.com/flatide/propertee-java) — Java 7+, Stepper pattern

All three repos share the same ANTLR4 grammar (`grammar/ProperTee.g4`) — keep them in sync. Both implementations pass the same 55-test suite.

## Repository Structure

- `grammar/ProperTee.g4` — ANTLR4 grammar (canonical source of truth for syntax)
- `LANGUAGE.md` — Full language specification (English)
- `LANGUAGE.ko.md` — Full language specification (Korean)
- `editors/vscode/` — VS Code syntax highlighting extension + formatter
- `editors/vim/` — Vim/Neovim syntax highlighting plugin

No build step in this repo — grammar compilation and bundling happens in the implementation repos.

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
Note: `.pt` conflicts with Vim's built-in Zope Page Templates mapping — the ftdetect script uses `setlocal filetype=` (not `setfiletype`) to force override.

## Language Design Essentials

When editing grammar, specs, or examples, keep these design rules consistent:

- **1-based indexing**: First array element is `.1`, not `.0`. `arr.0` is a runtime error.
- **No null type**: Empty object `{}` is the universal "no value" sentinel.
- **String concatenation coercion**: `+` with at least one string operand auto-coerces the other via `TO_STRING()`. `5 == "5"` is still false (no comparison coercion).
- **Inverted truthiness**: Only `true` is truthy. Everything else (`false`, `0`, `""`, `[]`, `{}`) is falsy. Non-booleans are allowed in conditions but are always falsy.
- **Division by zero**: Runtime error, not Infinity.
- **Block structure**: Pascal/Lua-style `if-then-end`, `loop-do-end`, `function-do-end`.
- **Unified loop**: Single `loop` keyword for condition, value, key-value, and infinite iteration.
- **No separate thread functions**: The `thread` keyword is a spawn statement used only inside `multi` blocks to run regular functions concurrently. There is no `thread ... do ... end` definition syntax.
- **Result collection**: `multi result do ... end` collects all thread results into a single object. Named threads (`key: func()`) use the key; unnamed threads (`thread : func()`) use `"#1"`, `"#2"`, etc. by position among unnamed threads (named threads don't consume positional slots). Keys can be dynamic: `$var:` or `$(expr):`. Each entry is `{status, ok, value}` — `"running"` while executing, `"done"` on success, `"error"` on failure. Monitor can read `result.key.status` live.
- **Thread purity**: Functions running inside `multi` can read globals via `::` (from a snapshot) but cannot write them. No locks — purity enforced by design.
- **No `shared` keyword**: Removed. No `uses` clause. No locks exposed to users.
- **`::` global prefix**: Inside functions, plain `x` is local. Use `::x` to access globals.

## Keywords (complete set — from grammar)

```
if then else end
loop in do infinite
break continue
function thread return
multi monitor
not and or
true false
```

`null` was removed in v1.2. `parallel` was renamed to `multi` in v2.3. `shared` was removed.

## Grammar-to-Keyword Mapping (non-obvious)

In the grammar, some internal rule names don't match the keyword:
- `K_SPAWN` → `'thread'` (the `thread` keyword is used for spawning, not defining)
- `spawnStmt` → the `thread key: funcCall()` syntax inside multi blocks (key optional; supports `ID`, `STRING`, `$var`, `$(expr)`)
- `parallelStmt` → the `multi resultVar do ... end` block (resultVar optional)

## Syntax Highlighting Consistency

Both editor extensions highlight the same token categories — keep them in sync when adding keywords or built-ins:
- Keywords, logical operators (`not and or`), booleans (`true false`)
- Built-in functions: `PRINT SLEEP SUM MAX MIN ABS FLOOR CEIL ROUND LEN TO_NUMBER TO_STRING PUSH POP CONCAT SLICE CHARS SPLIT JOIN SUBSTRING UPPERCASE LOWERCASE TRIM HAS_KEY`
- Comments (`//` line, `/* */` block), strings (double-quoted), numbers, operators
- Vim syntax note: comments and strings must be defined last in the syntax file (Vim's last-defined-wins priority rule)
