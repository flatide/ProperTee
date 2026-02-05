" Vim syntax file
" Language: ProperTee
" License: BSD-3-Clause

if exists('b:current_syntax')
  finish
endif

" --- Comments ---
syn keyword propertTodo TODO FIXME XXX NOTE contained
syn match   propertLineComment  "\/\/.*$" contains=propertTodo
syn region  propertBlockComment start="/\*" end="\*/" contains=propertTodo

" --- Strings ---
syn region propertString start=+"+ skip=+\\"+ end=+"+ contains=propertEscape
syn match  propertEscape +\\.+ contained

" --- Numbers ---
syn match propertFloat  "\<\d\+\.\d\+\>"
syn match propertNumber "\<\d\+\>"

" --- Keywords ---
syn keyword propertKeyword      if then else end
syn keyword propertKeyword      loop in do infinite
syn keyword propertKeyword      break continue return
syn keyword propertKeyword      function thread
syn keyword propertKeyword      shared multi monitor

" --- Logical operators ---
syn keyword propertLogical      not and or

" --- Booleans ---
syn keyword propertBoolean      true false

" --- Built-in functions ---
syn keyword propertBuiltin      PRINT SLEEP
syn keyword propertBuiltin      SUM MAX MIN ABS FLOOR CEIL ROUND LEN
syn keyword propertBuiltin      TO_NUMBER TO_STRING
syn keyword propertBuiltin      PUSH POP CONCAT SLICE CHARS
syn keyword propertBuiltin      SPLIT JOIN SUBSTRING
syn keyword propertBuiltin      UPPERCASE LOWERCASE TRIM

" --- Operators ---
syn match propertArrow    "->"
syn match propertCompare  "==\|!=\|<=\|>=\|<\|>"
syn match propertAssign   "=\ze[^=]"
syn match propertArith    "+\|-\|\*\|/\|%"

" --- Property access ---
syn match propertDynAccess "\.\$"

" --- Punctuation ---
syn match propertPunct "[,:.{}\[\]()]"

" --- Highlight links ---
hi def link propertLineComment  Comment
hi def link propertBlockComment Comment
hi def link propertTodo         Todo
hi def link propertString       String
hi def link propertEscape       SpecialChar
hi def link propertFloat        Float
hi def link propertNumber       Number
hi def link propertKeyword      Keyword
hi def link propertLogical      Keyword
hi def link propertBoolean      Boolean
hi def link propertBuiltin      Function
hi def link propertArrow        Operator
hi def link propertCompare      Operator
hi def link propertAssign       Operator
hi def link propertArith        Operator
hi def link propertDynAccess    Special
hi def link propertPunct        Delimiter

let b:current_syntax = 'propertee'
