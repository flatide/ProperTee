# ProperTee for VS Code

Syntax highlighting, formatting, and run/debug for the [ProperTee](https://github.com/flatide/ProperTee) scripting language (`.tee` files).

## Features

- Syntax highlighting for keywords, strings, numbers, comments, operators, and built-in functions
- Line (`//`) and block (`/* */`) comment toggling, auto-closing brackets and quotes
- Code folding for `if`/`loop`/`function`/`thread`/`multi` blocks
- Document formatting (indentation + keyword spacing)
- A `not x == y` precedence-pitfall diagnostic
- **Run**: ▶ button in the editor title (or "ProperTee: Run Script" from the command palette / context menu) — runs the current file in the integrated terminal
- **Debug (F5)** — a real debugger since 0.6.0 (requires propertee2 **0.24.0+**, whose `--dap` mode speaks the Debug Adapter Protocol directly): **breakpoints** in `.tee` files, the `debug` statement as a scripted breakpoint, **step over/into/out**, the call stack, Locals/Globals variables, and evaluation in the paused scope from the Debug Console or on hover. Works with zero configuration on the active `.tee` file, or via a `launch.json` with `"type": "propertee"` — where you can also pass host properties:

```jsonc
{
    "type": "propertee",
    "request": "launch",
    "name": "Run with props",
    "program": "${workspaceFolder}/script.tee",
    "props": { "width": 100 }        // -p JSON → ::width / _PROPS in the script
}
```

> Notes: the run pauses only between statements (single cooperative thread — the paused world
> is frozen, workers and monitor included); a breakpoint on a line with no statement never
> fires; "Run Without Debugging" runs without any stops.

## Runtime setup

Run/debug invoke the [propertee2](https://github.com/flatide/propertee2-java) CLI. By default the
extension calls `propertee2` from PATH; point it elsewhere in the settings:

- `propertee.runtime.command` — the executable (default `propertee2`)
- `propertee.runtime.args` — arguments placed before the script path

For the fat jar (requires JDK 25):

```jsonc
"propertee.runtime.command": "java",
"propertee.runtime.args": ["-jar", "/path/to/propertee2-<version>.jar"]
```

Both can also be overridden per launch configuration (`command` / `commandArgs`).

## Installation

### As .vsix package

```bash
cd editors/vscode
npx --yes @vscode/vsce package
```

Then in VS Code: **Extensions** sidebar > `...` menu > **Install from VSIX...** and select the generated `.vsix` file (a prebuilt one is checked in alongside this README).

### Symlink (for development)

```bash
ln -s "$(pwd)/editors/vscode" ~/.vscode/extensions/propertee
```

Then restart VS Code.

## Verification

Open any `.tee` file and confirm highlighting; press F5 — the script's output appears in the
Debug Console (set the runtime settings above first if `propertee2` is not on PATH).
