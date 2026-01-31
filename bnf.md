# ProperTee BNF 문법

표준 BNF(Backus-Naur Form) 형식의 ProperTee 문법입니다.

## 표기법

```
<rule>     ::= definition
|              alternative
"text"         terminal string
```

---

## 문법 정의

```bnf
<program>           ::= <statement-list>

<statement-list>    ::= <statement> <statement-list>
                      | ε

<statement>         ::= <assignment>
                      | <if-statement>
                      | <loop-statement>
                      | <flow-control>
                      | <expression>

<assignment>        ::= <lvalue> "=" <expression>

<lvalue>            ::= <identifier>
                      | <lvalue> "." <access>

<if-statement>      ::= "if" <expression> "then" <statement-list> "end"
                      | "if" <expression> "then" <statement-list> "else" <statement-list> "end"

<loop-statement>    ::= "loop" <expression> "do" <statement-list> "end"
                      | "loop" <expression> "infinite" "do" <statement-list> "end"
                      | "loop" <identifier> "in" <expression> "do" <statement-list> "end"
                      | "loop" <identifier> "," <identifier> "in" <expression> "do" <statement-list> "end"

<flow-control>      ::= "break"
                      | "continue"

<expression>        ::= <or-expression>

<or-expression>     ::= <and-expression>
                      | <or-expression> "or" <and-expression>

<and-expression>    ::= <comparison-expression>
                      | <and-expression> "and" <comparison-expression>

<comparison-expression> ::= <additive-expression>
                          | <additive-expression> <comparison-op> <additive-expression>

<comparison-op>     ::= ">"
                      | "<"
                      | "=="
                      | ">="
                      | "<="
                      | "!="

<additive-expression>   ::= <multiplicative-expression>
                          | <additive-expression> "+" <multiplicative-expression>
                          | <additive-expression> "-" <multiplicative-expression>

<multiplicative-expression> ::= <unary-expression>
                              | <multiplicative-expression> "*" <unary-expression>
                              | <multiplicative-expression> "/" <unary-expression>
                              | <multiplicative-expression> "%" <unary-expression>

<unary-expression>  ::= <postfix-expression>
                      | "-" <unary-expression>
                      | "not" <unary-expression>

<postfix-expression> ::= <atom>
                       | <postfix-expression> "." <access>

<access>            ::= <identifier>
                      | <number>
                      | <string>
                      | "$" <identifier>
                      | "$" "(" <expression> ")"

<atom>              ::= <function-call>
                      | <identifier>
                      | <number>
                      | <string>
                      | <boolean>
                      | "null"
                      | <object-literal>
                      | <array-literal>
                      | "(" <expression> ")"

<function-call>     ::= <identifier> "(" ")"
                      | <identifier> "(" <argument-list> ")"

<argument-list>     ::= <expression>
                      | <argument-list> "," <expression>

<object-literal>    ::= "{" "}"
                      | "{" <object-entries> "}"

<object-entries>    ::= <object-entry>
                      | <object-entries> "," <object-entry>

<object-entry>      ::= <object-key> ":" <expression>

<object-key>        ::= <identifier>
                      | <string>
                      | <number>

<array-literal>     ::= "[" "]"
                      | "[" <element-list> "]"

<element-list>      ::= <expression>
                      | <element-list> "," <expression>

<boolean>           ::= "true"
                      | "false"

<identifier>        ::= <letter> <identifier-rest>

<identifier-rest>   ::= <letter> <identifier-rest>
                      | <digit> <identifier-rest>
                      | ε

<letter>            ::= "a" | "b" | ... | "z"
                      | "A" | "B" | ... | "Z"
                      | "_"

<number>            ::= <integer>
                      | <integer> "." <digits>

<integer>           ::= <digit>
                      | <integer> <digit>

<digits>            ::= <digit>
                      | <digits> <digit>

<digit>             ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"

<string>            ::= '"' <string-contents> '"'

<string-contents>   ::= <string-char> <string-contents>
                      | ε

<string-char>       ::= <escape-sequence>
                      | <any character except '"' and '\'>

<escape-sequence>   ::= '\' <any character>
```

---

## 키워드

```
if       then     else      end
loop     in       do        infinite
break    continue
not      and      or
true     false    null
```

---

## 주석

ProperTee는 두 가지 형태의 주석을 지원합니다:

```
// 한 줄 주석 - 라인 끝까지

/* 블럭 주석 - 여러 줄 가능 */
```

**주의**: 블럭 주석은 중첩되지 않습니다.

---

## 연산자 우선순위

| 우선순위 | 연산자 | 결합성 |
|---------|-------|--------|
| 1 | `or` | 좌결합 |
| 2 | `and` | 좌결합 |
| 3 | `==` `!=` `<` `>` `<=` `>=` | 비결합 |
| 4 | `+` `-` | 좌결합 |
| 5 | `*` `/` `%` | 좌결합 |
| 6 | `-` (단항) `not` | 우결합 |
| 7 | `.` (멤버 접근) | 좌결합 |
