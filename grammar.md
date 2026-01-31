# ProperTee 문법 명세

이 문서는 ProperTee 언어의 공식 문법 명세입니다.

## 표기법

이 문서는 Extended Backus-Naur Form (EBNF)을 사용합니다.

| 표기 | 의미 |
|------|------|
| `=` | 정의 |
| `;` | 규칙 종료 |
| `\|` | 대안 (or) |
| `[ ]` | 선택적 (0 또는 1회) |
| `{ }` | 반복 (0회 이상) |
| `( )` | 그룹화 |
| `" "` | 터미널 문자열 |
| `'...'` | 터미널 문자 |

---

## 1. 프로그램 구조

```ebnf
program     = { statement } EOF ;

statement   = assignment
            | if_statement
            | loop_statement
            | function_def
            | flow_control
            | expression ;
```

---

## 2. 할당문

```ebnf
assignment  = lvalue "=" expression ;

lvalue      = ID
            | lvalue "." access ;
```

할당 대상(lvalue)은 변수 또는 프로퍼티 체인입니다.

**예시:**
```propertee
x = 10
obj.name = "test"
data.items.0 = "first"
config.$key = value
```

---

## 3. 제어 구조

### 3.1 조건문

```ebnf
if_statement = "if" expression "then" block
               [ "else" block ]
               "end" ;

block        = { statement } ;
```

**예시:**
```propertee
if x > 10 then
    result = "big"
else
    result = "small"
end
```

### 3.2 반복문

```ebnf
loop_statement = "loop" ( loop_condition | loop_iteration ) "do" block "end" ;

loop_condition  = expression [ "infinite" ] ;
loop_iteration  = ID [ "," ID ] "in" expression ;
```

`loop` 키워드는 조건 반복과 컬렉션 순회를 모두 지원합니다:
- **조건 반복**: `loop condition do ... end` (while-style)
- **값 반복**: `loop value in collection do ... end` (for-each style)
- **키-값 반복**: `loop key, value in collection do ... end`
- **무한 루프**: `loop condition infinite do ... end`

**예시:**
```propertee
// 조건 반복
i = 0
loop i < 10 do
    print(i)
    i = i + 1
end

// 값 반복
loop item in items do
    process(item)
end

// 키-값 반복
loop key, value in object do
    print(key, value)
end

// 무한 루프
loop true infinite do
    if shouldExit() then
        break
    end
end
```

### 3.3 흐름 제어

```ebnf
flow_control = "break" | "continue" | "return" [ expression ] ;
```

- `break`: 현재 루프를 즉시 종료
- `continue`: 다음 반복으로 건너뛰기
- `return`: 함수 또는 스크립트 종료 (선택적으로 값 반환)

### 3.4 함수 정의

```ebnf
function_def   = "function" ID "(" [ parameter_list ] ")" "do" block "end" ;
parameter_list = ID { "," ID } ;
```

**예시:**
```propertee
// 함수 정의
function add(a, b) do
    return a + b
end

// 함수 호출
result = add(10, 20)

// 재귀 함수
function factorial(n) do
    if n <= 1 then
        return 1
    else
        return n * factorial(n - 1)
    end
end
```

**주의**: 함수는 호스트 언어(JavaScript)의 스택 제한을 받습니다. 깊은 재귀는 스택 오버플로우를 발생시킬 수 있습니다.

---

## 4. 표현식

```ebnf
expression      = or_expr ;

or_expr         = and_expr { "or" and_expr } ;

and_expr        = comparison_expr { "and" comparison_expr } ;

comparison_expr = additive_expr [ comparison_op additive_expr ] ;

additive_expr   = multiplicative_expr { ( "+" | "-" ) multiplicative_expr } ;

multiplicative_expr = unary_expr { ( "*" | "/" | "%" ) unary_expr } ;

unary_expr      = [ "-" | "not" ] postfix_expr ;

postfix_expr    = atom { "." access } ;

comparison_op   = ">" | "<" | "==" | ">=" | "<=" | "!=" ;
```

### 연산자 우선순위 (낮음 → 높음)

| 우선순위 | 연산자 | 결합성 |
|---------|-------|-------|
| 1 (최저) | `or` | 좌 → 우 |
| 2 | `and` | 좌 → 우 |
| 3 | `>` `<` `==` `>=` `<=` `!=` | - |
| 4 | `+` `-` | 좌 → 우 |
| 5 | `*` `/` `%` | 좌 → 우 |
| 6 | `-` (단항) `not` | 우 → 좌 |
| 7 (최고) | `.` (프로퍼티 접근) | 좌 → 우 |

---

## 5. 프로퍼티 접근

ProperTee의 핵심 기능인 동적 프로퍼티 접근입니다.

```ebnf
access  = ID                        (* 정적 접근: .name *)
        | NUMBER                    (* 배열 인덱스: .0, .1 *)
        | STRING                    (* 문자열 키: ."key-name" *)
        | "$" ID                    (* 변수 평가: .$key *)
        | "$" "(" expression ")"    (* 표현식 평가: .$(expr) *) ;
```

### 5.1 정적 접근

```propertee
obj.name        // 고정 키 "name"으로 접근
```

### 5.2 배열 인덱스 접근

```propertee
arr.0           // 첫 번째 요소
arr.1           // 두 번째 요소
```

### 5.3 문자열 키 접근

특수 문자가 포함된 키에 접근할 때 사용합니다.

```propertee
obj."api-key"           // 하이픈 포함 키
obj."Content-Type"      // HTTP 헤더 스타일 키
```

### 5.4 동적 접근 (핵심 기능)

런타임에 키를 결정합니다.

```propertee
// 변수를 키로 사용
key = "name"
obj.$key                // obj.name과 동일

// 표현식을 키로 사용
index = 2
arr.$(index + 1)        // arr.3과 동일

prefix = "user_"
data.$(prefix + id)     // data.user_123 (id가 123일 때)
```

---

## 6. 원자 표현식 (Atoms)

```ebnf
atom    = function_call
        | ID
        | NUMBER
        | STRING
        | boolean
        | "null"
        | object_literal
        | array_literal
        | "(" expression ")" ;

boolean = "true" | "false" ;
```

---

## 7. 함수 호출

```ebnf
function_call = ID "(" [ expression { "," expression } ] ")" ;
```

**예시:**
```propertee
print("Hello")
max(a, b)
process(data, {format: "json"})
```

---

## 8. 리터럴

### 8.1 객체 리터럴

```ebnf
object_literal = "{" [ object_entry { "," object_entry } ] "}" ;

object_entry   = object_key ":" expression ;

object_key     = ID | STRING | NUMBER ;
```

**예시:**
```propertee
empty = {}

person = {
    name: "Alice",
    age: 30,
    "e-mail": "alice@example.com"
}

matrix = {
    0: [1, 0, 0],
    1: [0, 1, 0],
    2: [0, 0, 1]
}
```

### 8.2 배열 리터럴

```ebnf
array_literal = "[" [ expression { "," expression } ] "]" ;
```

**예시:**
```propertee
empty = []
numbers = [1, 2, 3, 4, 5]
mixed = [1, "two", true, {x: 10}]
nested = [[1, 2], [3, 4], [5, 6]]
```

---

## 9. 렉서 규칙 (Lexical Grammar)

```ebnf
ID      = letter { letter | digit } ;
NUMBER  = digit { digit } [ "." digit { digit } ] ;
STRING  = '"' { string_char } '"' ;

letter      = 'a'..'z' | 'A'..'Z' | '_' ;
digit       = '0'..'9' ;
string_char = escape_seq | <any character except '"' and '\'> ;
escape_seq  = '\' <any character> ;
```

### 9.1 키워드

다음 키워드는 식별자로 사용할 수 없습니다:

```
if       then     else      end
loop     in       do        infinite
break    continue
function return
not      and      or
true     false    null
```

### 9.2 주석

ProperTee는 두 가지 형태의 주석을 지원합니다.

#### 한 줄 주석

```propertee
// 한 줄 주석입니다
x = 10  // 라인 끝 주석

// 여러 줄에 걸친 설명을
// 이렇게 작성할 수 있습니다
```

#### 블럭 주석

```propertee
/* 블럭 주석입니다 */
x = 10

/*
여러 줄에 걸친
블럭 주석도 가능합니다
*/
y = 20

z = /* 인라인 주석 */ 30
```

**주의**: 블럭 주석은 중첩되지 않습니다. 첫 번째 `*/`가 주석을 닫습니다.

### 9.3 공백

공백, 탭, 개행, 세미콜론은 토큰 구분자로 처리되며 무시됩니다.

---

## 10. 전체 EBNF 문법

```ebnf
(* ProperTee Complete Grammar *)

program         = { statement } EOF ;

statement       = assignment
                | if_statement
                | loop_statement
                | function_def
                | flow_control
                | expression ;

assignment      = lvalue "=" expression ;
lvalue          = ID | lvalue "." access ;

if_statement    = "if" expression "then" block [ "else" block ] "end" ;
loop_statement  = "loop" ( loop_condition | loop_iteration ) "do" block "end" ;
loop_condition  = expression [ "infinite" ] ;
loop_iteration  = ID [ "," ID ] "in" expression ;
function_def    = "function" ID "(" [ parameter_list ] ")" "do" block "end" ;
parameter_list  = ID { "," ID } ;
flow_control    = "break" | "continue" | "return" [ expression ] ;

block           = { statement } ;

expression      = or_expr ;
or_expr         = and_expr { "or" and_expr } ;
and_expr        = comparison_expr { "and" comparison_expr } ;
comparison_expr = additive_expr [ comparison_op additive_expr ] ;
additive_expr   = multiplicative_expr { ( "+" | "-" ) multiplicative_expr } ;
multiplicative_expr = unary_expr { ( "*" | "/" | "%" ) unary_expr } ;
unary_expr      = [ "-" | "not" ] postfix_expr ;
postfix_expr    = atom { "." access } ;

comparison_op   = ">" | "<" | "==" | ">=" | "<=" | "!=" ;

access          = ID
                | NUMBER
                | STRING
                | "$" ID
                | "$" "(" expression ")" ;

atom            = function_call
                | ID
                | NUMBER
                | STRING
                | "true" | "false"
                | object_literal
                | array_literal
                | "(" expression ")" ;

function_call   = ID "(" [ expression { "," expression } ] ")" ;

object_literal  = "{" [ object_entry { "," object_entry } ] "}" ;
object_entry    = object_key ":" expression ;
object_key      = ID | STRING | NUMBER ;

array_literal   = "[" [ expression { "," expression } ] "]" ;
```
