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

<statement>         ::= <shared-declaration>
                      | <assignment>
                      | <if-statement>
                      | <loop-statement>
                      | <function-definition>
                      | <thread-definition>
                      | <parallel-statement>
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

<function-definition> ::= "function" <identifier> "(" ")" "do" <statement-list> "end"
                        | "function" <identifier> "(" <parameter-list> ")" "do" <statement-list> "end"

<thread-definition> ::= "thread" <identifier> "(" ")" "do" <statement-list> "end"
                      | "thread" <identifier> "(" <parameter-list> ")" "do" <statement-list> "end"
                      | "thread" <identifier> "(" ")" <uses-clause> "do" <statement-list> "end"
                      | "thread" <identifier> "(" <parameter-list> ")" <uses-clause> "do" <statement-list> "end"

<parameter-list>    ::= <identifier>
                      | <parameter-list> "," <identifier>

<uses-clause>       ::= "uses" <identifier>
                      | <uses-clause> "," <identifier>

<shared-declaration> ::= "shared" <shared-var-list>

<shared-var-list>   ::= <shared-var>
                      | <shared-var-list> "," <shared-var>

<shared-var>        ::= <identifier>
                      | <identifier> "=" <expression>

<parallel-statement> ::= "multi" <parallel-task-list> "end"
                       | "multi" <parallel-task-list> <monitor-clause> "end"

<monitor-clause>    ::= "monitor" <number> <statement-list>

<parallel-task-list> ::= <parallel-task>
                       | <parallel-task-list> <parallel-task>

<parallel-task>     ::= <function-call> "->" <identifier>
                      | <function-call>

<flow-control>      ::= "break"
                      | "continue"
                      | "return"
                      | "return" <expression>

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
function thread   return
shared   uses     multi     monitor
not      and      or
true     false
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

---

## 함수 제약사항

### 가변 인자 (Variadic Arguments)

**현재 상태:**
- ❌ 사용자 정의 함수는 고정된 매개변수 개수만 지원
- ✅ 내장 함수(`PRINT`, `PUSH`, `CONCAT` 등)는 가변 인자 지원

**회피 방법:**
```
function sum(numbers) do
    total = 0
    loop n in numbers do
        total = total + n
    end
    return total
end

result = sum([1, 2, 3, 4, 5])  // 배열로 전달
```

**계획된 문법:**
```
function sum(...numbers) do
    // numbers는 배열로 전달됨
end
```

### 비동기 함수 (Async Functions)

**현재 상태:**
- ❌ 명시적 `async`/`await` 키워드 없음
- ✅ 비동기 내장 함수(`SLEEP`) 자동 처리
- ✅ 비동기 함수 호출 시 자동으로 await 됨

**현재 동작:**
```
function delayedTask() do
    SLEEP(1000)      // 자동으로 await 됨
    return "Done"
end

result = delayedTask()  // 완료될 때까지 대기
PRINT(result)           // "Done"
```

**계획된 문법:**
```
async function fetchData() do
    data = await FETCH(url)
    return data
end
```

**참고:** 자세한 내용은 [LANGUAGE_SPEC.md의 Section 18.1](grammar/LANGUAGE_SPEC.md#181-current-limitations)을 참조하세요.
