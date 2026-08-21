# ProperTee 언어 명세 v0.20.0

## 개요

ProperTee는 호스트 애플리케이션에 내장하기 위해 설계된 작고 안전한 스크립팅 언어입니다. 스레드 순수성 모델을 갖춘 협력적 멀티스레딩을 지원하며 — 스레드는 공유 상태를 변경할 수 없어 설계적으로 데이터 경합이 제거됩니다. 락, 공유 가변 상태, 암묵적 null이 없습니다.

## 값과 타입

ProperTee에는 7가지 타입이 있습니다:

| 타입 | 예시 | 비고 |
|---|---|---|
| 숫자 (정수) | `0`, `42`, `-7` | 정수 |
| 숫자 (소수) | `3.14`, `0.5` | 부동소수점 |
| 문자열 | `"hello"`, `"it's \"quoted\""` | 큰따옴표, `\"`로 내부 따옴표 표현 |
| 불리언 | `true`, `false` | |
| 배열 | `[1, 2, 3]`, `[]` | 순서 있음, 1-기반 인덱싱, 이종 타입 허용 |
| 객체 | `{"name": "Alice", "age": 30}`, `{}` | 순서 있는 키-값 쌍, 문자열 키 |
| null | `null` | JSON의 명시적 "값 없음" — 언어 메커니즘이 아니라 데이터 |

**암묵적 null이 없습니다.** 언어 자체는 절대 `null`을 만들지 않습니다: 생략된 인자는 `{}`, `return` 없는 함수도 `{}`를 반환하며, 어떤 연산도 조용히 `null`을 내놓지 않습니다. 언어의 "값 없음" 센티넬은 여전히 빈 객체 `{}`입니다. `null`은 JSON — `null`이 표준이자 의미 있는 값인 — 이 무손실로 왕복하도록 존재합니다: 프로그램에는 `null` 리터럴 또는 데이터(`JSON_PARSE`, 호스트 주입 값)로만 유입되며, 어디에 놓이든 불활성 데이터로 머뭅니다:

- `TYPE_OF(null)` → `"null"`이며, 표시와 JSON 직렬화 모두 (따옴표 없는) `null`입니다.
- 동등 비교는 동작합니다: `null == null`은 `true`, `null == {}`는 `false`, `null == 0`은 `false`.
- 그 외 모든 사용은 런타임 에러입니다 — 조건 위치의 `null`(`Condition requires a boolean value. Got null`), 산술·논리 연산, 멤버 접근 모두. null 전파(propagation)는 없습니다: 오용은 사용 지점에서 시끄럽게 실패합니다.

JSON `null`을 다루지 않는 스크립트는 `null`을 볼 일이 없습니다. 데이터 경계에서 명시적으로 검사하세요(`if x == null then`).

### 숫자 표현

- 정수와 소수 모두 "숫자"이지만 내부적으로 다르게 저장됩니다
- 정수 결과를 만드는 산술은 소수점 없이 표시: `10 / 2`는 `5`로 표시
- 나눗셈은 항상 내부적으로 소수를 생성: `7 / 2` → `3.5`
- 다른 연산의 정수 결과도 정수로 표시: `1.0 + 2.0` → `3`

#### 정수·소수 구분은 명목적 (스펙 v0.14.0)

숫자가 **정수**인지 **소수**인지는 *값이 생산되는 지점*에서 — 연산의 구조로 — 고정되며, 런타임 값이
우연히 정합(whole)인지와는 무관합니다. 정합 값에 도달한 소수(`1.5 + 1.5`)는 소수로 남고, 다시 정수로
돌아가지 않습니다.

- **정수**의 출처: 정수 리터럴; 정수끼리의 `+`, `-`, `*`, `%`, 단항 `-`(아래 절의 오버플로 검사 대상);
  정수를 내는 빌트인(`LEN`, `FLOOR`, `CEIL`, `ROUND`, 정수에 대한 `ABS` 등).
- **소수**의 출처: 소수 리터럴(`3.0`처럼 정합이어도); 모든 `/`; 소수 피연산자가 있는 모든 연산
  (`2 + 3.0` → 소수 `5`); 소수를 내는 빌트인(`RANDOM`, …); 그리고 텍스트에 소수점이나 지수가 있는
  데이터 — `.`, `e`, `E`를 포함하는 토큰이나 32비트 범위 밖 정수 리터럴에 대한
  `JSON_PARSE`/`TO_NUMBER`.

이 구분이 관측되는 곳은 **정수 오버플로 규칙**(다음 절)과 **극단 크기의 표시**(§출력 형식)뿐입니다:
어떤 식이 오버플로할 수 *있는지*는 데이터가 아니라 식의 구조로 결정되므로, `2.0 * 1500000000`은
평범한 소수 `3000000000`이고 `2 * 1500000000`(둘 다 정수)은 오버플로합니다. 그 외 모든 곳에서 둘은
동일하게 취급됩니다 — `TYPE_OF`는 둘 다 `"number"`, `2 == 2.0`은 `true`, 정합 값의 표시는 어느
쪽이든 같습니다. **정수가 필요한 자리**(인덱싱, 동적 키, 정수 인자 빌트인)에서는 정합 소수가 강제
변환으로 허용되고, 비정합 소수는 종전대로 에러입니다.

#### 정수 범위 (스펙 v0.13.0)

정수는 **32비트 부호 있는** 값입니다: −2,147,483,648 … 2,147,483,647. ProperTee의 다른 모든 타입
규칙처럼, 범위를 벗어나면 사용 지점에서 크게 실패합니다 — 조용한 랩어라운드도, 조용한 소수 승격도
없습니다:

- 정수 **리터럴**은 범위에 들어와야 합니다. 리터럴 토큰은 부호가 없으므로 가장 큰 리터럴은
  `2147483647`이고, 이보다 크면 런타임 에러입니다: `Integer literal out of range: 9999999999`.
  가장 작은 정수 −2³¹은 직접 쓸 수 없지만(마이너스 기호는 연산자) 완전히 유효한 값입니다 —
  산술로 도달하세요: `-2147483647 - 1`.
- 결과가 범위를 벗어나는 정수 **산술**(`+`, `-`, `*`, 단항 `-`)은 런타임 에러입니다:
  `Integer overflow`. (`/`는 항상 소수를 만들므로 오버플로가 없고, `%`도 오버플로할 수 없습니다.)
- 정수를 만드는 빌트인 — `FLOOR`, `CEIL`, `ROUND`(소수에서), 그리고 `ABS`(|−2³¹|는 표현 불가) — 도 결과가 범위를 벗어나면 같은
  `Integer overflow` 에러를 냅니다.
- **데이터는 영향받지 않습니다**: `JSON_PARSE`/`TO_NUMBER`는 범위를 벗어나는 정수값을 계속 소수로
  표현합니다 — 데이터 변환은 스크립트 산술이 아니고, JSON 왕복은 그대로 유지됩니다.

### 참/거짓 판별 (Truthiness)

`if` 조건과 `loop` 조건은 **불리언** 값을 요구합니다:

- `true` — 분기 실행 / 루프 계속
- `false` — 분기 건너뜀 / 루프 종료
- **다른 타입은 런타임 에러:** `Condition requires a boolean value`

암묵적 강제 변환은 없습니다 — `0`, `""`, `[]`, `{}`는 "falsy"가 아니라 조건에서 타입 에러이며, 논리 연산자의 엄격성과 일치합니다. (spec v0.6.0까지는 비불리언 조건이 조용히 거짓 취급되었습니다. v0.7.0에서 시끄러운 에러로 변경 — 변경 이력의 마이그레이션 노트 참고.)

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

동등 비교(`==`, `!=`)는 모든 타입에서 동작합니다. 값은 참조가 아닌 내용으로 비교됩니다 — `{} == {}`는 `true`입니다. `null`은 자기 자신과만 같습니다: `null == null`은 `true`이고, 그 외 어떤 값(`{}` 포함)과도 `false`입니다. 관계 연산자(`>`, `<`, `>=`, `<=`)는 양쪽 피연산자가 모두 숫자여야 합니다.

### 논리

| 연산자 | 연산 | 피연산자 타입 |
|---|---|---|
| `and` | 논리 AND | boolean and boolean |
| `or` | 논리 OR | boolean or boolean |
| `not` | 논리 NOT | not boolean |

모든 논리 연산자는 **불리언 피연산자를 요구**합니다. 숫자나 문자열을 `and`/`or`에 사용하면 런타임 에러입니다.

평가는 좌→우로 **단축 평가(short-circuit)** 됩니다: `false and X`와 `true or X`는 `X`를 아예 평가하지 않으며(부수효과 포함), 피연산자의 타입 검사도 실제로 평가될 때만 수행됩니다. 덕분에 존재 확인 가드 관용구가 가능합니다:

```
if HAS_KEY(obj, "k") and obj.k == 1 then   // "k"가 없으면 obj.k는 아예 평가되지 않음
    ...
end
```

(spec v0.6.0까지는 양쪽 모두 항상 평가되었습니다.)

### 우선순위 (낮은 것에서 높은 것 순)

1. `or`
2. `and`
3. `==` `!=` `>` `<` `>=` `<=`
4. `+` `-`
5. `*` `/` `%`
6. `-` (단항), `not`
7. `.` (멤버 접근)

괄호 `()`로 우선순위를 변경할 수 있습니다.

> **⚠️ `not`은 비교보다 강하게 결합합니다** (Lua와 동일): `not a == b`는 `not (a == b)`가 **아니라** `(not a) == b`로 파싱됩니다. `a`가 불리언이 아니면 시끄럽게 실패하고(`not`은 불리언 필요), 양쪽 다 불리언이면 두 해석이 우연히 일치하지만 — `a`만 불리언이고 `b`가 아니면 **조용히 항상 `false`** 가 됩니다. 동등 비교는 타입을 가로질러 허용되고 불리언은 비불리언과 절대 같지 않기 때문입니다:
>
> ```
> status = true
> if not status == "done" then    // (not status) == "done" → status가 무엇이든 false
>     PRINT("절대 실행되지 않음")
> end
> ```
>
> 부등 비교는 `a != b`(권장) 또는 `not (a == b)`로 쓰세요.

## 문자열

문자열은 큰따옴표로 감쌉니다. 지원되는 이스케이프 시퀀스:

| 이스케이프 | 문자 |
|---|---|
| `\"` | 큰따옴표 |
| `\\` | 백슬래시 |
| `\n` | 줄바꿈 |
| `\t` | 탭 |
| `\r` | 캐리지 리턴 |

인식되지 않는 이스케이프(예: `\d`)는 그대로 유지됩니다 (리터럴 백슬래시 + 문자).

```
msg = "She said \"hello\""
path = "C:\\Users\\file"
multiline = "line1\nline2"
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

### If / Elseif / Else

```
if condition then
    // 문장들
end

if condition then
    // 문장들
else
    // 문장들
end

if condition then
    // 문장들
elseif condition then
    // 문장들
elseif condition then
    // 문장들
else
    // 문장들
end
```

조건은 위에서 아래로 검사되며, 처음으로 `true`가 된 가지가 실행되고 그 뒤는 — 이후의 조건 포함 — 전부 건너뜁니다(`elseif` 조건은 도달했을 때만 평가되고, 타입 검사도 그때만 수행). 어떤 조건도 맞지 않으면 선택적 `else` 가지가 실행됩니다. 평가되는 조건은 모두 불리언이어야 합니다(참/거짓 판별 참고). `end` 하나가 체인 전체를 닫습니다 — `elseif`는 spec v0.9.0에서 추가되었으며, 이전에는 다분기마다 `else if ... end`를 중첩해 `end`를 쌓아야 했습니다(그 형태도 여전히 동작합니다).

### 루프

**조건 루프** — 조건이 `true`인 동안 반복(비불리언 조건은 `if`와 동일하게 런타임 에러):

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

### 이름 해석

함수 호출 `NAME(...)`은 다음 순서로 해석됩니다 (스펙 v0.11.0부터 명세됨):

1. 호스트가 `NAME`을 차단했다면(ignored functions) 그 호출은 무효 — 존재 자체가 스크립트 전체를 로드 시점에 거부시킵니다(스펙 v0.14.0): `'NAME' is not available in this environment`. [호스트 환경 제한](#호스트-환경-제한) 참고.
2. 스크립트가 정의한 `NAME` 함수.
3. 빌트인 함수와 호스트가 등록한 외부 함수.

따라서 스크립트가 정의한 함수는 같은 이름의 빌트인·외부 함수를 **가립니다** — 그리고 새 빌트인을 추가하는 스펙 릴리스가 기존 스크립트의 호출 해석을 바꾸는 일이 없어집니다. 3단계 안에서 카탈로그 빌트인 이름으로 등록한 외부 함수는 해당 빌트인을 대체합니다. **인터프리터 디스패치 이름** — `PRINT`, `SLEEP`, `FAIL`, `UNWRAP` — 은 아예 대체할 수 없습니다: 이 이름으로 외부 함수를 등록하는 것 자체가 등록 시점의 **호스트 API 에러**입니다(스펙 v0.13.0; 이전에는 `PRINT`/`SLEEP`은 구현 정의, `FAIL`/`UNWRAP` 등록은 조용히 무시).

스펙 v0.12.0부터 스크립트는 애초에 전부-대문자 함수 이름을 정의할 수 없으므로([예약된 함수 이름](#예약된-함수-이름) 참고), 스크립트 함수와 빌트인의 충돌 자체가 성립하지 않습니다; 위 순서는 예약되지 않은 이름으로 등록된 호스트 외부 함수라는 잔여 케이스에 여전히 적용됩니다.

### 예약된 함수 이름

전부-대문자 네임스페이스는 런타임과 호스트의 것입니다 (스펙 v0.12.0). 스크립트는 이름이 전부 대문자인 — 대문자로 시작하고 대문자·숫자·언더스코어만으로 이루어진(`^[A-Z][A-Z0-9_]*$`) — 함수를 정의할 수 없습니다. 정의 자체가 정의 위치에서의 런타임 에러입니다:

```
function LEN(x) do    // Runtime error: Cannot define function 'LEN':
    return 0          //   all-uppercase names are reserved for built-in
end                   //   and host functions
```

이 규칙은 현재 빌트인으로 존재하는 이름만이 아니라 **모든** 전부-대문자 이름에 적용됩니다 — 그래서 미래의 스펙 릴리스가 스크립트 코드와 충돌할 걱정 없이 새 빌트인을 추가할 수 있습니다. 이로써 얻는 것: ALL-CAPS 호출은 언제나 빌트인 또는 호스트 제공 함수라는 것이 관례가 아니라 **보장된 사실**이 됩니다. 소문자가 섞인 이름(`Foo`, `getBalance`, `get_balance`)은 제한이 없습니다. 변수 이름은 영향받지 않습니다(`MAX = 10`은 합법 — 변수와 함수는 별도 네임스페이스).

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

## Multi 블록 (협력적 동시성)

`thread` 키워드를 사용하여 `multi` 블록 내에서 임의의 함수를 동시에 실행할 수 있습니다. 결과는 하나의 객체에 수집됩니다.

**병렬(parallelism)이 아니라 동시성(concurrency)입니다.** ProperTee 스레드는 협력적으로 스케줄됩니다: 어느 순간에도 스레드 하나만 실행되며, 문장 경계에서 결정론적 라운드로빈 순서로 인터리빙됩니다. 따라서 `multi` 블록은 CPU 바운드 작업을 빠르게 만들지 않습니다. 이득은 *대기의 중첩*에서 나옵니다 — 한 스레드가 `SLEEP`, `SHELL`, `HTTP*`, async 외부 함수, 호스트 I/O에서 블록되어 있는 동안 다른 스레드들이 계속 실행됩니다. 그 대가로 얻는 것은 재현성입니다: 같은 스크립트는 매 실행마다 같은 인터리빙과 같은 출력 순서를 내며, 데이터 레이스도 락도 없습니다.

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
multi resultVar limit K do     // resultVar와 limit 절은 선택 사항
    thread key: funcCall()     // 이름 있는 결과 항목
    thread : funcCall()        // 이름 없음 (위치 기반 자동 키)
monitor intervalMs             // 선택적 monitor 절
    // monitor 본문
end
```

- `resultVar` — 모든 스레드 완료 후 결과 컬렉션을 받는 변수. 선택 사항; fire-and-forget에는 생략 (`multi do ... end`).
- `limit K` — 선택적 동시성 상한 (스펙 v0.19.0): 최대 `K`개의 스레드만 동시에 실행되고 나머지는 spawn 순서로 대기. [동시성 상한](#동시성-상한-limit) 참고.
- `do` — 선택적 결과 변수와 limit 절 뒤에 필수 키워드.

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

multi 블록의 본문은 스레드 실행 전에 **설정 단계**로 실행됩니다. 일반 코드 (if/else, 루프, PRINT)는 설정 중 즉시 실행되고, `thread` 문은 동시에 실행할 함수 호출을 수집합니다.

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

수집된 모든 `thread` 호출은 설정 단계가 끝날 때 (`end` 또는 `monitor`에서) 동시에 시작됩니다 — 단, `limit` 절이 있으면 동시 실행 개수가 상한으로 제한됩니다 ([동시성 상한](#동시성-상한-limit) 참고).

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

**결과 변수 스코핑:** `resultVar`는 multi 블록이 완료될 때 현재 스코프에 할당됩니다 — 최상위 레벨에서는 전역 변수가 되고, 함수 내부에서는 해당 함수 스코프의 지역 변수가 됩니다. 일반 변수 할당과 동일한 규칙을 따릅니다.

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

### 동시성 상한 (`limit`)

결과 변수와 `do` 사이의 선택적 `limit K` 절은 동시에 실행되는 스레드 수를 상한으로 제한합니다
(스펙 v0.19.0). 상한을 넘는 스레드는 대기하고, 스레드가 하나 끝날 때마다 **spawn 순서로 다음
대기 스레드가 투입**됩니다 — 이 모델의 다른 모든 것처럼 결정론적으로.

ProperTee 스레드는 *대기*에서만 중첩되므로(위 참고), 이 상한은 실질적으로 동시 블로킹 연산의
상한입니다: `SHELL` 잡 목록에 `limit 3`을 걸면 프로세스가 한 번에 최대 3개만 존재합니다. 덕분에
잡당 스레드 하나라는 자연스러운 형태가 임의 길이의 잡 목록에 대해 안전해지고, 부하 균형은
런타임이 맡습니다(슬롯이 비면 즉시 다음 잡 투입) — 스레드 순수성 아래에서 스크립트 스스로는
할 수 없는 일입니다:

```
multi result limit 3 do
    loop job in ::jobs do
        thread $(job.name): runJob(job)    // 잡 N개, 동시 실행 최대 3개
    end
end
```

규칙:

- limit 표현식은 **`multi` 진입 시 한 번만** 평가됩니다 — 텍스트 순서대로: 전역 스냅샷 생성과
  설정 단계 실행보다 먼저.
- **양의 정수**로 평가되어야 합니다. 0, 음수, 소수, 비숫자는 런타임 에러입니다
  (`multi limit must be a positive integer`) — "0 = 무제한"은 없습니다. 명목적 숫자 정체성
  (스펙 v0.14.0)이 적용되므로 값이 정합이어도 `limit 2.0`은 에러입니다.
- `K >=` spawn된 스레드 수이면 limit이 없는 것과 정확히 같습니다. `limit 1`은 spawn 순서의
  순차 실행입니다.
- 설정 단계는 변하지 않습니다: 모든 `thread` 문은 여전히 spawn 문 시점에 인자를 평가(깊은
  복사)하고 `"running"` 결과 항목을 선등록합니다. 스레드 본문의 *시작*만 지연됩니다. 대기 중인
  스레드는 실행 중인 스레드와 외부에서 구별되지 않습니다 — Result 항목은 `"running"`이며,
  새로운 status는 없습니다.
- [monitor 감시 쓰레드](#monitor-절)는 슬롯을 소비하지 **않습니다**: 상한과 무관하게 생성되고
  동작합니다.
- 에러로 끝난 스레드도 다른 완료와 똑같이 슬롯을 해제합니다; `[THREAD ERROR]` 보고와 투입 모두
  계속됩니다.
- `limit`은 예약어가 됩니다(v0.9.0의 `elseif`와 같은 부류): 식별자로 쓰던 스크립트는 이름을
  바꿔야 합니다.

### 스레드 순수성

multi 블록 내에서 실행되는 함수는 순수성 모델을 적용합니다:

- **읽기 가능**: `::` 경유 전역 변수 (multi 블록 시작 시 생성된 스냅샷에서 읽음)
- **쓰기 불가**: 전역 변수 — `::x = value`는 런타임 에러
- **호출 가능**: 다른 모든 함수 (사용자 정의 또는 내장)
- **생성 및 수정 가능**: 지역 변수 자유롭게 (`::`없는 일반 `x`)

이를 통해 데이터 경합 없음이 보장됩니다 — 스레드는 서로의 변경을 볼 수 없습니다.

### 의미론

1. multi 블록 본문은 격리된 스코프에서 설정 단계로 실행 (함수처럼)되어 `thread` 호출을 수집
2. `multi` 진입 시, **설정 단계가 실행되기 전에** 전역 변수의 스냅샷이 생성 — 모든 스레드(와 monitor 감시 쓰레드)가 이 스냅샷을 참조. 설정 단계의 `::` 쓰기는 실제 전역을 갱신하지만(블록 이후에 보임) 스레드에게는 보이지 **않음**
3. 설정 완료 후 생성된 모든 함수가 동시에 시작 — `limit K` 절이 있으면 한 번에 최대 `K`개, 끝나는 스레드가 spawn 순서로 다음을 투입 (스펙 v0.19.0)
4. 결과 컬렉션은 생성 시점에 `"running"` 항목으로 미리 구축
5. 스레드는 문장 경계에서 인터리빙되며 협력적으로 실행
6. 각 스레드가 완료되면 결과 항목이 `"done"` 또는 `"error"`로 제자리 업데이트
7. monitor 감시(watchdog) 쓰레드는 각 iteration 시작 시점에 캡쳐한 스냅샷으로 결과 컬렉션을 관찰 (스펙 v0.16.0)
8. 모든 스레드가 완료되어야 `end` 이후로 실행이 계속됨
9. 결과 컬렉션은 **모든** 스레드 완료 후 `resultVar`에 할당

### Monitor 절

선택적 `monitor` 절은 multi 블록에 **감시(watchdog) 쓰레드**를 붙입니다 — 런타임이 워커들과 나란히 자동으로 생성·관리하는 쓰레드입니다(스펙 v0.16.0):

```
multi result do
    thread resultA: worker("A")
    thread resultB: worker("B")
monitor 100
    PRINT("[하트비트]")
end
```

- `monitor` 뒤의 숫자는 감시 쓰레드의 **sleep 간격**(밀리초)입니다: 감시 쓰레드는 간격만큼 sleep한 뒤 본문을 한 번 실행하기를 반복합니다. 본문 자신의 실행 시간(및 본문 안의 중단)은 주기에 더해집니다 — 고정 주기 타이머가 아니라 iteration *사이의* sleep입니다.
- 모든 워커가 끝나면 감시 쓰레드는 본문을 **마지막으로 한 번** 실행하고 종료합니다; multi 블록은 그 최종 iteration 이후에 완료됩니다. 최종 실행은 보장됩니다 — 앞선 iteration이 실패했더라도, 감시 쓰레드는 완료된 컬렉션을 최소 한 번은 관찰합니다. (최종 실행이 *언제* 시작되는지 — 마지막 워커 완료 즉시인지, 감시 쓰레드의 다음 기상 시점인지 — 는 구현 타이밍이며, 스펙은 실행된다는 사실만 약속합니다.)
- 감시 쓰레드는 **워커 쓰레드와 동일한 순수성 규칙**을 따릅니다: 전역은 읽기 전용 스냅샷(`::` 읽기 가능; `::` 쓰기는 워커와 동일한 런타임 에러)이고, 접두사 없는 이름은 지역 변수입니다. 설정 단계의 지역 변수는 볼 수 없습니다.
- 각 iteration은 함수 호출처럼 **새 지역 스코프**에서 실행됩니다 — 지역 변수는 iteration 간에 이월되지 않습니다. 지역 할당, 루프, 함수 호출 모두 본문에서 허용됩니다.
- iteration의 스코프는 바인딩 하나로 시작합니다: 결과 컬렉션 변수 — iteration 시작 시점에 찍은 컬렉션의 **캡쳐 스냅샷**(깊은 복사)을 담습니다.
- iteration이 실패하면 에러가 보고되고(`[MONITOR ERROR] ...`), 남은 중간 iteration은 건너뛰며, 최종 iteration은 여전히 실행됩니다.
- 감시 쓰레드는 블록의 `limit` 절에서 면제됩니다(스펙 v0.19.0): 동시성 슬롯을 소비하지 않으며, 투입 대기 중인 스레드를 평범한 `"running"` 항목으로 관찰합니다.

```
multi result do
    thread r: slowWorker()
monitor 100
    PRINT("상태:", result.r.status)   // "running" 또는 "done"
end
```

**감시 쓰레드가 `result`를 보는 방식:** 위 코드에서 monitor 본문은 모든 스레드가 완료된 후(`end`에서)에만 할당되는 `result`를 참조합니다. 각 감시 iteration은 진행 중인 결과 컬렉션을 **캡쳐**하며 시작합니다 — 깊은 복사된 스냅샷이 iteration 스코프에 `resultVar` 이름으로 바인딩됩니다. 캡쳐는 iteration 전체에 걸쳐 일관됩니다 — 본문이 중단되어(`SLEEP`, 블로킹 호출) 그 사이 워커들이 완료되더라도 마찬가지입니다; 다음 iteration이 새로 캡쳐하므로, 감시 쓰레드는 iteration을 거치며 `"running"` 항목이 `"done"`이 되는 것을 봅니다. 보장된 최종 iteration은 완료된 컬렉션을 캡쳐합니다. (스펙 v0.16.0 이전에는 monitor가 라이브 뷰를 읽는 대신 할당이 전면 금지였습니다 — 변경 이력 참고.)

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

### 블로킹과 중단

내장 함수는 **런타임 프리미티브**입니다 — 런타임 또는 호스트가 제공하는 것이지, ProperTee로 작성된 것이 아닙니다. 그중 일부는 **중단(suspend)** 합니다: 기다려야 하는 호출 — `SLEEP`, `SHELL`/`SHELL_CTX`, `HTTP`/`HTTP_GET`/`HTTP_POST`, 파일 I/O 내장 함수, 그리고 호스트가 등록한 비동기 외부 함수 — 은 호출한 스레드만 일시 정지시키고, 대기가 끝날 때까지 형제 스레드에 양보합니다. `await` 같은 표시는 없습니다: 중단은 구문의 성질이 아니라 호출의 성질이며, 어떤 함수든 이들을 호출함으로써 전이적으로 중단할 수 있습니다.

`SLEEP`은 단지 가장 작은 중단 프리미티브(순수 타이머)일 뿐입니다. 스크립트는 다른 방법으로 중단할 수 없습니다 — 대기 추상화는 `SLEEP` *위에 합성*합니다:

```
// SLEEP으로 만든 폴링 대기
function wait_until(flag_file) do
    loop not FILE_EXISTS(flag_file) infinite do
        SLEEP(100)
    end
end
```

호스트는 자신만의 중단 프리미티브를 만들 수 있습니다: 비동기 외부 함수는 중단하는 내장 함수와 같은 계약을 받습니다 — 호출한 스레드는 중단되고, 형제들은 계속 실행되며, 결과는 Result 객체로 전달됩니다.

## 내장 함수

모든 내장 함수 이름은 대문자이며, 전부-대문자 네임스페이스는 내장·호스트 함수용으로 예약되어 있습니다 — 스크립트는 그런 이름을 정의할 수 없습니다 ([예약된 함수 이름](#예약된-함수-이름) 참고).

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
| `RANDOM(min, max)` | `min` ~ `max` (양쪽 포함) 사이의 랜덤 정수. |

단일 인자 형태 `RANDOM(max)`는 **v0.7.0에서 제거**되었습니다 — 배타적 상한이 포함 규약인 2-인자 형태와 충돌했기 때문입니다. 단일 인자 호출은 런타임 에러이며, 기존 의미가 필요하면 `RANDOM(0, max - 1)`을 사용하세요.

### 타입 변환

| 함수 | 설명 |
|---|---|
| `TO_NUMBER(s)` | 문자열을 숫자로 변환. 유효한 숫자 문자열이 아니면 에러. |
| `TO_STRING(v)` | 모든 값을 문자열 표현으로 변환 |

### 타입

| 함수 | 설명 |
|---|---|
| `TYPE_OF(v)` | 타입 이름 반환: `"number"`, `"string"`, `"boolean"`, `"array"`, `"object"`, `"null"` |

### 문자열 함수

| 함수 | 설명 |
|---|---|
| `LEN(s)` | 문자열, 배열 또는 객체의 길이 (항목 수). 다른 타입은 런타임 에러. |
| `UPPERCASE(s)` | 대문자로 변환 |
| `LOWERCASE(s)` | 소문자로 변환 |
| `TRIM(s)` | 앞뒤 공백 제거 |
| `SUBSTRING(s, start, [length])` | 부분 문자열 추출. `start`는 1-기반. |
| `SPLIT(s, delimiter)` | 문자열을 배열로 분리. 후행 빈 문자열을 유지. |
| `JOIN(arr, [separator])` | 배열 요소를 문자열로 합침. 기본 구분자는 `""`. |
| `CHARS(s)` | 문자열을 단일 문자 배열로 분리 |
| `CONTAINS(s, sub)` | 문자열 `s`가 부분 문자열 `sub`를 포함하면 `true` 반환. 첫 인자로 배열도 받습니다 — [배열 함수](#배열-함수) 참고. |
| `STARTS_WITH(s, prefix)` | `s`가 `prefix`로 시작하면 `true` 반환 |
| `ENDS_WITH(s, suffix)` | `s`가 `suffix`로 끝나면 `true` 반환 |
| `FIND(s, sub)` | `s`에서 `sub`가 나타나는 **모든** 1-기반 위치의 배열. 오름차순이며 겹치는 발생도 포함 — `FIND("aaa", "aa")` → `[1, 2]`; 발생 없으면 `[]`. 리터럴 문자열 매치, 정규식 아님 (스펙 v0.17.0). 빈 `sub`는 런타임 에러. |
| `FIND_FIRST(s, sub)` | `s`에서 `sub`의 첫 발생 위치(1-기반), 없으면 `0` (스펙 v0.17.0). 항상 `FIND(s, sub)`의 첫 요소와 같음. 빈 `sub`는 런타임 에러. |
| `FIND_LAST(s, sub)` | `s`에서 `sub`의 마지막 발생 위치(1-기반), 없으면 `0` (스펙 v0.17.0). 항상 `FIND(s, sub)`의 마지막 요소와 같음. 빈 `sub`는 런타임 에러. |
| `MATCHES(s, pattern)` | 정규식 `pattern`이 `s`의 어디에든 매치하면 `true` 반환 |
| `REGEX_FIND(s, pattern)` | [전체매치, 그룹1, 그룹2, ...] 배열 반환. 매치 없으면 `{}`. 1-기반 배열. |
| `REPLACE(s, target, replacement)` | `target`의 모든 발생을 `replacement`로 치환. 리터럴 문자열 매치 (정규식 아님). |

### 배열 함수

| 함수 | 설명 |
|---|---|
| `PUSH(arr, values...)` | 값이 추가된 새 배열 반환. 원본 변경 없음. |
| `POP(arr)` | 마지막 요소가 제거된 새 배열 반환. 원본 변경 없음. |
| `CONCAT(arrs...)` | 모든 입력 배열을 연결한 새 배열 반환 |
| `SLICE(arr, start, [count])` | `start`(1-기반)부터 최대 `count`개 요소의 부분 배열 반환. `count` 생략 시 배열 끝까지. `SUBSTRING`·`READ_LINES`와 동일한 start+count 규약. |
| `SORT(arr)` | 오름차순 정렬된 새 배열 반환. 모든 요소가 같은 타입(숫자 또는 문자열)이어야 합니다. |
| `SORT_DESC(arr)` | 내림차순 정렬된 새 배열 반환. `SORT`와 동일한 타입 제한. |
| `SORT_BY(arr, key)` | 주어진 키로 오름차순 정렬된 객체 배열 반환. |
| `SORT_BY_DESC(arr, key)` | 주어진 키로 내림차순 정렬된 객체 배열 반환. |
| `REVERSE(arr)` | 요소 순서가 반전된 새 배열 반환. 타입 제한 없음. |
| `CONTAINS(arr, item)` | `item`이 `arr`의 요소이면 `true` 반환 (스펙 v0.15.0). 요소 비교는 `==` — 값 기반이고 객체/배열은 깊은 비교(`CONTAINS([{"a":1}], {"a":1})` → `true`), 타입이 다르면 엄격히 불일치(`CONTAINS([1,2], "2")` → `false`). 위의 문자열 부분검색 `CONTAINS`와 같은 빌트인이며 첫 인자의 타입으로 디스패치됩니다. |

### 객체 함수

| 함수 | 설명 |
|---|---|
| `HAS_KEY(obj, key)` | `obj`에 `key`가 있으면 `true`, 없으면 `false` 반환. 두 인자 모두 필수: `obj`는 객체, `key`는 문자열이어야 합니다. |
| `KEYS(obj)` | 객체의 키를 삽입 순서대로 배열로 반환. `obj`는 객체여야 합니다. |
| `VALUES(obj)` | 객체의 값을 삽입 순서대로 배열로 반환. |
| `ENTRIES(obj)` | `{"key": k, "value": v}` 객체들의 배열을 삽입 순서대로 반환. |
| `MERGE(obj1, obj2)` | 두 객체를 병합한 새 객체 반환. 키 충돌 시 `obj2` 우선. |
| `REMOVE_KEY(obj, key)` | 지정한 키를 제거한 새 객체 반환. 키 부재 시 에러 없음. |

### Result와 에러 승격

스펙 v0.10.0에서 추가. 의미론은 [Genuine Result와 `FAIL`, `UNWRAP`](#genuine-result와-fail-unwrap)을 참고하세요.

| 함수 | 설명 |
|---|---|
| `FAIL(message)` | 호출 지점에서 `message`로 런타임 에러를 발생시킵니다 (비문자열은 `TO_STRING`으로 코어션). 스크립트는 여느 런타임 에러와 동일하게 종료됩니다 — `Runtime Error at line L:C: <message>`; `multi` 스레드 안에서는 해당 스레드만 실패합니다 (`{status: "error"}`로 수집). 반환하지 않습니다. |
| `UNWRAP(res[, message])` | `res`가 `ok`가 true인 genuine Result면 `res.value`로 평가됩니다. `ok`가 false면 (`"running"` 포함) `TO_STRING(res.value)`로 런타임 에러를 발생시킵니다 — 두 번째 인자가 있으면 `message + ": "` 접두. genuine Result가 아닌 값은 런타임 에러입니다 (`UNWRAP() requires a Result`). |
| `OK([value])` | genuine Result `{status: "done", ok: true, value: value}`를 생성합니다. 인자 생략 시 `value`는 `{}`. |
| `ERR([value])` | genuine Result `{status: "error", ok: false, value: value}`를 생성합니다. 인자 생략 시 `value`는 `{}`. `value`는 어떤 타입이든 가능합니다 (HTTP 에러 Result처럼 구조화된 에러 허용). |
| `IS_RESULT(x)` | `x`가 genuine Result(런타임 생성 또는 `OK`/`ERR` 생성)면 `true`, 아니면 `false`. 어떤 값이든 받으며 에러를 내지 않습니다. |

### 환경 변수

| 함수 | 설명 |
|---|---|
| `ENV(name)` | 환경 변수 읽기. 미설정 시 `{}` 반환. |
| `ENV(name, default)` | 환경 변수 읽기 (기본값 제공). 미설정 시 `default` 반환. |

### JSON

| 함수 | 설명 |
|---|---|
| `JSON_PARSE(s)` | JSON 문자열 파싱. Result 반환: 성공 시 `ok`와 파싱된 값, 실패 시 `error`. JSON `null`은 `null`로 보존 (spec v0.7.0까지는 `{}`로 정규화). |
| `JSON_FORMAT(v)` | 모든 값을 JSON 문자열로 변환. `null`은 `null`로 직렬화되어 `JSON_PARSE`/`JSON_FORMAT`이 무손실로 왕복합니다. |

### 파일 I/O

| 함수 | 설명 |
|---|---|
| `FILE_EXISTS(path)` | 파일 또는 디렉터리가 존재하면 `true` 반환. |
| `FILE_INFO(path)` | Result 반환: `ok`와 `{type, size, modified}`, 미존재 시 `error`. |
| `READ_LINES(path, [start], [count])` | 파일에서 라인 읽기. `start`는 1-기반 (기본 1). `count`는 읽을 라인 수 제한. Result와 문자열 배열 반환. |
| `READ_FILE(path)` | 파일 전체를 하나의 문자열로 읽기 (스펙 v0.18.0). Result 반환: 파일 내용(UTF-8, 내용 그대로)이면 `ok`, 읽기 실패면 `error`. `WRITE_FILE`의 대응 함수; 큰 파일에는 윈도우 방식의 `READ_LINES`가 여전히 적합. |
| `READ_JSON_FILE(path)` | JSON 파일을 읽어서 한 번에 파싱 (스펙 v0.18.0). Result 반환: 파싱된 값(객체·배열·스칼라 — `JSON_PARSE`와 동일한 변환)이면 `ok`, 읽기 실패나 잘못된 JSON이면 `error`. 선행 UTF-8 BOM은 무시. `READ_LINES` + `JOIN` + `JSON_PARSE` 관용구를 대체. |
| `WRITE_FILE(path, content)` | 파일에 문자열 쓰기 (덮어쓰기). Result 반환. |
| `WRITE_LINES(path, lines)` | 문자열 배열의 각 요소를 줄 단위로 쓰기 (각 줄 뒤에 줄바꿈). Result 반환. |
| `WRITE_JSON_FILE(path, value)` | `value`를 JSON으로 직렬화 — `JSON_FORMAT`과 동일한 출력 — 해서 뒤에 줄바꿈 하나를 붙여 파일에 쓰기(덮어쓰기) (스펙 v0.18.0). Result 반환: 성공 시 `{}`와 `ok`. `READ_JSON_FILE`의 대응 함수: 왕복은 일급 `null`을 포함해 무손실. |
| `APPEND_FILE(path, content)` | 파일에 문자열 추가. Result 반환. |
| `MKDIR(path)` | 디렉터리 생성 (부모 포함). Result 반환. |
| `LIST_DIR(path)` | 디렉터리 항목 목록. Result와 `{name, type, size}` 객체 배열 반환. 이름순 정렬. |
| `DELETE_FILE(path)` | 단일 파일 삭제. 디렉터리는 거부. Result 반환. |

```
// 라인 쓰기와 읽기
WRITE_LINES("/data/output.csv", ["name,age", "Alice,30", "Bob,25"])
res = READ_LINES("/data/output.csv", 2, 1)    // 헤더 건너뛰고 1줄 읽기
PRINT(res.value.1)                              // "Alice,30"

// 대용량 파일 순회
offset = 1
loop true infinite do
    res = READ_LINES("/data/big.log", offset, 500)
    if res.ok == false then break end
    lines = res.value
    if LEN(lines) == 0 then break end
    loop line in lines do
        if CONTAINS(line, "ERROR") == true then
            PRINT(line)
        end
    end
    offset = offset + LEN(lines)
end

// 디렉터리 작업
MKDIR("/data/reports/2024")
res = LIST_DIR("/data/reports")
loop entry in res.value do
    PRINT(entry.name, entry.type)
end
```

### 타이밍

| 함수 | 설명 |
|---|---|
| `SLEEP(ms)` | 현재 스레드를 `ms` 밀리초 동안 일시 중지 |
| `MILTIME()` | 현재 시간을 에포크 밀리초 (숫자)로 반환 |
| `DATE()` | 현재 날짜를 `"YYYY-MM-DD"` 문자열로 반환 |
| `TIME()` | 현재 시각을 `"HH:MM:SS"` 문자열로 반환 |

### 셸

| 함수 | 설명 |
|---|---|
| `SHELL(cmd)` | 셸 명령을 실행합니다. 종료 코드 0이면 stdout과 함께 Result `ok`, 0이 아니면 출력과 함께 `error`를 반환합니다. |
| `SHELL(ctx, cmd)` | `SHELL_CTX()`에서 받은 컨텍스트를 사용하여 셸 명령을 실행합니다. Result를 직접 전달하세요 — `SHELL`이 자동으로 언래핑합니다. |
| `SHELL_CTX(cwd)` | 작업 디렉토리 `cwd`로 셸 컨텍스트를 생성합니다. 디렉토리가 존재하면 컨텍스트 객체와 함께 Result `ok`, 없으면 `error`를 반환합니다. |
| `SHELL_CTX(cwd, env)` | 작업 디렉토리와 환경 변수로 셸 컨텍스트를 생성합니다. `env`는 키-값 쌍 객체입니다. |

각 `SHELL()` 호출은 `/bin/sh -c <cmd>`를 통해 새 프로세스를 생성합니다. 영속 세션은 없습니다. `SHELL_CTX()`의 컨텍스트는 설정 객체일 뿐으로, 프로세스 상태를 유지하지 않습니다. `SHELL()`에 컨텍스트를 전달할 때는 `SHELL_CTX()`의 Result를 직접 전달하세요 — `SHELL`이 자동으로 Result를 언래핑하여 컨텍스트를 추출합니다.

### HTTP

| 함수 | 설명 |
|---|---|
| `HTTP_GET(url, [options])` | HTTP GET. Result 반환(아래 참고). |
| `HTTP_POST(url, body, [options])` | 문자열 `body`로 HTTP POST. Result 반환. |
| `HTTP(method, url, [options])` | 임의 메서드(PUT/DELETE/PATCH/...)용 범용 요청. `options.body`로 요청 본문 전달. |

`options`는 객체입니다: `{"headers": {"Key": "Value", ...}, "timeout": <ms>, "body": <HTTP()용>}` — 모두 선택. (`"headers"` 대신 `"header"` 도 허용.)

**요청 본문.** 문자열 body 는 그대로 전송되고, 그 외 값(객체/배열/숫자/불리언)은 **JSON 으로 직렬화**됩니다. 즉 `HTTP_POST(url, {"a": 1})` 는 `{"a":1}` 을 보냅니다(`a=1` 형태가 아님). 서버가 요구하면 `headers` 에 `"Content-Type": "application/json"` 을 넣으세요.

**Result 형태.** 요청이 완료되면 `value = {status, body, headers}`이고 `ok`는 2xx일 때만 true입니다(4xx/5xx도 `value`는 그대로 유지하되 `ok`는 false). 전송 단계 실패(잘못된 URL, DNS, 연결 거부, 타임아웃)는 `ok` false와 `value = {"status": 0, "body": "<에러 메시지>", "headers": {}}`를 반환합니다. 즉 `res.value`는 항상 이 객체이며 — `res.ok`와 `res.value.status`를 확인하세요.

```
res = HTTP_GET("http://service/health")
if res.ok == true then
    PRINT(res.value.body)
end
PRINT("status", res.value.status)
```

HTTP는 파일 I/O처럼 호스트가 제공하는 기능(`PlatformProvider`)입니다 — 제공자가 없는 환경에서는 미지원 에러를 반환합니다.

```
// 단일 명령
result = SHELL("echo hello")
PRINT(result.value)              // "hello"

// 컨텍스트 사용 (작업 디렉토리 + 환경 변수)
ctx = SHELL_CTX("/data/project", {"ENV": "prod"})
result = SHELL(ctx, "./build.sh")

// 에러 처리
result = SHELL("exit 1")
if result.ok == false then
    PRINT("명령 실패")
end
```

`SHELL()`은 비동기입니다 — multi 블록에서 셸 명령이 실행되는 동안 다른 스레드는 계속 실행됩니다. multi 블록 외부에서는 스크립트가 단순히 대기합니다.

> **런타임 가용성:** 셸 함수는 호스트가 제공하는 `TaskRunner`가 필요합니다. 파일 I/O와 ENV는 `PlatformProvider`가 필요합니다. JavaScript 런타임(브라우저/Node.js)에서는 이 함수들이 스텁으로 `{ok: false, value: "... is not available in this environment"}`를 반환합니다.

## 내장 프로퍼티

호스트 애플리케이션은 전역 변수로 접근 가능한 읽기 전용 프로퍼티를 주입할 수 있습니다:

```bash
# 커맨드 라인
java -jar propertee.jar -p '{"width": 100, "height": 200}' script.tee
```

```
// 스크립트 내부
area = width * height    // 20000
```

프로퍼티는 읽기 전용이며 변수 조회 체인의 최하위에 위치합니다 — 동일한 이름의 지역 또는 전역 변수가 우선합니다.

### `_PROPS` — 모든 입력을 하나의 객체로

주입된 각 프로퍼티는 개별 변수로 접근할 수 있을 뿐 아니라, 입력 전체가 예약 객체 **`_PROPS`** 로도 노출됩니다. 덕분에 개별 키를 그대로 읽으면서 입력 전체를 한 번에 출력·순회·전달할 수 있습니다:

```
PRINT(a)                                 // 개별 키 (기존과 동일)
PRINT(_PROPS.a)                          // 객체를 통한 동일한 값
PRINT(JSON_FORMAT(_PROPS))               // {"a":40,"b":2}  — 전체 입력 덤프 (디버깅)
loop k in KEYS(_PROPS) do PRINT(k) end   // 입력 이름 순회
return { "echo": _PROPS }                // 호출자/시스템으로 전체 입력 전달
```

`_PROPS` 는 입력의 스냅샷입니다(자기 자신을 포함하지 않으므로 `JSON_FORMAT(_PROPS)` 가 안전합니다). 함수나 `multi` 설정 단계 내부에서는 다른 프로퍼티와 동일하게 `::_PROPS` 로 접근합니다. 입력에 실제로 `_PROPS` 라는 키가 있으면 그 값을 그대로 사용합니다.

### `_ARGS` — 위치 기반 호출 인자

예약 배열 **`_ARGS`** (스펙 v0.20.0)는 호출의 위치 인자를 담습니다 — CLI에서는 스크립트 경로
뒤의 모든 것입니다(옵션 파싱은 거기서 멈춥니다):

```
$ propertee2 deploy.tee prod eu-west 42
```

```
PRINT(LEN(_ARGS))                 // 3
PRINT(_ARGS.1)                    // "prod"      — 모든 배열처럼 1-based
target = _ARGS.2                  // "eu-west"
n = TO_NUMBER(_ARGS.3)            // 인자는 문자열 — 숫자 진입은 명시적으로
loop a in _ARGS do PRINT(a) end   // 전체 순회
```

- `_ARGS`는 **항상 존재**합니다: 인자가 없으면 빈 배열 `[]`입니다(부재가 아님 — `LEN(_ARGS)`는
  항상 안전). 원소는 전부 문자열이고 호출 순서 그대로입니다.
- 그 외에는 평범한 전역입니다: 함수·`multi` 설정 내부에서는 `::_ARGS`; 워커와 감시 쓰레드는 여느
  전역처럼 multi 진입 스냅샷으로 읽습니다.
- 인자는 **위치 기반이며 프로퍼티와 별개**입니다: `_PROPS`에 나타나지 않으므로 위의 순회·덤프
  패턴이 오염되지 않습니다. 이름 있는 설정은 `-p` 프로퍼티에, 호출자가 명령줄에 놓을 것은
  `_ARGS`에 담으세요.
- 입력 프로퍼티에 실제로 `_ARGS`라는 키가 있으면 그 값을 그대로 사용합니다 — `_PROPS`와 동일한
  우선순위 규칙입니다.
- 인자 공급 방식은 호스트 정의입니다: 레퍼런스 CLI는 스크립트 경로 뒤에서 받고(`-i` 포함, REPL
  세션과 공유), DAP 서버는 launch 설정의 `args`를, 임베딩 호스트는 `Engine.setArgs`를 씁니다.

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

### Genuine Result와 `FAIL`, `UNWRAP`

스펙 v0.10.0에서 추가.

**Genuine Result.** 런타임이 생성한 Result 객체 — Result를 반환하는 빌트인(`JSON_PARSE`, `SHELL`/`SHELL_CTX`, `HTTP`/`HTTP_GET`/`HTTP_POST`, 파일 I/O 그룹 — 단 일반 boolean을 반환하는 `FILE_EXISTS`는 제외), 외부 함수 호출(동기·비동기, 타임아웃 에러 포함), `multi` 스레드 수집 항목 — 과 `OK`/`ERR` 생성자가 만든 Result는 *genuine Result*입니다: 런타임이 그 출처를 기억합니다. 같은 세 필드를 가진 스크립트 객체 리터럴은 일반 객체이지 genuine Result가 **아닙니다**.

이 구별은 `TYPE_OF`(여전히 `"object"`), 표시, 동등성, JSON 직렬화에는 보이지 않습니다; 오직 `IS_RESULT`와 `UNWRAP`만 관찰합니다. genuine Result의 복사본(할당, 인자 전달, `PUSH`, 깊은 복사)은 genuine Result이며, 필드를 변경해도 출처는 사라지지 않습니다. 출처는 JSON을 통과하지 못합니다: `JSON_FORMAT`은 genuine Result를 일반 3필드 객체로 렌더링하고, `JSON_PARSE`된 데이터 내부에는 genuine Result가 없습니다 (`JSON_PARSE` 자체가 반환하는 래퍼 Result는 genuine입니다).

**승격(escalation).** Result 패턴은 복구 가능한 에러를 명시적 값으로 만듭니다; `FAIL`은 스크립트가 치명적이라고 판단한 에러를 위한 명시적 승격입니다 — 호출 지점에서 일반 런타임 에러를 발생시켜, 다른 런타임 에러와 정확히 동일하게 런이 실패합니다:

```
res = HTTP_GET(url)
if not res.ok then
    FAIL("upstream failed: " + res.value.body)
end
```

`UNWRAP`은 검사-후-승격 체인을 호출 하나로 압축합니다 — 별도의 에러 메커니즘이 아니라 `FAIL`로 탈설탕됩니다:

```
// UNWRAP(res) ≡  if not res.ok then FAIL(TO_STRING(res.value)) end  ... 그리고 res.value
user = UNWRAP(fetch(1))
data = UNWRAP(JSON_PARSE(text), "config parse")   // 에러 메시지: "config parse: <파싱 에러>"
```

`multi` 스레드 안에서 `FAIL`(과 승격되는 `UNWRAP`)은 해당 스레드만 실패시킵니다 — 실패는 `{status: "error", ok: false, value: <메시지>}`로 수집되고 런은 계속됩니다 (여느 워커 런타임 에러와 동일).

호스트에 **구조화된** 에러(메시지 문자열이 아니라)를 전달해야 하는 스크립트는 승격 대신 Result를 데이터로 반환하세요 — `FAIL`/`UNWRAP`은 실패를 메시지 문자열로 납작하게 만듭니다.

### 비동기 외부 함수

호스트 애플리케이션은 다른 ProperTee 스레드를 멈추지 않는 블로킹 I/O(데이터베이스 쿼리, HTTP 요청, 파일 읽기)를 위해 **비동기 외부 함수**를 등록할 수 있습니다. `registerExternal()` 대신 `registerExternalAsync()`를 사용합니다:

```java
// Java 호스트 — 5초 타임아웃 비동기 함수
interpreter.builtins.registerExternalAsync("DB_QUERY", new BuiltinFunction() {
    public Object call(List<Object> args) {
        String sql = (String) args.get(0);
        // 백그라운드 스레드에서 실행 — 블로킹 가능
        return Result.ok(database.execute(sql));
    }
}, 5000);
```

```javascript
// JavaScript 호스트 — 비동기 함수 (타임아웃 없음)
visitor.registerExternalAsync("HTTP_GET", (url) => {
    const response = await fetch(url);
    return Result.ok(response.json());
});
```

스크립트 측에서는 비동기 함수와 동기 외부 함수가 동일하게 보입니다:

```
// 스크립트는 GET_BALANCE가 동기인지 비동기인지 알 필요 없음
res = GET_BALANCE("alice")
if res.ok == true then
    PRINT("잔액:", res.value)
end
```

**동작 방식:**
- 호출 스레드는 비동기 작업이 완료(또는 타임아웃)될 때까지 **블로킹**됩니다
- `multi` 블록 내의 다른 스레드는 **계속 실행**됩니다 — 호출 스레드만 일시 정지
- `multi` 블록 외부에서는 스크립트가 단순히 대기합니다 (실행할 다른 스레드 없음)
- 결과는 동일한 Result 패턴 사용: 성공 시 `{ok: true, value: ...}`, 실패 시 `{ok: false, value: "에러 메시지"}`
- 비동기 함수 내부에서 발생한 예외는 자동으로 `Result.error(message)`로 래핑됩니다

**타임아웃:** 선택적 타임아웃 매개변수(밀리초)는 스레드 대기 시간을 제한합니다. 작업이 타임아웃을 초과하면 함수는 `{status: "error", ok: false, value: "timeout"}`을 반환합니다:

```
// 호스트가 100ms 타임아웃으로 등록
// registerExternalAsync("FAST_LOOKUP", func, 100)

res = FAST_LOOKUP("key")
if res.ok == true then
    PRINT(res.value)
else
    PRINT("타임아웃 또는 에러:", res.value)   // "timeout"
end
```

**제한 사항:**
- 비동기 함수는 `monitor` 블록 내에서 호출할 수 없습니다 (런타임 에러)
- 같은 문장에서 여러 비동기 호출은 지원되지 않습니다 — 별도 문장을 사용하세요
- 비동기 함수는 딥카피된 인수를 받습니다 (스레드 안전)

### 호스트 환경 제한

호스트 애플리케이션은 사용 가능한 언어 키워드와 내장 함수를 제한할 수 있습니다:

```
// Java 호스트
Set<String> hidden = new HashSet<String>();
hidden.add("multi");
hidden.add("loop");
interpreter.setHiddenKeywords(hidden);

Set<String> ignored = new HashSet<String>();
ignored.add("SHELL");
interpreter.setIgnoredFunctions(ignored);

// JavaScript 호스트
visitor.setHiddenKeywords(["multi", "loop"]);
visitor.setIgnoredFunctions(["SHELL"]);
```

**숨김 키워드**는 그 문을 사용하는 스크립트를 실행 자체가 거부되게 합니다:

```
// "if"가 숨겨진 경우:
x = 10
if x == 10 then    // 'if' is not available in this environment — 스크립트 전체 거부
    PRINT(x)
end
```

숨길 수 있는 키워드: `if`, `loop`, `function`, `multi`, `thread`, `debug`. `if`를 숨기면 `if`/`elseif`/`else` 문 전체가 막힙니다.

**무시된 함수**는 그 함수를 호출하는 스크립트를 실행 자체가 거부되게 합니다:

```
// "SHELL"이 무시된 경우:
x = SHELL("echo hello")   // 'SHELL' is not available in this environment — 스크립트 전체 거부
```

내장 함수와 외부 함수 모두 무시할 수 있습니다. 일반 함수 호출과 multi 블록 `thread` 생성의 함수 호출 모두에서 검사됩니다.

**로드 시점 거부 (스펙 v0.14.0).** 차단된 구문 — 숨김 키워드나 무시된 함수 호출 — 을 소스 **어디에서든**(죽은 분기 포함) 이름으로 언급하는 스크립트는 아예 실행되지 않습니다. 런은 **첫 문장이 실행되기 전에** 거부되며, 문서 순서상 **첫 번째 위반**으로 `Runtime Error at line L:C: 'X' is not available in this environment` 형태로 실패합니다. 위반 구문 앞의 어떤 것도 실행되지 않습니다 — 출력도, 부수 효과도 없습니다 — 그래서 위 예시의 `x = 10`은 결코 실행되지 않습니다. 검사가 트리 전체를 스캔하므로 실행되지 않는 분기의 차단 구문(`if false then SHELL(...) end`)도 스크립트를 거부시키고, `thread` spawn을 통해서만 도달하는 차단 함수(`thread a: blocked_fn()`)도 워커 안이 아니라 로드 시점에 거부됩니다(스펙 v0.13.0의 워커-격리 동작을 대체 — 워커에 도달하지 않습니다). 언어에 간접 호출이 없고(호출 지점은 리터럴 이름) 키워드는 정적이므로 이 스캔은 정확합니다.

같은 스캔은 *모든* 위반을 한 번에 반환하는 **호스트 API**로도 노출됩니다 — 레퍼런스 런타임의 `Engine.validate(source)`, propertee-java의 `interpreter.validate(tree)`, propertee-js의 `visitor.validate(tree)` — 숨김 키워드 구문과 무시된 함수 호출마다 `line L:C: 'X' is not available in this environment` 항목을 하나씩 내며, 스크립트를 실행하지 않고 점검하려는(예: 에디터에서 모든 문제를 보고) 호스트를 위한 것입니다.

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

### 숫자 표시 (스펙 v0.14.0)

숫자는 **ECMA-262 `Number::toString`**으로 렌더링됩니다 — `PRINT`, `TO_STRING`, `JSON_FORMAT`,
배열/객체 내부 렌더링 전부 동일합니다. 실무적으로:

- 같은 값으로 되돌아오는(round-trip) **최단 십진 자릿수** — `10 / 3` → `3.3333333333333335`,
  `0.1 + 0.2` → `0.30000000000000004`. 정합 값은 소수부를 표시하지 않으므로(`5.0`이 아닌 `5`)
  위 표의 규칙이 성립합니다.
- 크기가 `[1e-6, 1e21)` 범위이면 **평문**(비지수) 형식: `0.0001`, `15000000.5`, `6000000000`,
  `123456789012345680000`. 일상 대역 — 타임스탬프, 작은 비율, id — 이 읽기 쉬운 채로 유지되고,
  출력은 유효한 JSON입니다.
- 그 범위 밖은 **지수** 형식으로, 불필요한 가수 소수점 없이 `e+`/`e-`로 표기: `1e+21`, `1e-7`,
  `1e+300`.

> 유효 자릿수는 그 값의 *최단 round-trip* 십진수입니다. 서브노멀 극단(`5e-324` 부근)의 일부 값은
> 호스트 플랫폼의 최단-자릿수 루틴이 한 자리 다를 수 있는 지점으로, 구현 정의이며 컨포먼스
> 스위트 밖입니다. 일반적인 프로그램이 만드는 값은 영향받지 않습니다.

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
| `if`/`loop` 조건에 비불리언 | Condition requires a boolean value |
| 비컬렉션에 `LEN` | LEN() requires a string, array, or object argument |
| 단일 인자 `RANDOM` | RANDOM() requires zero or two arguments |
| 0으로 나누기 | Division by zero |
| 누락된 프로퍼티 | Property 'x' does not exist |
| 배열 범위 초과 | Array index out of bounds |
| 루프 제한 초과 | Loop exceeded maximum iterations (1000) |
| multi 블록 내 전역 쓰기 (워커 또는 monitor 감시 쓰레드) | Cannot assign to global variable '::x' inside multi block |
| 지역 스코프에서 :: 없이 전역 접근 | Variable 'x' is not defined in local scope. Use ::x to access the global variable |
| multi 외부에서 thread | thread can only be used inside multi blocks |
| 결과 키 중복 | Duplicate result key 'x' in multi block |
| 인자 초과 | Function 'foo' expects 2 argument(s), but 3 were provided |
| 혼합 타입 정렬 | SORT() requires all elements to be the same type (number or string) |
| SORT_BY 키 없음 | Property 'x' does not exist in array element at index N |
| 비배열 정렬 | SORT() requires an array argument |
| 범위 step이 양수가 아님 | Range step must be positive |
| 범위 경계가 숫자가 아님 | Range bounds must be numbers |
| 범위 step이 숫자가 아님 | Range step must be a number |
| 의도적 실패 | `FAIL(msg)`은 `msg` 자체를 발생 (스크립트가 정한 텍스트) |
| 비Result에 `UNWRAP` | UNWRAP() requires a Result |
| 메시지 없는 `FAIL` | FAIL() requires a message argument |
| 전부-대문자 함수 정의 | Cannot define function 'X': all-uppercase names are reserved for built-in and host functions |
| 너무 큰 정수 리터럴 | Integer literal out of range: 9999999999 |
| 정수 산술 오버플로 (`+` `-` `*`, 단항 `-`, `FLOOR`/`CEIL`/`ROUND`/`ABS`, `SUM`) | Integer overflow |
| 차단 구문 존재 (숨김 키워드 / 무시된 함수, 위치 무관) | 'X' is not available in this environment |

### 자원 한계

루프 반복 상한은 언어의 일부입니다(기본 1000, 호스트 설정 가능, `infinite`로 해제 — [무한 루프](#무한-루프) 참고). 그 밖의 자원 한계 — 재귀 깊이, 메모리 — 는 **호스트/런타임 재량**입니다: 소진하면 런이 실패하지만 정확한 에러 표면은 구현 정의입니다. 스크립트는 특정 재귀 깊이에 의존하면 안 됩니다.

## 변경 이력

### v0.20.0 — `_ARGS`: 위치 기반 호출 인자

추가적, 비호환 없음(문법 무변경; `_ARGS`가 `_PROPS`에 이어 두 번째 예약 전역이 됨). 호출의
위치 인자 — 레퍼런스 CLI에서는 스크립트 경로 뒤의 모든 것 — 를 문자열 배열 `_ARGS`로
노출합니다: 1-based, 순회 가능, 항상 존재(없으면 빈 배열). 인자는 의도적으로 `_PROPS` 밖에
둡니다(문서화된 순회·덤프 패턴 보존), 호출자가 `_ARGS`라는 프로퍼티를 주입하면 그 값이
이깁니다(`_PROPS`와 동일 우선순위 규칙). 원소는 문자열이고 숫자 변환은 명시적(`TO_NUMBER`) —
명목적 숫자 정체성(v0.14.0)과 일관됩니다.

### v0.19.0 — `multi ... limit K`: multi 블록 동시성 상한

거의 비호환 없음(`limit`이 예약어가 됨 — 식별자로 쓰던 스크립트는 이름 변경 필요, v0.9.0의
`elseif`와 같은 부류). 설계 아크는 `docs/design-draft-multi-limit.md`.

`multi`의 선택적 `limit K` 절이 동시에 실행되는 스레드 수를 제한합니다: 처음 `K`개가 spawn
시점에 시작하고, 스레드가 끝날 때마다 **spawn 순서로** 다음을 결정론적으로 투입합니다. 이로써
잡당 스레드 하나라는 자연스러운 워커 풀이 안전하고 자기-균형적이 됩니다 — 이전에는 잡 N개를
스레드 K개로 돌리는 유일한 방법이 수동 스트라이핑 관용구(스트라이드 산술, 동적 인덱싱, 워커별
슬라이스 함수)였고, 부하 재분배도 동시 `SHELL`/`HTTP` 연산의 상한도 불가능했습니다.

- limit 표현식은 `multi` 진입 시 한 번 평가(텍스트 순서: 전역 스냅샷·설정보다 먼저); 양의
  정수 필수 — 0/음수/소수/비숫자는 런타임 에러이며, 명목적 정체성(v0.14.0)에 따라
  `limit 2.0`도 에러.
- 설정 단계 불변: 인자는 여전히 `thread` 문 시점에 캡처되고 `"running"` 항목이 선등록됨.
  본문 시작만 지연; 대기 스레드는 `"running"`으로 읽힘 — 새 Result status 없음.
- `K >=` spawn 수 ≡ limit 없음; `limit 1` = spawn 순서 순차 실행.
- monitor 감시 쓰레드는 슬롯을 소비하지 않음.

### v0.18.0 — 파일 전체 및 JSON 파일 I/O: READ_FILE, READ_JSON_FILE, WRITE_JSON_FILE

추가적, 비파괴. 파일 I/O 그룹의 대칭을 완성하는 내장 함수 셋 — 모두 그룹의 나머지와 같이
호스트 게이트 대상이며 Result를 반환합니다:

- `READ_FILE(path)` — `WRITE_FILE`에 없던 대응 함수: 파일 전체를 하나의 문자열로(UTF-8, 내용
  그대로). 내용이면 `ok`, 읽기 실패면 `error`. 큰 파일에는 윈도우 방식 `READ_LINES`가 여전히
  적합합니다.
- `READ_JSON_FILE(path)` — 읽기+JSON 파싱 원콜. 파싱된 값 — `JSON_PARSE`와 동일한 변환(객체·
  배열·스칼라·일급 `null`) — 이면 `ok`, 파일을 읽을 수 없거나 유효한 JSON이 아니면 `error`
  (메시지는 읽기 실패 또는 파서의 것). RFC 8259가 허용하는 대로 선행 UTF-8 BOM은 무시합니다.
  파일 개행을 조용히 정규화하고 Result 대신 무관한 위치 지정 에러로 실패하던 3단계
  `JSON_PARSE(JOIN(UNWRAP(READ_LINES(path)), "\n"))` 관용구를 대체합니다.
- `WRITE_JSON_FILE(path, value)` — `READ_JSON_FILE`의 대응 함수: `value`를 `JSON_FORMAT`과
  정확히 같게 직렬화해 뒤에 줄바꿈 하나를 붙여 파일에 씁니다(덮어쓰기; POSIX 텍스트 파일).
  `WRITE_JSON_FILE` → `READ_JSON_FILE` 왕복은 일급 `null`을 포함해 무손실입니다. 끝 줄바꿈
  없는 byte-exact 출력이 필요하면 `WRITE_FILE(path, JSON_FORMAT(value))`를 쓰면 됩니다.

### v0.17.0 — 리터럴 위치 검색: FIND, FIND_FIRST, FIND_LAST

추가적, 비파괴. **1-기반 위치**를 알려주는 리터럴(정규식 아님) 문자열 검색 내장 함수 셋:
`FIND(s, sub)`는 `s`에서 `sub`가 시작하는 *모든* 위치의 배열을 오름차순으로 반환하며,
**겹치는 발생도 포함**합니다 — `FIND("aaa", "aa")` → `[1, 2]`; 발생이 없으면 `[]`.
`FIND_FIRST(s, sub)` / `FIND_LAST(s, sub)`는 첫 / 마지막 위치를 반환하고, 없으면 `0`입니다
(1-기반 인덱싱에서 `0`은 유효한 위치가 될 수 없으므로 `if FIND_FIRST(s, sub) > 0`이 존재 여부
관용구입니다 — 또는 그냥 `CONTAINS`를 쓰면 됩니다). 겹침을 세는 것이 세 함수의 상호 일관성을
지킵니다: `FIND_FIRST`/`FIND_LAST`는 정의상 `FIND`의 첫/마지막 요소이고, `FIND_LAST`는 통상적인
`lastIndexOf`(겹침 스캔)와 일치합니다. 두 인자 모두 문자열이어야 하며, 검색 문자열은
**비어 있으면 안 됩니다** — 빈 `sub`는 런타임 에러입니다(모든 경계가 "일치"하므로 쓸모 있는
위치 목록이 존재하지 않습니다).

### v0.16.0 — monitor는 감시(watchdog) 쓰레드

`monitor` 절이 이름 그대로의 것으로 재명세됩니다: 런타임이 워커들과 나란히 자동으로 생성·관리하는
**감시 쓰레드**입니다([Monitor 절](#monitor-절) 참고). `monitor 500`은 감시 쓰레드가 **iteration
사이에 500ms씩 sleep**한다는 뜻이며(루프 안에서 `SLEEP`을 도는 쓰레드처럼 fixed-delay) — "500ms마다
폴링"이 아닙니다. 감시 쓰레드는 워커 쓰레드와 같은 순수성 규칙을 따르고, 다른 쓰레드들을 **캡쳐
스냅샷**으로 관찰합니다:

- **iteration 스코프**: 각 iteration은 함수 호출처럼 새 지역 스코프에서 실행됩니다 — 본문에서 지역
  할당, 루프, 함수 호출이 이제 허용됩니다(이전에는 *모든* 할당이 런타임 에러). 지역 변수는
  iteration 간에 이월되지 않습니다.
- **워커 순수성**: `::` 전역 쓰기는 워커와 동일한 에러를 냅니다(`Cannot assign to global variable
  '::x' inside multi block. ...`); 전용 "읽기 전용 monitor" 에러는 사라졌습니다. 전역은 `::`로만
  읽을 수 있습니다 — monitor가 접두사 없는 이름으로 전역을 읽을 수 있던 문서화되지 않은
  fallthrough는 제거됩니다(접두사 없는 이름은 함수 안에서와 똑같이 지역입니다).
- **라이브 뷰가 아닌 캡쳐**: 결과 컬렉션 변수는 이제 iteration 시작 시점에 찍은 깊은 복사 스냅샷을
  담으므로, 본문이 중단되더라도 iteration 전체에서 읽기가 일관됩니다; 다음 iteration이 새로
  캡쳐합니다. (중단하는 본문에서만 관측 가능 — iteration별 값은 동일합니다.)
- **불변**: sleep-우선 케이던스, 모든 워커 완료 후 보장되는 최종 iteration, `[MONITOR ERROR]` 보고
  (실패한 iteration은 중간 iteration을 중단시키고, 최종 iteration은 여전히 실행), 설정-지역 불가시
  규칙.

재명세와 함께 이 배치는 **스냅샷 시점도 확정**합니다: 스냅샷은 `multi` 진입 시, 설정 단계 실행
전에 찍힙니다([의미론](#의미론) 참고). 스펙은 원래 "multi 진입 시"라고 명시했고 v1/js는 그렇게
동작했지만, 레퍼런스 런타임이 조용히 설정-후 스냅샷으로 표류해 설정 단계의 `::` 쓰기가 워커에
보였습니다. 레퍼런스를 진입-시점으로 복원; 픽스처 121이 고정합니다.

**마일드하게 breaking**: 그 *에러에 의존*하던 스크립트(현실적으로 없음)나 monitor 안에서 접두사
없이 전역을 읽던 스크립트는 `::`로 바꿔야 합니다. 그 외는 전부 엄격히 더 허용적입니다.
마이그레이션: 예상 없음. 픽스처 32가 전역-쓰기 에러를 다시 고정; 117은 본문의 iteration
지역변수·루프·함수 호출과 캡쳐 읽기를, 118은 중단 하의 캡쳐-대-라이브를, 119는 중첩 `::g.x`
멤버-쓰기 가드(에러·위치·불변 전역)를, 120은 fresh-scope 판별(중간 iteration의 지역변수는 최종
iteration에서 미정의)을, 121은 진입-시점 스냅샷을 고정합니다.

### v0.15.0 — CONTAINS의 배열 멤버십 검사

추가적, 비파괴. `CONTAINS`가 이제 첫 인자로 **배열**도 받아, 둘째 인자가 그 요소이면 `true`를
반환합니다 — `CONTAINS([1, 2, 3], 2)` → `true`. 멤버십은 `==`를 사용하므로 값 기반이고
객체/배열은 깊은 비교이며 타입이 다르면 엄격히 불일치합니다. 기존 문자열-부분검색 형태는 그대로이고,
빌트인은 첫 인자의 타입으로 디스패치합니다.

### v0.14.0 — 숫자 모델과 로드 시점 거부 확정 (마지막 v1.0 게이트 항목)

v1.0 준비 검토의 마지막 열린 코너를 닫습니다(`docs/design-draft-v1.0-gate.md` 항목 4 + 항목 2의
개정). **픽스처가 커버하는 어떤 스크립트도 닿지 않는 코너에서만 breaking.**

- **정수·소수 구분은 명목적(출처 기반)**: 숫자의 종류는 값이 정합인지가 아니라 생산 지점에서
  고정됩니다. `2.0 * 1500000000`은 소수 `3000000000`(오버플로 없음)이고, `2 * 1500000000`(둘 다
  정수)은 오버플로합니다; `.`/`e`/`E`가 있는 토큰의 `JSON_PARSE`/`TO_NUMBER`는 정합이어도
  소수입니다(`"2.0"`, `"2e0"`). 이전에는 v1이 정합 결과를 정수로 재박싱(오버플로마저 조용히
  승격)했고 js는 오버플로가 데이터 의존적이었습니다; 이제 둘 다 레퍼런스와 일치합니다. 정수에 대한
  `SUM`도 오버플로 규칙에 합류합니다.
- **표시는 ECMA-262 `Number::toString`** — `PRINT`/`TO_STRING`/`JSON_FORMAT` 공통: 최단 round-trip
  자릿수, `[1e-6, 1e21)` 범위는 평문, 밖은 지수형(`1e+21`, `1e-7`). 일상 대역(`0.0001`, epoch-ms
  타임스탬프, `6000000000`)이 과학적 표기 누출 없이 평문으로 렌더링됩니다.
- **차단 구문은 로드 시점에 거부**(v0.13.0 항목 2 개정): 숨김 키워드나 무시된 함수를 어디에서든 —
  죽은 분기와 `thread` spawn 포함 — 이름으로 언급하는 스크립트는 아예 실행되지 않습니다; 첫 문장
  전에, 문서 순서상 첫 위반으로 거부됩니다. 호출별 런타임 에러와 v0.13.0 워커-격리 동작을 하나의
  규칙으로 대체합니다: 어디에든 존재하면 그 스크립트는 이 환경에서 무효입니다.

### v0.13.0 — 경계 확정: 정수 범위, spawn 격리, 디스패치 이름

v1.0 준비 리뷰(`docs/design-draft-v1.0-gate.md`)에서 자람: 픽스처 스위트가 덮지 않던 구석을 찔러
보니 세 런타임이 3갈래로 갈렸고, 이제 명세합니다. **그 구석에서만 파괴적** — 픽스처가 덮는 동작은
변하지 않습니다.

- **정수 범위 확정**: 32비트 부호 있는 정수. 범위를 벗어나는 정수 리터럴과 오버플로하는 정수
  산술(`+`, `-`, `*`, 단항 `-`, 그리고 정수를 만드는 `FLOOR`/`CEIL`/`ROUND`/`ABS`)은 런타임
  에러입니다(`Integer literal out of range: …` / `Integer overflow`) — 이전에는 레퍼런스가 조용히
  랩(또는 클램프)하고, v1은 지수 표기 소수로 승격하고, js는 범위 밖 정수를 만들었습니다. 데이터
  변환(`JSON_PARSE`/`TO_NUMBER`)은 계속 소수로 승격합니다 — JSON 왕복은 그대로입니다.
- **`thread` spawn의 차단 함수는 워커 격리**: 숨긴/무시된 함수가 spawn을 통해 호출되면 그 워커만
  실패합니다(`[THREAD ERROR]` + 에러 Result) — 다른 모든 워커 에러와 일관됩니다. 이전에는 v1/js가
  spawn 처리 중 전체 런을 실패시켰습니다.
- **인터프리터 디스패치 이름은 호스트 경계에서도 완전 예약**: `PRINT`, `SLEEP`, `FAIL`, `UNWRAP`
  이름의 외부 함수 등록은 이제 호스트 API 에러입니다(이전: `PRINT`/`SLEEP`은 구현 정의,
  `FAIL`/`UNWRAP`은 조용히 무시).
- 비규범: 자원 한계(재귀 깊이, 메모리)를 호스트 재량으로 명시 문서화; 루프 반복 상한은 기존
  명세 그대로입니다.

### v0.12.0 — 전부-대문자 함수 네임스페이스 예약

스크립트는 더 이상 이름이 전부 대문자인(`^[A-Z][A-Z0-9_]*$`) 함수를 정의할 수 없습니다 — 정의 자체가 정의 위치에서의 런타임 에러입니다 ([예약된 함수 이름](#예약된-함수-이름) 참고). 명명 관례가 보장이 됩니다: ALL-CAPS 호출은 키워드가 언제나 언어의 것이듯 언제나 빌트인 또는 호스트 제공 함수입니다 — 그러면서도 함수로 남습니다(합성 가능, 호스트의 ignored-functions로 차단 가능). 빌트인에 관한 한 v0.11.0 shadowing 규칙의 실질적 필요를 대체합니다: 스크립트 함수와 빌트인의 충돌이 더 이상 존재할 수 없으므로, 미래의 빌트인 추가는 구조적으로 비파괴입니다. 분석: `docs/design-draft-reserved-uppercase-namespace.md` (논의의 발단이었던 `sleep` 키워드 제안의 기각 사유와, [블로킹과 중단](#블로킹과-중단)으로 문서화된 중단 모델도 기록).

**마이그레이션 노트 (breaking):** 스크립트가 정의한 전부-대문자 함수는 이름을 바꾸세요 — 에러가 정의 라인을 지목합니다. 채택 시점의 코퍼스 조사에서 컨포먼스 스위트 밖에는 그런 정의가 없었습니다. shadow-mocking 패턴(`function SLEEP(...)`으로 빌트인 대체)은 더 이상 불가능합니다 — 호스트 외부 함수 주입 또는 소문자 래퍼를 쓰세요. 변수 이름은 영향받지 않습니다.

### v0.11.0 — 함수 이름 해석 확정

함수 호출이 이제 명세된 순서로 해석됩니다 — 호스트 차단 검사 → 스크립트 정의 함수 → 빌트인/외부 함수 ([이름 해석](#이름-해석) 참고) — 즉 모든 런타임에서 스크립트가 정의한 함수가 같은 이름의 빌트인·외부 함수를 가립니다. 이전에는 구현 정의였습니다: 레퍼런스 런타임은 원래 스크립트 함수를 먼저 해석했지만, v1/js 런타임은 빌트인을 먼저 해석했습니다(그곳에선 스크립트 자신의 `OK`, `LEN` 등이 조용히 빌트인으로 해석됨). 스크립트-함수-우선 확정으로 향후 빌트인 추가가 진정한 비파괴가 됩니다.

**마이그레이션 노트 (v1/js 런타임만):** 빌트인 이름으로 함수를 정의하고 *빌트인이 이기는 것에 의존하던* 스크립트는 그 함수의 이름을 바꿔야 합니다. 문법·키워드 변경 없음; 기존 픽스처는 byte 동일.

### v0.10.0 — Result 승격 (`FAIL`/`UNWRAP`)과 genuine Result

새 빌트인 5종 — `FAIL`, `UNWRAP`, `OK`, `ERR`, `IS_RESULT` — 과 *genuine Result* 출처 규칙 ([Genuine Result와 `FAIL`, `UNWRAP`](#genuine-result와-fail-unwrap) 참고). Result 패턴은 복구 가능한 에러를 다룹니다; 이 배치는 빠져 있던 **승격** 방향을 추가합니다: 스크립트가 이제 에러를 치명적이라고 선언할 수 있고(`FAIL`), `UNWRAP`은 검사-후-승격 체인을 호출 하나로 압축합니다. `OK`/`ERR`는 genuine Result를 생성하며(구조화된 결과 반환과 Result 반환 호출의 mock 작성용), `IS_RESULT`는 출처를 관찰합니다.

**비파괴**: 문법·키워드 변경 없음; 기존 동작 변경 없음; 기존 픽스처는 byte 동일. `OK`/`ERR`/`IS_RESULT` 이름으로 외부 함수를 등록해 둔 호스트는 기존 동작을 유지합니다(등록이 새 빌트인을 가림); 반면 외부 등록된 `FAIL`/`UNWRAP`은 빌트인에 가려집니다 — `PRINT`/`SLEEP`처럼 인터프리터가 직접 디스패치하기 때문입니다. *스크립트가 정의한* 함수가 빌트인 이름을 가리는지는 구현 정의입니다(스크립트 함수와 빌트인 중 무엇이 이기는지 런타임마다 다름) — 자체 `OK`/`ERR`/`IS_RESULT` 함수를 정의한 스크립트는 이름을 바꾸세요. `UNWRAP`은 genuine Result만 받습니다 — `UNWRAP`과 상호작용해야 하는 수제 `{"status": ..., "ok": ..., "value": ...}` 리터럴은 `OK(v)`/`ERR(v)`로 교체하세요.

### v0.9.0 — `elseif`

Lua 스타일 `elseif`([#3](https://github.com/flatide/ProperTee/issues/3)): 다분기가 더 이상 `else if ... end` 중첩으로 `end`를 쌓지 않습니다 — 체인 하나에 `end` 하나. 조건은 위에서 아래로 검사되고, 처음 `true`가 된 가지가 이기며 이후 조건은 평가되지 않습니다(따라서 타입 검사도 없음). 평가되는 각 조건에는 엄격 불리언 규칙(spec v0.7.0)이 적용되고, `if` 키워드를 숨기면 체인 전체가 막힙니다.

**마이그레이션 노트:** `elseif`는 이제 예약어입니다 — 변수·함수 이름으로 쓰던 스크립트는 이름을 바꿔야 합니다. 기존의 중첩 `else if ... end` 체인은 그대로 동작합니다.

### v0.8.0 — 일급 `null`

`null`이 일곱 번째 값 타입이 되었습니다([#4](https://github.com/flatide/ProperTee/issues/4)). JSON 무손실 왕복을 위한 것입니다 — JSON은 ProperTee의 중심이고 `null`은 표준이자 의미 있는 JSON 값인데, 이전에는 표현할 수 없었습니다(`JSON_PARSE`가 `{}`로 뭉갰고, `JSON_FORMAT`은 `null`을 낼 방법이 없었습니다).

설계 원칙은 **암묵적 null 금지(no implicit null)** 입니다: 언어 자체는 절대 `null`을 만들지 않으므로(생략 인자·bare `return`은 여전히 `{}`), 변수가 뜻하지 않게 nullable이 되지 않습니다 — `null`은 `null` 리터럴 또는 데이터(`JSON_PARSE`, 호스트 주입 값)로만 유입됩니다. 유입된 뒤에는 불활성 데이터입니다: 동등 비교와 `TYPE_OF`(→ `"null"`)는 동작하고, 조건·논리·산술·멤버 접근은 런타임 에러입니다(spec v0.7.0의 엄격성이 그대로 적용). null 전파는 없습니다.

**마이그레이션 노트:**

- **`null`은 이제 예약어입니다.** `null`을 변수·함수 이름으로 쓰던 스크립트는 이름을 바꿔야 합니다(이전에는 일반 식별자로 파싱).
- **`JSON_PARSE`가 JSON `null`을 더 이상 `{}`로 정규화하지 않습니다.** 파싱된 필드를 `== {}`로 비교해 JSON `null`을 감지하던 코드는 `== null` 비교로 바꿔야 합니다. JSON에 실제로 `{}`인 필드는 영향이 없습니다.

### v0.7.0 — breaking 변경 배치

다섯 개의 breaking 변경([#1](https://github.com/flatide/ProperTee/issues/1), [#2](https://github.com/flatide/ProperTee/issues/2), [#5](https://github.com/flatide/ProperTee/issues/5), [#6](https://github.com/flatide/ProperTee/issues/6), [#7](https://github.com/flatide/ProperTee/issues/7))을 한 번에 묶어 스크립트 이관이 1회로 끝나도록 했습니다. **마이그레이션 노트:**

- **조건 엄격화** (#1): 비불리언 `if`/`loop` 조건은 이제 런타임 에러(`Condition requires a boolean value`)입니다. 이전에는 조용히 거짓 취급 — `if LEN(arr) then`은 절대 실행되지 않았지만 이제 시끄럽게 실패합니다. 명시적 비교를 쓰세요(`if LEN(arr) > 0 then`).
- **`and`/`or` 단축 평가** (#2): 좌→우로 평가하며 결과가 결정되는 즉시 중단합니다 — `false and X` / `true or X`는 `X`를 부수효과 포함 평가하지 않습니다. `if HAS_KEY(obj, "k") and obj.k == 1 then` 가드가 가능해집니다. 피연산자 타입 에러는 이제 실제 평가된 피연산자의 타입만 보고합니다(`Got number and number`가 아니라 `Got number`).
- **`RANDOM(max)` 제거** (#5): 단일 인자 형태(0 ~ max−1, 배타)는 포함 규약인 2-인자 형태와 충돌했습니다. 단일 인자 호출은 런타임 에러이며, 기존 의미는 `RANDOM(0, max - 1)`로 대체하세요.
- **`SLICE(arr, start, count)`** (#6): 제3인자가 이제 **count**이며 `SUBSTRING`·`READ_LINES`와 통일됩니다. 기존 제3인자는 실질적으로 1-기반 *포함* end였으므로(이전 스펙의 "end는 배타적"은 0-기반 내부 경계 서술) `SLICE(a, s, e)` → `SLICE(a, s, e - s + 1)`로 이관하세요.
- **`LEN` 엄격화** (#7): 숫자·불리언에 `LEN`은 조용한 `0` 반환 대신 런타임 에러(`LEN() requires a string, array, or object argument`)입니다.

### v0.6.0

- **HTTP 내장 함수**: `HTTP_GET(url, [options])`, `HTTP_POST(url, body, [options])`, 범용 `HTTP(method, url, [options])`. 호스트 제공 기능(`PlatformProvider`). `value`가 `{status, body, headers}`인 Result 반환; `ok`는 2xx일 때만 true, 전송 실패 시 `{status: 0, body: <메시지>, headers: {}}`.

### v0.5.0

- **`_PROPS` 예약 객체**: 호스트가 주입한 모든 프로퍼티를 하나의 객체 `_PROPS` 로도 접근할 수 있습니다(예: `PRINT(_PROPS)`, `JSON_FORMAT(_PROPS)`, `KEYS(_PROPS)`, `_PROPS.a`). 개별 키는 그대로 직접 접근 가능하며, 입력 전체를 덤프·순회·전달할 수 있습니다. 함수/`multi` 설정 내부에서는 `::_PROPS` 사용. 입력에 `_PROPS` 키가 있으면 그 값을 그대로 사용합니다.

### v0.4.0

- **파일 I/O 내장 함수**: `FILE_EXISTS()`, `FILE_INFO()`, `READ_LINES()`, `WRITE_FILE()`, `WRITE_LINES()`, `APPEND_FILE()`, `MKDIR()`, `LIST_DIR()`, `DELETE_FILE()`. `READ_LINES`는 1-based offset과 count 제한으로 전체 파일을 메모리에 로드하지 않음. 모든 I/O 함수는 Result 패턴 사용.
- **문자열 매칭 내장 함수**: `CONTAINS()`, `STARTS_WITH()`, `ENDS_WITH()` 단순 검사. `MATCHES()`와 `REGEX_FIND()` 정규식. `REPLACE()` 문자열 치환.
- **객체 확장**: `VALUES()`, `ENTRIES()`, `MERGE()`, `REMOVE_KEY()`.
- **JSON 내장 함수**: `JSON_PARSE()`는 JSON 문자열을 ProperTee 값으로 변환 (JSON `null` → `{}`). `JSON_FORMAT()`은 값을 JSON 문자열로 변환.
- **환경 변수**: `ENV(name, [default])`로 환경 변수 읽기. 미설정 시 `{}` 반환.
- **타입 조회**: `TYPE_OF()`는 타입 이름을 문자열로 반환.
- **문자열 이스케이프 처리**: 문자열 리터럴이 모든 컨텍스트(식, 객체 키, 프로퍼티 접근)에서 이스케이프 시퀀스(`\"`, `\\`, `\n`, `\t`, `\r`)를 처리.
- **PlatformProvider**: ENV와 파일 I/O는 호스트가 제공하는 `PlatformProvider`를 통해 동작. 미제공 시 unsupported 에러 반환.
- **스크립트 확장자**: `.pt` → `.tee`로 변경.

### v0.3.0

- **호스트 환경 제한**: `setHiddenKeywords()`로 언어 키워드를 숨기고 (`if`, `loop`, `function`, `multi`, `thread`, `debug`), `setIgnoredFunctions()`로 내장/외부 함수 호출을 차단합니다. 사용 시 런타임 에러 발생.
- **`SHELL()`과 `SHELL_CTX()` 내장 함수**: 스크립트에서 셸 명령을 실행합니다. `SHELL(cmd)`로 단일 명령, `SHELL(ctx, cmd)`로 `SHELL_CTX(cwd[, env])`에서 받은 컨텍스트로 작업 디렉토리와 환경 변수를 제어. 비동기 실행 — multi 블록에서 셸 명령이 실행되는 동안 다른 스레드는 계속 실행됩니다.
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
