# ProperTee 언어 명세 v0.3.0

## 개요

ProperTee는 호스트 애플리케이션에 내장하기 위해 설계된 작고 안전한 스크립팅 언어입니다. 스레드 순수성 모델을 갖춘 협력적 멀티스레딩을 지원하며 — 스레드는 공유 상태를 변경할 수 없어 설계적으로 데이터 경합이 제거됩니다. 락, 공유 가변 상태, null이 없습니다.

## 값과 타입

ProperTee에는 6가지 타입이 있습니다:

| 타입 | 예시 | 비고 |
|---|---|---|
| 숫자 (정수) | `0`, `42`, `-7` | 정수 |
| 숫자 (소수) | `3.14`, `0.5` | 부동소수점 |
| 문자열 | `"hello"`, `"it's \"quoted\""` | 큰따옴표, `\"`로 내부 따옴표 표현 |
| 불리언 | `true`, `false` | |
| 배열 | `[1, 2, 3]`, `[]` | 순서 있음, 1-기반 인덱싱, 이종 타입 허용 |
| 객체 | `{"name": "Alice", "age": 30}`, `{}` | 순서 있는 키-값 쌍, 문자열 키 |

**null이 없습니다.** 빈 객체 `{}`가 언어 전체에서 "값 없음" 센티넬로 사용됩니다.

### 숫자 표현

- 정수와 소수 모두 "숫자"이지만 내부적으로 다르게 저장됩니다
- 정수 결과를 만드는 산술은 소수점 없이 표시: `10 / 2`는 `5`로 표시
- 나눗셈은 항상 내부적으로 소수를 생성: `7 / 2` → `3.5`
- 다른 연산의 정수 결과도 정수로 표시: `1.0 + 2.0` → `3`

### 참/거짓 판별 (Truthiness)

`if` 조건과 `loop` 조건에서 사용:

- **참(Truthy):** `true`만
- **거짓(Falsy):** 나머지 모두 — `false`, `0`, `""`, `[]`, `{}` 포함

참고: 조건문에서는 명시적 불리언 비교를 사용해야 합니다 (예: `if x == true then` 또는 `if x != false then`).

## 변수

변수는 할당으로 생성됩니다. 선언 키워드가 필요 없습니다.

```
x = 10
name = "Alice"
items = [1, 2, 3]
```

정의되지 않은 변수를 참조하면 런타임 에러가 발생합니다.

### 값 의미론

모든 할당은 우변의 **깊은 복사(deep copy)**를 생성합니다. 변수를 수정해도 객체와 배열을 포함하여 다른 변수에 영향을 주지 않습니다:

```
a = {"x": 1}
b = a           // b는 독립적인 복사본
b.x = 99
PRINT(a.x)      // 1 — a는 변경되지 않음
```

이는 값이 경계를 넘는 모든 곳에 적용됩니다: 변수 할당, 프로퍼티/요소 할당, 함수 인자, 루프 변수, 스레드 전역 스냅샷.

### `::` 전역 변수 접두사

함수 내부에서 일반 변수 이름은 **지역** 변수만 접근합니다. 함수 내에서 전역 변수를 읽거나 쓰려면 `::` 접두사를 사용합니다:

```
x = 10

function readGlobal() do
    return ::x          // 전역 x를 읽음
end

function writeGlobal() do
    ::x = 42            // 전역 x에 쓰기
end

function localOnly() do
    x = "local"         // 지역 x를 생성
    return x            // "local" 반환
end

readGlobal()             // 10
writeGlobal()
PRINT(x)                 // 42
localOnly()
PRINT(x)                 // 42 (localOnly에 의해 변경되지 않음)
```

**최상위 레벨** (함수 외부)에서는 `x`와 `::x`가 동일합니다 — 둘 다 전역을 접근합니다.

**규칙:**
- 함수 내부와 multi 설정 단계: 일반 `x`는 지역 전용. 전역 접근에는 `::x` 사용.
- 생성된 스레드 내부: `::x`는 전역 스냅샷에서 읽음. `::x = value`는 런타임 에러 (스레드 순수성).
- 내장 프로퍼티 (호스트가 `-p`로 주입): 함수 내부와 multi 설정 단계에서 `::` 필요.
- multi 결과 변수와 루프 변수: `::` 없이 접근 가능 (지역 변수임).
- 함수 이름과 내장 함수: 별도로 해석되어 `::` 불필요.

## 연산자

### 산술

| 연산자 | 연산 | 피연산자 타입 | 결과 |
|---|---|---|---|
| `+` | 덧셈 | 숫자 + 숫자 | 숫자 |
| `+` | 연결 | 문자열 + 임의 | 문자열 |
| `+` | 연결 | 임의 + 문자열 | 문자열 |
| `-` | 뺄셈 | 숫자 - 숫자 | 숫자 |
| `*` | 곱셈 | 숫자 * 숫자 | 숫자 |
| `/` | 나눗셈 | 숫자 / 숫자 | 숫자 (항상 소수) |
| `%` | 나머지 | 숫자 % 숫자 | 숫자 |
| `-` (단항) | 부정 | 숫자 | 숫자 |

`+`에서 한쪽 피연산자가 문자열이면, 다른 값은 내부적으로 `TO_STRING()`을 사용하여 문자열로 변환됩니다. 문자열이 아닌, 숫자가 아닌 조합 (예: 불리언 + 불리언)은 런타임 에러입니다.

0으로 나누기는 런타임 에러입니다.

### 비교

| 연산자 | 연산 | 피연산자 타입 |
|---|---|---|
| `==` | 같음 | any == any |
| `!=` | 같지 않음 | any != any |
| `>` | 초과 | 숫자 > 숫자 |
| `<` | 미만 | 숫자 < 숫자 |
| `>=` | 이상 | 숫자 >= 숫자 |
| `<=` | 이하 | 숫자 <= 숫자 |

동등 비교(`==`, `!=`)는 모든 타입에서 동작합니다. 값은 참조가 아닌 내용으로 비교됩니다 — `{} == {}`는 `true`입니다. 관계 연산자(`>`, `<`, `>=`, `<=`)는 양쪽 피연산자가 모두 숫자여야 합니다.

### 논리

| 연산자 | 연산 | 피연산자 타입 |
|---|---|---|
| `and` | 논리 AND | boolean and boolean |
| `or` | 논리 OR | boolean or boolean |
| `not` | 논리 NOT | not boolean |

모든 논리 연산자는 **불리언 피연산자를 요구**합니다. 숫자나 문자열을 `and`/`or`에 사용하면 런타임 에러입니다. 양쪽 모두 항상 평가됩니다 (단축 평가 없음).

### 우선순위 (낮은 것에서 높은 것 순)

1. `or`
2. `and`
3. `==` `!=` `>` `<` `>=` `<=`
4. `+` `-`
5. `*` `/` `%`
6. `-` (단항), `not`
7. `.` (멤버 접근)

괄호 `()`로 우선순위를 변경할 수 있습니다.

## 문자열

문자열은 큰따옴표로 감쌉니다. 지원되는 이스케이프 시퀀스:

| 이스케이프 | 문자 |
|---|---|
| `\"` | 큰따옴표 |
| `\\` | 백슬래시 |

```
msg = "She said \"hello\""
path = "C:\\Users\\file"
```

문자열은 **불변**입니다. 문자열 연산은 새 문자열을 반환합니다.

### 문자열 인덱싱

문자열은 `.` 연산자로 1-기반 문자 접근을 지원합니다:

```
s = "hello"
s.1     // "h"
s.5     // "o"
```

## 배열

배열은 순서가 있고, 1-기반이며, 혼합 타입을 포함할 수 있습니다.

```
nums = [10, 20, 30]
mixed = [1, "two", true, [4, 5]]
empty = []
```

### 배열 접근 (1-기반)

```
nums.1      // 10 (첫 번째 요소)
nums.3      // 30 (세 번째 요소)
```

범위를 벗어난 접근은 런타임 에러입니다.

### 배열 변경

직접 요소 할당으로 배열을 변경할 수 있습니다:

```
nums.1 = 99     // nums는 이제 [99, 20, 30]
```

내장 배열 함수 (`PUSH`, `POP`, `CONCAT`, `SLICE`)는 **새** 배열을 반환하며 원본을 변경하지 않습니다.

### 범위 배열

`[start..end]`는 `start`부터 `end`까지 (포함)의 배열을 생성합니다. 선택적 step으로 증가값을 제어합니다:

| 문법 | 결과 |
|---|---|
| `[1..5]` | `[1, 2, 3, 4, 5]` |
| `[1..6, 2]` | `[1, 3, 5]` |
| `[10..5, 1]` | `[10, 9, 8, 7, 6, 5]` |
| `[0.0..0.3, 0.1]` | `[0.0, 0.1, 0.2, 0.3]` |
| `[5..1]` | `[5, 4, 3, 2, 1]` (자동 step -1) |

- 양쪽 경계와 step은 모두 숫자여야 합니다
- Step은 양수여야 합니다 (기본값 `1`). 방향은 start와 end에서 추론
- Step이 `0` 또는 음수이면 런타임 에러
- 경계와 step은 표현식 가능: `[1..n]`, `[a..b, c]`

## 객체

객체는 순서가 있는 키-값 쌍으로, 문자열 키를 사용합니다.

```
person = {"name": "Alice", "age": 30}
config = {"special-key": true, 1: "one"}
empty = {}
```

객체 키는 따옴표 문자열 또는 정수(문자열 키로 저장)여야 합니다. 일반 식별자는 키로 사용할 수 없습니다.

### 객체 접근

| 패턴 | 문법 | 사용 사례 |
|---|---|---|
| 정적 | `obj.name` | 알려진 프로퍼티 이름 |
| 따옴표 키 | `obj."special-key"` | 특수 문자가 포함된 키 |
| 변수 키 | `obj.$varName` 또는 `obj.$::varName` | 변수에 저장된 키 이름 (전역은 `$::`) |
| 계산 키 | `obj.$(expression)` | 표현식으로 결정되는 키 |
| 숫자 키 | `obj.1` | 배열과 문자열은 1-기반 인덱스. 객체는 정수가 문자열 키 `"1"`이 됨 (읽기와 쓰기 모두). |

```
key = "name"
person.$key          // "Alice" (person.name과 동일)
person.$("na" + "me") // "Alice"
```

`$::var`는 전역 변수를 키로 접근합니다 (`$(::var)`와 동일).

존재하지 않는 프로퍼티에 접근하면 런타임 에러가 발생합니다.

### 객체 변경

프로퍼티는 할당으로 추가하거나 수정할 수 있습니다:

```
person.email = "alice@example.com"    // 새 프로퍼티 추가
person.age = 31                       // 기존 프로퍼티 수정
```

정수 키는 읽기와 쓰기 모두에서 문자열 키가 됩니다:

```
obj = {}
obj.1 = "first"      // obj는 {"1": "first"}
obj.2 = "second"     // obj는 {"1": "first", "2": "second"}
PRINT(obj.1)          // "first" (키 "1"을 읽음)
PRINT(obj."1")        // "first" (동일)
```

### 중첩 접근

접근 패턴은 중첩 구조에서 체인됩니다:

```
data = {"users": [{"name": "Alice"}, {"name": "Bob"}]}
data.users.1.name    // "Alice"
data.users.2.name    // "Bob"
```

## 제어 흐름

### If / Else

```
if condition then
    // 문장들
end

if condition then
    // 문장들
else
    // 문장들
end
```

### 루프

**조건 루프** — 조건이 참인 동안 반복:

```
i = 0
loop i < 10 do
    i = i + 1
end
```

**값 루프** — 컬렉션을 반복:

```
loop item in [10, 20, 30] do
    PRINT(item)
end
```

**키-값 루프** — 키/인덱스와 함께 반복:

```
// 배열: 키는 1-기반 인덱스
loop i, val in ["a", "b", "c"] do
    PRINT(i, val)    // 1 a, 2 b, 3 c
end

// 객체: 키는 프로퍼티 이름
loop k, v in {"x": 1, "y": 2} do
    PRINT(k, v)      // x 1, y 2
end
```

### 무한 루프

기본적으로 루프는 1000회 반복으로 제한됩니다 (호스트에서 설정 가능). 무제한 반복을 허용하려면 `infinite` 키워드를 추가합니다:

```
loop condition infinite do
    // 조건이 거짓이 되거나 break할 때까지 실행
end

loop item in collection infinite do
    // 크기에 관계없이 전체 컬렉션을 순회
end
```

`infinite` 없이 반복 제한을 초과하면 런타임 에러가 발생합니다.

### Break와 Continue

```
loop i < 100 do
    if i == 5 then break end        // 루프 종료
    if i % 2 == 0 then continue end // 다음 반복으로 건너뜀
    PRINT(i)
end
```

`break`와 `continue`는 가장 안쪽의 루프에만 영향을 줍니다.

### 디버그 문

`debug` — 디버거를 위한 명시적 중단점. 플레이그라운드의 디버그 모드에서 각 `debug` 문에서 실행이 일시 중지됩니다. 일반 실행에서 `debug`는 아무 동작도 하지 않습니다(no-op). 문이 유효한 모든 위치에 배치할 수 있습니다.

## 함수

```
function add(a, b) do
    return a + b
end

result = add(3, 4)    // 7
```

### 반환 값

- `return value` — 지정된 값을 반환
- `return` (단독) — `{}`를 반환
- return 문 없음 — `{}`를 반환

### 인자

- 누락된 인자는 `{}` (빈 객체)로 기본 설정
- 선언된 매개변수를 초과하는 인자는 런타임 에러
- 모든 인자는 **값에 의한 호출(call-by-value)** — 함수는 복사본을 받습니다. 함수 내부에서 매개변수를 수정해도 호출자의 변수에 영향을 주지 않습니다.

```
function greet(name, title) do
    if title == {} then
        return "Hello, " + name
    end
    return "Hello, " + title + " " + name
end

greet("Alice", "Dr.")    // "Hello, Dr. Alice"
greet("Bob")             // "Hello, Bob" (title은 {}로 기본 설정)
```

### 재귀

함수는 자기 자신을 재귀적으로 호출할 수 있습니다:

```
function factorial(n) do
    if n <= 1 then return 1 end
    return n * factorial(n - 1)
end
```

## 변수 스코프

### 전역과 지역

최상위 레벨에서 할당된 변수는 **전역**입니다. 함수 내에서 할당된 변수는 해당 함수 호출에 **지역적**입니다. 함수 내에서 전역 변수는 `::` 접두사로만 접근할 수 있습니다.

```
x = "global"

function example() do
    x = "local"       // 지역 x를 생성
    PRINT(x)           // "local"
    PRINT(::x)         // "global" (::로 전역 읽기)
end

example()
PRINT(x)               // "global" (변경되지 않음)
```

### 조회 순서

**최상위 레벨:**

1. 전역 변수
2. 내장 프로퍼티

**함수 내부와 multi 설정 단계 (일반 `x`):**

1. 지역 스코프 (가장 안쪽부터 — 중첩 함수 호출)
2. Multi 블록 결과 변수
3. 찾을 수 없으면 에러 (`::` 사용 힌트 포함)

**함수 내부와 multi 설정 단계 (`::x`):**

1. 전역 변수 (또는 multi 컨텍스트의 스레드 스냅샷)
2. 내장 프로퍼티

### 루프에서의 스코프

루프 변수 (`item`, `key`, `val`)는 동일한 스코프 규칙을 따릅니다 — 함수 내부이면 지역, 아니면 전역. `::` 없이 항상 접근 가능합니다.

## Multi 블록 (병렬 실행)

`thread` 키워드를 사용하여 `multi` 블록 내에서 임의의 함수를 동시에 실행할 수 있습니다. 결과는 하나의 객체에 수집됩니다.

```
function worker(name) do
    PRINT(name + " started")
    return name + " done"
end

multi result do
    thread resultA: worker("A")
    thread resultB: worker("B")
end

PRINT(result.resultA.value)   // "A done"
PRINT(result.resultB.value)   // "B done"
```

### 문법

```
multi resultVar do             // resultVar는 선택 사항
    thread key: funcCall()     // 이름 있는 결과 항목
    thread : funcCall()        // 이름 없음 (위치 기반 자동 키)
monitor intervalMs             // 선택적 monitor 절
    // monitor 본문
end
```

- `resultVar` — 모든 스레드 완료 후 결과 컬렉션을 받는 변수. 선택 사항; fire-and-forget에는 생략 (`multi do ... end`).
- `do` — 선택적 결과 변수 뒤에 필수 키워드.

### thread

`thread`는 multi 블록 내에서 함수 호출을 동시 실행 예약하는 데 사용됩니다:

- `thread key: funcCall()` — 식별자 키 (문자열 `"key"`)
- `thread "key": funcCall()` — 문자열 리터럴 키 (특수 문자 허용)
- `thread 42: funcCall()` — 정수 리터럴 키 (문자열 `"42"`)
- `thread $var: funcCall()` — 변수 키 (`TO_STRING()`으로 자동 문자열 변환)
- `thread $::var: funcCall()` — 전역 변수 키 (`$var`와 동일하나 전역에 직접 접근)
- `thread $(expr): funcCall()` — 표현식 키 (`TO_STRING()`으로 자동 문자열 변환)
- `thread : funcCall()` — 이름 없음, `"#1"`, `"#2"` 등으로 자동 키 부여
- `thread "": funcCall()` — 이름 없음으로 처리 (빈 문자열 키 = 이름 없음)

스레드 생성 키는 프로퍼티 접근과 동일한 `access` 문법을 사용합니다 (`obj.key`, `obj."key"`, `obj.1`, `obj.$var`, `obj.$::var`, `obj.$(expr)`). 모든 키는 내부적으로 문자열입니다.
- `thread`는 multi 블록 내에서만 사용 가능 — 다른 곳에서 사용하면 런타임 에러
- 같은 multi 블록 내 키 이름 중복은 런타임 에러 (동적 키 포함)

**설정 단계 스코프 격리:** 설정 단계는 함수 내부와 동일한 격리된 지역 스코프에서 실행됩니다. 설정 중 생성된 변수는 바깥 스코프로 유출되지 않습니다. 전역 변수 접근에는 `::` 접두사가 필요합니다.

```
multi result do
    if ::needsWorkerA == true then   // 전역 읽기에 :: 필요
        thread rA: workerA()
    end
    thread rB: workerB()
    PRINT("설정 완료")
    i = 1                            // 설정 단계의 지역 변수, 유출되지 않음
end
// i는 여기서 정의되지 않음
```

수집된 모든 `thread` 호출은 설정 단계가 끝날 때 (`end` 또는 `monitor`에서) 동시에 시작됩니다.

**결과 변수 스코핑:** `resultVar`는 multi 블록이 완료될 때 현재 스코프에 할당됩니다 — 최상위 레벨에서는 전역 변수가 되고, 함수 내부에서는 해당 함수 스코프의 지역 변수가 됩니다. 일반 변수 할당과 동일한 규칙을 따릅니다.

### 결과 수집

`resultVar`는 모든 스레드 결과를 포함하는 **맵/객체**를 받습니다:

- **이름 있는 스레드** (`key: func()`): 컬렉션에서의 키는 사용자가 제공한 이름
- **이름 없는 스레드**: 키는 `"#"` 뒤에 이름 없는 스레드 중 1-기반 위치 (`"#1"`, `"#2"` 등) — 이름 있는 스레드는 위치 슬롯을 차지하지 않음
- 각 항목은 3개 필드를 가진 **Result 객체**:

| status | ok | value |
|---|---|---|
| `"running"` | `false` | `{}` |
| `"done"` | `true` | 반환 값 |
| `"error"` | `false` | 에러 메시지 문자열 |

컬렉션은 생성 시점에 `"running"` 항목으로 미리 구축됩니다. 스레드가 완료되면 항목이 제자리에서 업데이트됩니다. multi 블록이 끝난 후 모든 항목은 `"done"` 또는 `"error"`가 됩니다.

```
multi result do
    thread a: funcA()         // result.a
    thread : funcB()          // result."#1" (자동 키: 이름 없는 1번째 스레드)
    thread c: funcC()         // result.c
end

result.a.status               // "done"
result.a.value                // 이름으로 접근
LEN(result)                   // 3
loop key, val in result do    // 모든 결과 반복
    PRINT(key, val.status, val.value)
end
```

### 동적 생성

설정 단계에서 루프를 지원하여 동적 스레드 생성이 가능합니다. 설정이 격리된 스코프에서 실행되므로 루프 변수는 지역 상태로 유지됩니다:

```
multi result do
    i = 1
    loop i <= 5 infinite do
        thread : worker(i)
        i = i + 1
    end
end

// 위치로 접근 (모두 이름 없음, "#1"부터 "#5"까지 자동 키)
loop r in result do
    PRINT(r.value)
end
```

### 동적 스레드 키

스레드 키는 `$var`, `$::var`, 또는 `$(expr)` 문법을 사용하여 런타임에 계산할 수 있습니다 (프로퍼티 접근 패턴과 동일):

```
names = ["alpha", "beta", "gamma"]
multi result do
    loop name in ::names do
        thread $name: worker(name)           // 변수에서 키
    end
    thread $("delta"): worker("x")           // 표현식에서 키
end
PRINT(result.alpha.value)
PRINT(result.delta.value)
```

동적 키의 **유효성 규칙**:
- 값은 `TO_STRING()`을 통해 **자동으로 문자열로 변환** — 숫자, 불리언, 객체, 배열 모두 문자열 표현이 됨
- **빈 문자열**은 이름 없는 스레드로 처리 (`"#1"`, `"#2"` 등으로 자동 키 부여)
- multi 블록 내에서 **고유해야** 함 — 중복 키 (정적 키와 동적 키 간의 중복 포함)는 런타임 에러

### 스레드 순수성

multi 블록 내에서 실행되는 함수는 순수성 모델을 적용합니다:

- **읽기 가능**: `::` 경유 전역 변수 (multi 블록 시작 시 생성된 스냅샷에서 읽음)
- **쓰기 불가**: 전역 변수 — `::x = value`는 런타임 에러
- **호출 가능**: 다른 모든 함수 (사용자 정의 또는 내장)
- **생성 및 수정 가능**: 지역 변수 자유롭게 (`::`없는 일반 `x`)

이를 통해 데이터 경합 없음이 보장됩니다 — 스레드는 서로의 변경을 볼 수 없습니다.

### 의미론

1. multi 블록 본문은 격리된 스코프에서 설정 단계로 실행 (함수처럼)되어 `thread` 호출을 수집
2. `multi` 진입 시 전역 변수의 스냅샷이 생성 — 모든 스레드가 이 스냅샷을 참조
3. 설정 완료 후 생성된 모든 함수가 동시에 시작
4. 결과 컬렉션은 생성 시점에 `"running"` 항목으로 미리 구축
5. 스레드는 문장 경계에서 인터리빙되며 협력적으로 실행
6. 각 스레드가 완료되면 결과 항목이 `"done"` 또는 `"error"`로 제자리 업데이트
7. monitor 절은 실행 중 실시간 결과 컬렉션을 읽을 수 있음
8. 모든 스레드가 완료되어야 `end` 이후로 실행이 계속됨
9. 결과 컬렉션은 **모든** 스레드 완료 후 `resultVar`에 할당

### Monitor 절

선택적 `monitor` 절은 스레드 실행 중 주기적으로 코드를 실행합니다:

```
multi result do
    thread resultA: worker("A")
    thread resultB: worker("B")
monitor 100
    PRINT("[하트비트]")
end
```

- `monitor` 뒤의 숫자는 밀리초 단위 간격
- monitor 코드는 **읽기 전용** — monitor 내 변수 할당은 런타임 에러
- monitor는 내장 함수를 호출할 수 있음 (예: `PRINT`)
- monitor는 결과 컬렉션 변수를 읽어 스레드 상태를 확인할 수 있음 (예: `result.key.status`)
- monitor는 모든 스레드 완료 후 마지막으로 한 번 더 실행
- monitor는 전역 변수를 읽을 수 있지만 (`::` 접두사), 설정 단계의 지역 변수에는 접근 **불가** — monitor는 전역과 결과 변수만 포함하는 자체 스코프에서 실행

```
multi result do
    thread r: slowWorker()
monitor 100
    PRINT("상태:", result.r.status)   // "running" 또는 "done"
end
```

**monitor가 `result`에 접근하는 방식:** 위 코드에서 monitor 본문은 모든 스레드가 완료된 후(`end`에서)에만 할당되는 `result`를 참조합니다. 이것이 동작하는 이유는 스케줄러가 각 monitor 틱마다 `resultVar` 이름으로 라이브 결과 컬렉션을 monitor의 스코프에 **주입**하기 때문입니다. monitor는 최종 할당된 변수를 읽는 것이 아니라, 스레드가 완료됨에 따라 스케줄러가 유지하는 라이브 맵을 읽습니다. 이것이 `result = ...` 할당이 아직 일어나지 않았음에도 monitor가 `"running"` 항목이 실시간으로 `"done"`으로 전환되는 것을 볼 수 있는 이유입니다.

### 순차적 Multi 블록

여러 `multi` 블록을 연결하여 결과를 전달할 수 있습니다:

```
multi r1 do
    thread a: compute(10)
end

multi r2 do
    thread b: compute(r1.a.value)
end
```

### SLEEP

`SLEEP(milliseconds)`은 다른 스레드를 차단하지 않고 현재 스레드를 일시 중지합니다:

```
function slow_worker() do
    SLEEP(500)
    return "done"
end
```

`multi` 블록 내에서 실행되는 함수에서만 의미가 있습니다.

## 내장 함수

모든 내장 함수 이름은 대문자입니다.

### 출력

| 함수 | 설명 |
|---|---|
| `PRINT(args...)` | 값들을 공백으로 구분하여 출력. `{}`를 반환. |

### 수학

| 함수 | 설명 |
|---|---|
| `SUM(args...)` | 모든 숫자 인자의 합 |
| `MAX(args...)` | 모든 숫자 인자의 최댓값 |
| `MIN(args...)` | 모든 숫자 인자의 최솟값 |
| `ABS(n)` | 절대값 |
| `FLOOR(n)` | 내림 |
| `CEIL(n)` | 올림 |
| `ROUND(n)` | 반올림 |
| `RANDOM()` | 0.0 (포함) ~ 1.0 (미포함) 사이의 랜덤 소수 |
| `RANDOM(max)` | 0 (포함) ~ `max` (미포함) 사이의 랜덤 정수. `max`는 양수여야 합니다. |
| `RANDOM(min, max)` | `min` ~ `max` (양쪽 포함) 사이의 랜덤 정수. |

### 타입 변환

| 함수 | 설명 |
|---|---|
| `TO_NUMBER(s)` | 문자열을 숫자로 변환. 유효한 숫자 문자열이 아니면 에러. |
| `TO_STRING(v)` | 모든 값을 문자열 표현으로 변환 |

### 문자열 함수

| 함수 | 설명 |
|---|---|
| `LEN(s)` | 문자열, 배열 또는 객체의 길이 (항목 수). 다른 타입은 `0` 반환. |
| `UPPERCASE(s)` | 대문자로 변환 |
| `LOWERCASE(s)` | 소문자로 변환 |
| `TRIM(s)` | 앞뒤 공백 제거 |
| `SUBSTRING(s, start, [length])` | 부분 문자열 추출. `start`는 1-기반. |
| `SPLIT(s, delimiter)` | 문자열을 배열로 분리. 후행 빈 문자열을 유지. |
| `JOIN(arr, [separator])` | 배열 요소를 문자열로 합침. 기본 구분자는 `""`. |
| `CHARS(s)` | 문자열을 단일 문자 배열로 분리 |

### 배열 함수

| 함수 | 설명 |
|---|---|
| `LEN(arr)` | 요소 수 (객체에서도 동작 — 키 수를 반환) |
| `PUSH(arr, values...)` | 값이 추가된 새 배열 반환. 원본 변경 없음. |
| `POP(arr)` | 마지막 요소가 제거된 새 배열 반환. 원본 변경 없음. |
| `CONCAT(arrs...)` | 모든 입력 배열을 연결한 새 배열 반환 |
| `SLICE(arr, start, [end])` | 부분 배열 반환. `start`는 1-기반. `end`는 배타적. |
| `SORT(arr)` | 오름차순 정렬된 새 배열 반환. 모든 요소가 같은 타입(숫자 또는 문자열)이어야 합니다. |
| `SORT_DESC(arr)` | 내림차순 정렬된 새 배열 반환. `SORT`와 동일한 타입 제한. |
| `SORT_BY(arr, key)` | 주어진 키로 오름차순 정렬된 객체 배열 반환. |
| `SORT_BY_DESC(arr, key)` | 주어진 키로 내림차순 정렬된 객체 배열 반환. |
| `REVERSE(arr)` | 요소 순서가 반전된 새 배열 반환. 타입 제한 없음. |

### 객체 함수

| 함수 | 설명 |
|---|---|
| `HAS_KEY(obj, key)` | `obj`에 `key`가 있으면 `true`, 없으면 `false` 반환. 두 인자 모두 필수: `obj`는 객체, `key`는 문자열이어야 합니다. |
| `KEYS(obj)` | 객체의 키를 삽입 순서대로 배열로 반환. `obj`는 객체여야 합니다. |
| `LEN(obj)` | 객체의 항목 수 |

### 타이밍

| 함수 | 설명 |
|---|---|
| `SLEEP(ms)` | 현재 스레드를 `ms` 밀리초 동안 일시 중지 |
| `MILTIME()` | 현재 시간을 에포크 밀리초 (숫자)로 반환 |
| `DATE()` | 현재 날짜를 `"YYYY-MM-DD"` 문자열로 반환 |
| `TIME()` | 현재 시각을 `"HH:MM:SS"` 문자열로 반환 |

## 내장 프로퍼티

호스트 애플리케이션은 전역 변수로 접근 가능한 읽기 전용 프로퍼티를 주입할 수 있습니다:

```bash
# 커맨드 라인
java -jar propertee.jar -p '{"width": 100, "height": 200}' script.pt
```

```
// 스크립트 내부
area = width * height    // 20000
```

프로퍼티는 읽기 전용이며 변수 조회 체인의 최하위에 위치합니다 — 동일한 이름의 지역 또는 전역 변수가 우선합니다.

## 외부 함수와 Result 패턴

호스트 애플리케이션은 커스텀 함수를 등록할 수 있습니다. 이들은 런타임 에러를 발생시키는 대신 에러 처리에 **Result 패턴**을 사용합니다:

```
// 외부 함수 호출
res = GET_BALANCE("alice")

if res.ok == true then
    PRINT("잔액:", res.value)
else
    PRINT("에러:", res.value)
end
```

Result 객체는 3개 필드를 가집니다:
- `ok` — 성공 시 `true`, 실패 시 또는 진행 중이면 `false`
- `value` — 성공 시 결과 값, 실패 시 에러 메시지 문자열, 진행 중이면 `{}`
- `status` — `"done"`, `"error"`, 또는 `"running"` (multi 블록의 진행 중인 스레드)

외부 함수 결과에는 `ok`로 충분합니다 — `res.ok == true`를 확인하세요. `status` 필드는 주로 multi 블록 스레드 결과를 위해 존재하며, `"running"` (아직 완료되지 않음)과 `"error"` (실패로 완료됨)를 구분합니다 — 둘 다 `ok: false`입니다.

호스트 애플리케이션은 다른 ProperTee 스레드를 멈추지 않고 블로킹 I/O를 수행하는 **비동기 외부 함수**를 등록할 수도 있습니다. 비동기 함수가 호출되면, 현재 스레드는 블로킹되고 multi 블록 내의 다른 스레드는 계속 실행됩니다. 비동기 결과는 캐시되고 I/O가 완료되면 문장이 재실행됩니다. Java 구현의 README에서 `registerExternalAsync()` API를 참조하세요.

## 주석

```
// 한 줄 주석

/* 여러 줄
   주석 */
```

## 세미콜론

세미콜론은 선택 사항이며 공백으로 처리됩니다. 아래 두 코드는 동일합니다:

```
x = 1; y = 2; z = 3
```

```
x = 1
y = 2
z = 3
```

## 출력 형식

값이 출력되거나 표시될 때:

| 타입 | 형식 | 예시 |
|---|---|---|
| 정수 | 소수점 없음 | `42` |
| 소수 (정수 결과) | 소수점 없음 | `5` (`5.0`이 아님) |
| 소수 (소수 결과) | 소수점 포함 | `3.14` |
| 문자열 | 따옴표 없음 | `hello` |
| 불리언 | 소문자 | `true` |
| 빈 객체 | 중괄호 | `{}` |
| 배열 | 대괄호 | `[ 1, 2, 'hello' ]` |
| 객체 | 중괄호 | `{ "name": 'Alice', "age": 30 }` |

배열 및 객체 내부의 문자열은 작은따옴표로 표시됩니다. `PRINT`로 출력되는 최상위 문자열은 따옴표가 없습니다.

## 런타임 에러

ProperTee는 줄과 열 정보와 함께 에러를 보고합니다:

```
Runtime Error at line 5:3: Variable 'x' is not defined
```

주요 에러 조건:

| 조건 | 에러 |
|---|---|
| 미정의 변수 | Variable 'x' is not defined |
| 미정의 함수 | Unknown function 'foo' |
| 산술 타입 불일치 | Arithmetic operator '+' requires numeric operands |
| 변환 불가능한 `+` 피연산자 | Addition requires numeric or string operands |
| `and`/`or`에 비불리언 | Logical AND requires boolean operands |
| 0으로 나누기 | Division by zero |
| 누락된 프로퍼티 | Property 'x' does not exist |
| 배열 범위 초과 | Array index out of bounds |
| 루프 제한 초과 | Loop exceeded maximum iterations (1000) |
| multi 블록 내 전역 쓰기 | Cannot assign to global variable '::x' inside multi block |
| 지역 스코프에서 :: 없이 전역 접근 | Variable 'x' is not defined in local scope. Use ::x to access the global variable |
| monitor 내 할당 | Cannot assign variables in monitor block (read-only) |
| multi 외부에서 thread | thread can only be used inside multi blocks |
| 결과 키 중복 | Duplicate result key 'x' in multi block |
| 동적 키가 문자열이 아님 | Dynamic thread key must be a string, got number |
| 동적 키가 비어 있음 | Dynamic thread key must not be empty |
| 인자 초과 | Function 'foo' expects 2 argument(s), but 3 were provided |
| 혼합 타입 정렬 | SORT() requires all elements to be the same type (number or string) |
| SORT_BY 키 없음 | Property 'x' does not exist in array element at index N |
| 비배열 정렬 | SORT() requires an array argument |
| 범위 step이 양수가 아님 | Range step must be positive |
| 범위 경계가 숫자가 아님 | Range bounds must be numbers |
| 범위 step이 숫자가 아님 | Range step must be a number |

## 변경 이력

### v0.3.0

- **일반 식별자 키 금지**: 객체 키는 따옴표 문자열 또는 정수여야 합니다. `{"name": "Alice"}`는 유효하며, `{name: "Alice"}`는 파싱 에러입니다.
- **`debug` 문**: 플레이그라운드 디버거의 명시적 중단점을 위한 새 키워드. 일반 실행에서는 아무 동작 없음(no-op).
- **깊은 복사 값 의미론**: 모든 할당 (변수, 프로퍼티, 함수 인자, 스레드 인자, 루프 변수)이 독립적인 깊은 복사를 생성합니다. 변수 간 공유 가변 상태 없음.
- **범위 문법 `..`**: 범위 배열 문법이 `[start~end]`에서 `[start..end]` 및 `[start..end, step]`으로 변경.
- **정렬 함수**: `SORT()`, `SORT_DESC()`, `SORT_BY()`, `SORT_BY_DESC()`, `REVERSE()` 내장 함수 추가.
- **객체 위치 접근 제거**: 객체의 정수 키는 항상 문자열 키로 해석. `obj.1`은 삽입 순서의 첫 번째 항목이 아닌 키 `"1"`을 읽음.
- **`KEYS()` 내장 함수**: `KEYS(obj)`는 객체의 키를 삽입 순서대로 배열로 반환.

### v0.2.0

- **`RANDOM()`, `MILTIME()`, `DATE()`, `TIME()` 내장 함수**: 랜덤 숫자, 에포크 밀리초, 형식화된 날짜 및 시간 문자열.
- **범위 배열 리터럴**: `[1..5]`는 `[1, 2, 3, 4, 5]`를 생성. 선택적 step: `[1..10, 2]`.
- **`$::var` 문법**: 동적 키와 프로퍼티 접근에서 전역 변수 접근. `obj.$::var` 및 `thread $::var: func()`.
- **Multi 블록 설정 스코프 격리**: 설정 단계가 격리된 스코프에서 실행. 전역 접근에 `::` 필요.
- **빈 동적 키를 이름 없음으로 처리**: 빈 `$var`/`$(expr)` 키는 이름 없는 스레드로 처리 (`"#1"`, `"#2"` 등으로 자동 키 부여).
- **스레드 생성 키 문법**: `thread key: func()` 접두사 문법. 키는 `access` 규칙을 재사용.
- **자동 키 `#` 접두사**: 이름 없는 스레드 결과가 `"1"`, `"2"` 대신 `"#1"`, `"#2"`로 키 부여.
- **동적 스레드 키**: 스레드 생성에서 계산된 키를 위한 `$var` 및 `$(expr)` 문법.
- **스레드 status 필드**: Result 객체의 `status` 필드 (`"running"`, `"done"`, `"error"`).
- **Multi 블록 결과 수집**: `multi resultVar do ... end`로 모든 스레드 결과를 수집.
- **`HAS_KEY()` 내장 함수**: `HAS_KEY(obj, key)`는 `true`/`false`를 반환.
- **`thread` 키워드로 생성**: `thread`를 multi 블록 내 생성 키워드로 재사용.
- **`::` 전역 접두사**: 함수 내부에서 `::x`로 전역 접근. 스레드 순수성 적용.
- **참/거짓 판별**: `true`만 참(truthy).
- **암묵적 반환**: `return` 없는 함수는 `{}`를 반환.

### v0.1.0

- 변수, 함수, 루프, 조건문, 배열, 객체, 문자열, 협력적 멀티스레딩, 30개 내장 함수로 초기 릴리스.
