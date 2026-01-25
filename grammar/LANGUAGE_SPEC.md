# ProperTee Language Specification

## Overview

ProperTee는 프로퍼티 기반 데이터 처리를 위한 경량 스크립팅 언어입니다. 이 문서는 언어의 공식 명세와 구현 제약사항을 정의합니다.

## Version

- **Grammar Version**: 2.0
- **Last Updated**: 2026-01-25

---

## 1. Lexical Elements

### 1.1 Keywords

다음 키워드는 예약어이며 식별자로 사용할 수 없습니다:

```
if      then    else    end
loop    in      do
break   continue
not     and     or
true    false   null
infinite
```

### 1.2 Identifiers

- **Pattern**: `[a-zA-Z_][a-zA-Z0-9_]*`
- **Examples**: `name`, `user_id`, `_temp`, `value123`
- **Restrictions**: 
  - 키워드를 식별자로 사용 불가
  - 숫자로 시작 불가
  - 특수문자 사용 불가 (언더스코어 제외)

### 1.3 Literals

#### Numbers
- **Pattern**: `[0-9]+ ('.' [0-9]+)?`
- **Types**: 정수와 부동소수점 통합
- **Examples**: `42`, `3.14`, `0.5`, `1000`
- **Constraints**:
  - 과학적 표기법(e notation) 미지원
  - 16진수, 8진수 표기법 미지원
  - 음수는 unary minus 연산자로 표현 (`-42`)

#### Strings
- **Pattern**: `'"' ( '\\' . | ~["\\] )* '"'`
- **Delimiter**: 쌍따옴표만 지원 (작은따옴표 미지원)
- **Escape Sequences**: `\"`, `\\`, `\n`, `\t` 등 표준 이스케이프 지원
- **Examples**: `"hello"`, `"line1\nline2"`, `"path\\to\\file"`

#### Booleans
- **Values**: `true`, `false`
- **Case Sensitive**: 대소문자 구분 (True, FALSE 등 불가)

#### Null
- **Value**: `null`
- **Semantics**: 값의 부재를 나타냄

### 1.4 Comments

- **Single Line**: `//` 부터 줄 끝까지
- **Multi-line**: 미지원
- **Example**: `// 이것은 주석입니다`

### 1.5 Whitespace

다음 문자는 토큰 구분자로 처리되며 무시됩니다:
- Space (` `)
- Tab (`\t`)
- Newline (`\r`, `\n`)
- Semicolon (`;`) - 문장 구분자로 선택적 사용 가능

---

## 2. Data Types

### 2.1 Type System

ProperTee는 **동적 타입 언어**입니다.

#### Primitive Types
1. **Number**: 정수 및 부동소수점 (내부적으로 IEEE 754 double)
2. **String**: UTF-8 문자열
3. **Boolean**: `true` 또는 `false`
4. **Null**: `null`

#### Composite Types
1. **Object**: 키-값 쌍의 컬렉션 (순서 보장 없음)
2. **Array**: 순서가 있는 값의 목록 (0-based 인덱싱)

### 2.2 Type Coercion

ProperTee는 **명시적 타입 변환**을 권장하며, 암묵적 변환은 최소화합니다.

#### Truthy/Falsy Values
- **Falsy**: `false`, `null`, `0`, `""` (빈 문자열)
- **Truthy**: 그 외 모든 값

---

## 3. Expressions

### 3.1 Operator Precedence

우선순위가 높은 순서대로:

| Precedence | Operator | Description | Associativity |
|------------|----------|-------------|---------------|
| 1 (highest) | `.` | Member access | Left |
| 2 | `-`, `not` | Unary minus, logical NOT | Right |
| 3 | `*`, `/`, `%` | Multiplication, division, modulo | Left |
| 4 | `+`, `-` | Addition, subtraction | Left |
| 5 | `>`, `<`, `>=`, `<=`, `==`, `!=` | Comparison | Left |
| 6 | `and` | Logical AND | Left |
| 7 (lowest) | `or` | Logical OR | Left |

### 3.2 Arithmetic Operators

- `+` : 덧셈
- `-` : 뺄셈 (binary) 또는 부호 반전 (unary)
- `*` : 곱셈
- `/` : 나눗셈 (부동소수점)
- `%` : 나머지 (모듈로)

**Constraints**:
- 0으로 나누기는 구현에 따라 오류 또는 특수 값 반환
- 정수 나눗셈 전용 연산자 없음 (모든 나눗셈은 부동소수점)

### 3.3 Comparison Operators

- `==` : 같음
- `!=` : 다름
- `<` : 작음
- `>` : 큼
- `<=` : 작거나 같음
- `>=` : 크거나 같음

**Semantics**:
- 타입이 다른 값의 비교는 구현 정의
- 권장: 타입이 다르면 `false` 반환

### 3.4 Logical Operators

- `and` : 논리 AND (short-circuit evaluation)
- `or` : 논리 OR (short-circuit evaluation)
- `not` : 논리 NOT

**Constraints**:
- `&&`, `||`, `!` 표기법 미지원 (키워드만 사용)
- Short-circuit 평가 필수 구현

### 3.5 Property Access

#### Static Access
```propertee
obj.property
obj.0          // 배열 인덱스
obj."key-name" // 특수문자 포함 키
```

#### Dynamic Access
```propertee
obj.$variableName           // 변수 값을 키로 사용
obj.$(expression)           // 표현식 평가 결과를 키로 사용
```

**Constraints**:
- 대괄호 표기법(`obj[0]`) 미지원
- 동적 접근에서 표현식은 문자열 또는 숫자로 평가되어야 함

---

## 4. Statements

### 4.1 Assignment

```propertee
identifier = expression
lvalue.property = expression
lvalue.$key = expression
```

**Constraints**:
- 좌변(lvalue)은 변수 또는 프로퍼티 접근만 가능
- 상수 또는 표현식은 좌변으로 사용 불가

### 4.2 Conditional Statement

```propertee
if condition then
    statements
end

if condition then
    statements
else
    statements
end
```

**Constraints**:
- `elseif` 또는 `elif` 미지원 (중첩 if 사용)
- condition은 truthy/falsy로 평가됨

### 4.3 Loop Statement

ProperTee는 `loop` 키워드로 통합된 반복문을 제공합니다.

#### Condition Loop (while-style)
```propertee
loop condition do
    statements
end
```

#### Value Loop (for-each style)
```propertee
loop value in collection do
    statements
end
```

#### Key-Value Loop
```propertee
loop key, value in collection do
    statements
end
```

#### Infinite Loop
```propertee
loop condition infinite do
    statements
end
```

**Constraints**:
- `while`, `for` 키워드 미지원 (모두 `loop`로 통합)
- C-style for loop 미지원
- `infinite` 키워드는 무한 루프 의도를 명시적으로 표현

### 4.4 Flow Control

```propertee
break      // 루프 탈출
continue   // 다음 반복으로
```

**Constraints**:
- 루프 외부에서 사용 시 구현 정의 (권장: 오류)
- 레이블 지원 없음

---

## 5. Functions

### 5.1 Function Call Syntax

```propertee
functionName()
functionName(arg1)
functionName(arg1, arg2, arg3)
```

**Constraints**:
- 함수 정의 구문 없음 (호출만 가능)
- 모든 함수는 외부에서 제공되어야 함
- 가변 인자 지원은 함수 구현에 따름

### 5.2 Standard Library

ProperTee 구현체는 다음 표준 함수를 **반드시** 제공해야 합니다:

#### I/O Functions
- `PRINT(...args)` : 값 출력

#### Math Functions
- `SUM(...numbers)` : 합계
- `MAX(...numbers)` : 최댓값
- `MIN(...numbers)` : 최솟값
- `ABS(n)` : 절댓값
- `FLOOR(n)` : 내림
- `CEIL(n)` : 올림
- `ROUND(n)` : 반올림

#### Utility Functions
- `LEN(arr|string)` : 길이 반환

#### Extended Functions (Optional)
- `REGEX(pattern, text, mode)` : 정규표현식 처리
- `RUN(command, ...args)` : 외부 명령 실행

**Constraints**:
- 함수 이름은 대소문자 구분
- 표준 함수는 오버라이드 가능
- 추가 함수는 호스트 환경에서 제공

---

## 6. Literals

### 6.1 Object Literal

```propertee
{}
{key: value}
{key1: value1, key2: value2}
{
    "special-key": value,
    123: "numeric key",
    nested: {inner: "value"}
}
```

**Constraints**:
- 키는 식별자, 문자열, 또는 숫자
- 중복 키의 동작은 구현 정의 (권장: 마지막 값 사용)
- Trailing comma 지원은 구현 정의

### 6.2 Array Literal

```propertee
[]
[1, 2, 3]
[1, "two", true, null, {key: "value"}]
[[1, 2], [3, 4]]
```

**Constraints**:
- 혼합 타입 허용
- Trailing comma 지원은 구현 정의
- Sparse array 미지원

---

## 7. Scoping and Variables

### 7.1 Variable Declaration

ProperTee는 **명시적 선언이 불필요**합니다. 첫 할당이 선언입니다.

```propertee
x = 10          // x 생성
y = x + 5       // x 읽기, y 생성
```

### 7.2 Scope Rules

- **Global Scope**: 스크립트 최상위 레벨
- **Local Scope**: 블록 스코프 미지원 (모든 변수는 전역)

**Constraints**:
- 블록 내에서 선언된 변수도 전역
- 함수 스코프 없음 (함수 정의 자체가 없음)
- Hoisting 없음 (선언 전 사용 불가)

### 7.3 Properties vs Variables

- **Properties**: 외부에서 주입된 초기 데이터 (read-only 권장)
- **Variables**: 스크립트 내에서 생성된 변수 (read-write)

**Lookup Order**:
1. Variables
2. Properties

---

## 8. Grammar Constraints

### 8.1 Statement Termination

- 세미콜론(`;`) 선택적
- 줄바꿈이 문장 구분자 역할
- 명시적 세미콜론 사용 권장하지 않음

### 8.2 Block Structure

```propertee
if condition then
    // block
end

loop value in items do
    // block
end
```

**Constraints**:
- 모든 블록은 명시적 종료자(`end`) 필요
- 중괄호 스타일 블록 미지원
- 빈 블록 허용

### 8.3 Expression Statements

표현식 자체를 문장으로 사용 가능:

```propertee
42                  // 표현식 문장 (값은 평가되지만 버려짐)
functionCall()      // 부수효과를 위한 호출
obj.property        // 프로퍼티 접근 (값 확인 등)
```

---

## 9. Implementation Requirements

### 9.1 Mandatory Features

구현체는 다음을 **반드시** 지원해야 합니다:

1. 모든 키워드와 연산자
2. 표준 라이브러리 핵심 함수 (PRINT, SUM, MAX, MIN, ABS, LEN)
3. 동적 프로퍼티 접근 (`.$(expr)`)
4. 객체 및 배열 리터럴
5. Null 값 처리

### 9.2 Optional Features

다음 기능은 선택적입니다:

1. REGEX, RUN 등 확장 함수
2. 성능 최적화 (JIT 컴파일 등)
3. 디버깅 정보
4. 에러 스택 트레이스

### 9.3 Error Handling

구현체는 다음 상황에서 명확한 에러를 발생시켜야 합니다:

- 구문 오류 (syntax error)
- 정의되지 않은 변수 참조
- 타입 오류 (예: 숫자가 아닌 값에 산술 연산)
- 0으로 나누기 (선택적)

### 9.4 Numeric Precision

- 권장: IEEE 754 double precision (64-bit)
- 최소 요구사항: 15자리 유효숫자

---

## 10. Security Considerations

### 10.1 Sandboxing

ProperTee는 임베딩을 위해 설계되었으므로:

1. 파일 시스템 접근 제한
2. 네트워크 접근 제한
3. RUN() 함수는 샌드박스 환경에서 제한

### 10.2 Resource Limits

구현체는 다음을 고려해야 합니다:

- 무한 루프 타임아웃
- 메모리 사용량 제한
- 재귀 깊이 제한 (표현식 평가)

---

## 11. Future Considerations

다음 기능은 향후 버전에서 고려될 수 있습니다:

- 함수 정의 구문
- 모듈 시스템
- 예외 처리 (try-catch)
- 패턴 매칭
- 구조 분해 할당
- spread/rest 연산자

---

## 12. Conformance

ProperTee 호환 구현체는:

1. 이 명세의 모든 필수 기능을 구현해야 함
2. 표준 라이브러리 핵심 함수를 제공해야 함
3. 명세에 정의된 동작과 일치해야 함
4. 확장 기능 추가 시 명세와 충돌하지 않아야 함

---

## Appendix A: Grammar Summary

```antlr
// 간소화된 문법 개요
root : statement* EOF ;

statement
    : assignment
    | ifStatement
    | iterationStmt
    | flowControl
    | expression
    ;

expression
    : atom
    | expression '.' access
    | unary_op expression
    | expression binary_op expression
    ;

// 자세한 문법은 ProperTee.g4 참조
```

---

## Appendix B: Standard Library Reference

| Function | Signature | Description |
|----------|-----------|-------------|
| PRINT | PRINT(...args) | 값 출력 |
| SUM | SUM(...numbers) | 숫자 합계 |
| MAX | MAX(...numbers) | 최댓값 |
| MIN | MIN(...numbers) | 최솟값 |
| ABS | ABS(n) | 절댓값 |
| FLOOR | FLOOR(n) | 내림 |
| CEIL | CEIL(n) | 올림 |
| ROUND | ROUND(n) | 반올림 |
| LEN | LEN(arr\|string) | 길이 |
| REGEX | REGEX(pattern, text, mode) | 정규식 (선택) |
| RUN | RUN(command, ...args) | 외부 실행 (선택) |

---

## Document History

- **v2.0 (2026-01-25)**: 
  - K_NULL atom 추가 명시
  - loop 통합 반복문 반영
  - 모듈로 연산자(%) 추가
  - infinite 키워드 추가
  - 구현 제약사항 문서화

- **v1.0 (Initial)**: 
  - 최초 명세 작성
