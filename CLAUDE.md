# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProperTee is a lightweight, dynamically-typed scripting language (v2.4) for property-based data processing, configuration management, and embedding in host applications. It is developed by FLATIDE LC under the BSD 3-Clause License.

This repository contains the **language specification, grammar, documentation, and examples**. The actual interpreter implementations live in separate repositories:
- **JavaScript**: [propertee-js](https://github.com/flatide/propertee-js) — Node.js, ES modules, generator-based concurrency
- **Java**: [propertee-java](https://github.com/flatide/propertee-java) — Java 7+, Stepper pattern

Both implementations share the ANTLR4 grammar (`grammar/ProperTee.g4`) and pass the same 41-test suite.

## Repository Structure

- `grammar/ProperTee.g4` — ANTLR4 grammar definition (the canonical source of truth for syntax)
- `grammar/LANGUAGE_SPEC.md` — Complete formal language specification (~3000 lines)
- `grammar/THREADING_IMPLEMENTATION.md` — Concurrency implementation constraints for porters
- `grammar.md` / `bnf.md` — EBNF and BNF grammar references (Korean)
- `guide.md` — Comprehensive language tutorial (Korean)
- `examples/*.pt` — Example scripts (basics, property access, control flow, real-world patterns)
- `docs/` — Interactive web playground and pre-compiled JS bundle
- `UPDATE_SUMMARY.md` — Version changelog and migration guide (Korean)

## Running Locally

```bash
# Serve the interactive playground
cd docs && python3 -m http.server 8000
# Open http://localhost:8000
```

There is no build step in this repo — grammar compilation and bundling happens in the implementation repos. The `docs/dist/propertee-bundle.js` (289KB) is a pre-compiled artifact from propertee-js.

## Language Design Essentials

When editing grammar, specs, or examples, keep these design rules consistent:

- **1-based indexing**: First array element is `.1`, not `.0`. `arr.0` is a runtime error.
- **No null type**: Empty object `{}` is the universal "no value" sentinel.
- **No type coercion**: `"5" + 3` is a runtime error. `5 == "5"` is false.
- **No truthy/falsy**: `if 1` is a runtime error — only booleans allowed in conditions.
- **Division by zero**: Runtime error, not Infinity.
- **Block structure**: Pascal/Lua-style `if-then-end`, `loop-do-end`, `function-do-end`.
- **Unified loop**: Single `loop` keyword for condition, value, key-value, and infinite iteration.
- **Cooperative threading**: `thread`/`multi`/`shared`/`uses` keywords; simulated concurrency via async, not OS threads.
- **Alphabetical lock ordering**: Deadlock prevention in `uses` clauses.

## Keywords (complete set)

```
if then else end
loop in do infinite
break continue
function thread return
shared uses multi monitor
not and or
true false
```

Note: `null` was removed in v1.2. The `parallel` keyword was renamed to `multi` in v2.3.

## Bilingual Documentation

Source code comments and several docs (`guide.md`, `grammar.md`, `bnf.md`, `UPDATE_SUMMARY.md`) are in Korean. The grammar file (`ProperTee.g4`) has Korean inline comments. `LANGUAGE_SPEC.md` and `README.md` are in English.
