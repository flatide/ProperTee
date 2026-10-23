" Vim syntax file
" Language: ProperTee
" License: BSD-3-Clause

if exists('b:current_syntax')
  finish
endif

" --- Keywords ---
syn keyword propertKeyword      if then elseif else end
syn keyword propertKeyword      loop in do infinite
syn keyword propertKeyword      break continue return debug
syn keyword propertKeyword      function thread
syn keyword propertKeyword      multi monitor limit

" --- Logical operators ---
syn keyword propertLogical      not and or

" --- Booleans / null ---
syn keyword propertBoolean      true false
syn keyword propertNull         null

" --- Built-in functions ---
syn keyword propertBuiltin      PRINT PRINTF FORMAT TEXT SLEEP
syn keyword propertBuiltin      SUM MAX MIN ABS FLOOR CEIL ROUND TRUNC RANDOM LEN
syn keyword propertBuiltin      TO_NUMBER TO_STRING
syn keyword propertBuiltin      PUSH POP CONCAT SLICE CHARS SORT SORT_DESC SORT_BY SORT_BY_DESC REVERSE
syn keyword propertBuiltin      SPLIT WORDS JOIN SUBSTRING
syn keyword propertBuiltin      MATCHES REGEX_FIND REGEX_FIND_ALL
syn keyword propertBuiltin      UPPERCASE LOWERCASE TRIM HAS_KEY KEYS
syn keyword propertBuiltin      ALIGN_LEFT ALIGN_RIGHT ALIGN_CENTER
syn keyword propertBuiltin      MILTIME DATE TIME
syn keyword propertBuiltin      SHELL SHELL_CTX
syn keyword propertBuiltin      FILE_LINES LIST_DIR LIST_DIR_NAMES
syn keyword propertBuiltin      FAIL UNWRAP OK ERR IS_RESULT

" --- Numbers ---
syn match propertFloat  "\<\d\+\.\d\+\>"
syn match propertNumber "\<\d\+\>"

" --- Operators ---
syn match propertCompare  "==\|!=\|<=\|>=\|<\|>"
syn match propertAssign   "=\ze[^=]"
syn match propertArith    "+\|-\|\*\|/\|%"

" --- Property access ---
syn match propertDynAccess "\.\$"

" --- Punctuation ---
syn match propertPunct "[,:.{}\[\]()]"

" --- Suspicious: `not x == y` parses as `(not x) == y` (LANGUAGE.md §Precedence) ---
" not + non-parenthesized simple operand + ==/!= ; `not (x == y)` is not matched.
syn match propertNotCompare "\<not\s\+(\@!\%(\%(::\)\=\h\w*\%(\.\$\=\h\w*\|\.\d\+\)*\|\d\+\%(\.\d\+\)\=\)\s*[!=]="

" --- Strings (defined after operators so they take priority) ---
syn region propertString start=+"+ skip=+\\"+ end=+"+ contains=propertEscape
syn match  propertEscape +\\.+ contained

" --- Comments (defined last for highest priority) ---
syn keyword propertTodo TODO FIXME XXX NOTE contained
syn region  propertLineComment  start="//" end="$" contains=propertTodo
syn region  propertBlockComment start="/\*" end="\*/" contains=propertTodo

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
hi def link propertNull         Constant
hi def link propertNotCompare   WarningMsg
hi def link propertBuiltin      Function
hi def link propertCompare      Operator
hi def link propertAssign       Operator
hi def link propertArith        Operator
hi def link propertDynAccess    Special
hi def link propertPunct        Delimiter

let b:current_syntax = 'propertee'
