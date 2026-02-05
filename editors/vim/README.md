# ProperTee Vim Plugin

Syntax highlighting for the [ProperTee](https://github.com/flatide/ProperTee) scripting language.

## Features

- Syntax highlighting for keywords, built-in functions, strings, numbers, comments, and operators
- Automatic filetype detection for `.pt` files
- Comment formatting (`//` line comments, `/* */` block comments)
- Basic indentation settings

## Prerequisites

Ensure your `~/.vimrc` includes:

```vim
filetype plugin on
syntax on
```

## Installation

### Manual

Copy the plugin directories into your Vim runtime path:

```bash
cp -r ftdetect ftplugin syntax ~/.vim/
```

### Vim 8+ Native Packages

```bash
mkdir -p ~/.vim/pack/plugins/start/propertee
cp -r ftdetect ftplugin syntax ~/.vim/pack/plugins/start/propertee/
```

### Neovim

```bash
mkdir -p ~/.config/nvim/pack/plugins/start/propertee
cp -r ftdetect ftplugin syntax ~/.config/nvim/pack/plugins/start/propertee/
```

### vim-plug

Add to your `.vimrc`:

```vim
Plug 'flatide/ProperTee', { 'rtp': 'editors/vim' }
```

Then run `:PlugInstall`.

### Vundle

Add to your `.vimrc`:

```vim
Plugin 'flatide/ProperTee', { 'rtp': 'editors/vim' }
```

Then run `:PluginInstall`.

## Verification

Open any `.pt` file in Vim and check:

```vim
:set ft?
" Should print: filetype=propertee
```

## License

BSD-3-Clause
