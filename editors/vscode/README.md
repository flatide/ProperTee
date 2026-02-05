# ProperTee for VS Code

Syntax highlighting for the [ProperTee](https://github.com/flatide/ProperTee) scripting language (`.pt` files).

## Features

- Syntax highlighting for keywords, strings, numbers, comments, operators, and built-in functions
- Line (`//`) and block (`/* */`) comment toggling
- Auto-closing brackets and quotes
- Code folding for `if`/`loop`/`function`/`thread`/`multi` blocks

## Installation

### As .vsix package

```bash
npm install -g @vscode/vsce
cd editors/vscode
vsce package
```

Then in VS Code: **Extensions** sidebar > `...` menu > **Install from VSIX...** and select the generated `.vsix` file.

### Symlink (for development)

```bash
ln -s "$(pwd)/editors/vscode" ~/.vscode/extensions/propertee
```

Then restart VS Code.

## Verification

Open any `.pt` file (see `examples/` in the repo root) and confirm that keywords, strings, comments, numbers, and built-in functions are highlighted with distinct colors.
