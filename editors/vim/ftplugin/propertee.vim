" Vim filetype plugin
" Language: ProperTee
" License: BSD-3-Clause

if exists('b:did_ftplugin')
  finish
endif
let b:did_ftplugin = 1

" Comment settings
setlocal commentstring=//\ %s
setlocal comments=s1:/*,mb:*,ex:*/,://

" Indentation
setlocal expandtab
setlocal shiftwidth=4
setlocal softtabstop=4
setlocal tabstop=4

let b:undo_ftplugin = 'setlocal commentstring< comments< expandtab< shiftwidth< softtabstop< tabstop<'
