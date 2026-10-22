# 설계 초안 — 정규식 매치 객체: `REGEX_FIND`와 `REGEX_FIND_ALL`

**상태: 결정·구현 — 스펙 v0.29.0** (propertee2-java 0.38.0, fixture 141–144; propertee-js;
TeeBox 1.38.0). §8의 열린 질문은 권장안대로 정했다(각 항목의 "결정"). 트래커 이슈 없음.
2026-10-22 세션 논의에서 출발했다. `REGEX_FIND`의 `[전체 일치, 그룹1, …]` 배열은 1부터 세는
언어에서 그룹 번호와 인덱스가 하나씩 어긋난다는 지적에서 시작해 다른 언어를 조사했다. 그 결과
사용자 결정으로 범위를 정했다. 매치를 객체로 돌려주고(Julia 방식), 여러 매치를 돌려주는 함수를
따로 두고, 이름 붙은 그룹을 넣는다. BMP 밖 문자에서 두 런타임이 다른 점은 고치지 않고 문서에만
적는다.

## 1. 문제

스펙 v0.28.0의 정의는 한 줄이다.

> `REGEX_FIND(s, pattern)` — Returns array of [fullMatch, group1, group2, ...] or `{}` if no
> match. 1-based array.

세 가지가 불편하다.

1. **그룹 번호와 인덱스가 어긋난다.** 그룹 1이 `.2`, 그룹 2가 `.3`이다.

   ```
   res = REGEX_FIND("2024-01-15", "([0-9]{4})-([0-9]{2})-([0-9]{2})")
   PRINT(res.2)    // 2024 — 그룹 1
   ```

2. **첫 매치만 얻을 수 있다.** 매치의 위치도 돌려주지 않으므로, 스크립트가 "다음 매치"를
   이어서 찾을 방법도 사실상 없다.
3. **이름 붙은 그룹 `(?<year>…)`의 이름이 사라진다.** 두 엔진 모두 문법은 받아들이지만 결과는
   번호로만 나온다.

## 2. 다른 언어

"그룹 0 = 전체 일치"는 정규식의 오랜 관례다. 0부터 세는 언어에서는 그룹 N이 저절로 인덱스 N에
온다: Python `m[1]`, JavaScript `match[1]`, Java `group(1)`, Go `FindStringSubmatch(...)[1]`,
Ruby `m[1]`, PHP `$m[1]`, C# `Groups[1]`, Rust `caps[1]`, Swift `m.1`.

1부터 세는 언어와 도구는 대부분 전체 일치를 따로 떼어 그룹 N을 인덱스 N에 둔다.

| 언어 | 그룹 1 | 전체 일치 |
|---|---|---|
| Lua `string.match` | 첫 반환값 (그룹만 반환) | 그룹이 없을 때만 |
| Julia `match` | `m[1]`, `m.captures[1]` | `m.match` 필드 |
| PostgreSQL `regexp_match` | `[1]` (그룹이 있으면 그룹만) | 그룹이 없을 때만 |
| MATLAB `regexp` | `'tokens'` (그룹만) | `'match'` |
| Excel `REGEXEXTRACT` | 모드 2의 첫 항목 (그룹만) | 모드 0 |
| gawk `match(s, re, arr)` | `arr[1]` | `arr[0]` |
| R `regmatches`, stringr `str_match` | `[2]` | `[1]` |

ProperTee와 같은 모양은 R 정도다. ProperTee에서는 `.0`이 오류이므로 gawk 방식도 쓸 수 없다.

여러 매치는 대부분 함수를 둘로 나눈다: Python `search`/`finditer`, JavaScript `exec`/`matchAll`,
Go `FindStringSubmatch`/`FindAllStringSubmatch`, Julia `match`/`eachmatch`, Lua `match`/`gmatch`.
Python `findall`과 Ruby `scan`은 그룹 개수에 따라 문자열 배열이 되기도 하고 튜플 배열이 되기도
해서 헷갈리기 쉽다. 이 초안은 그 모양을 피한다.

## 3. 제안

### 3.1 매치 객체

```
m = REGEX_FIND("2024-01-15", "(?<year>[0-9]{4})-(?<month>[0-9]{2})")
PRINT(m)
// { "match": '2024-01', "position": 1, "groups": [ '2024', '01' ], "named": { "year": '2024', "month": '01' } }
PRINT(m.groups.1, m.named.month)    // 2024 01
```

| 필드 | 값 |
|---|---|
| `match` | 패턴 전체에 일치한 문자열 |
| `position` | `match`가 시작하는 1부터 세는 위치. FIND, SUBSTRING, LEN과 같은 단위다(§4). 빈 매치는 문자열 끝 바로 뒤(`LEN(s) + 1`)일 수 있다. |
| `groups` | 그룹 1부터 순서대로 담은 배열. `groups.N`이 그룹 N이다. 이름 붙은 그룹도 번호를 가지므로 여기에도 들어간다. 참여하지 않은 그룹은 `{}`(지금과 같음 — no implicit null), 패턴에 그룹이 없으면 `[]`이다. |
| `named` | 이름 붙은 그룹의 이름 → 값. 키는 패턴에 나온 순서(그룹 번호 순)다. 참여하지 않은 그룹은 `{}`, 이름 붙은 그룹이 없으면 `{}`이다. |

- 키 순서는 `match`, `position`, `groups`, `named`로 고정한다. 출력과 `JSON_FORMAT`이 이 순서를 따른다.
- `SUBSTRING(s, m.position, LEN(m.match)) == m.match`가 항상 성립한다.
- 그룹 N의 이름이 NAME이면 `m.groups.N == m.named.NAME`이다.

### 3.2 `REGEX_FIND(s, pattern)` — 첫 매치

첫 매치의 매치 객체를 돌려준다. 매치가 없으면 지금처럼 `{}`이다.

### 3.3 `REGEX_FIND_ALL(s, pattern)` — 모든 매치

매치 객체의 배열을 돌려준다. 매치가 없으면 `[]`이다.

```
loop m in REGEX_FIND_ALL("2026-10-22 2027-01-05", "(?<year>[0-9]{4})-(?<month>[0-9]{2})") do
    PRINT(m.position, m.named.year, m.named.month)
end
// 1 2026 10
// 12 2027 01
```

1. **왼쪽부터, 겹치지 않게** 찾는다. 다음 검색은 앞 매치가 끝난 곳에서 시작한다. 따라서
   `REGEX_FIND_ALL("aaa", "aa")`는 매치가 하나뿐이다. `FIND("aaa", "aa")`가 겹침을 포함해
   `[1, 2]`인 것과 다르며, 스펙에 이 차이를 명시한다.
2. **빈 매치 뒤에는 한 위치 넘어가서** 다시 찾는다. 그래서 빈 문자열에 매치될 수 있는 패턴도
   끝난다. 예를 들어 `REGEX_FIND_ALL("baaac", "a*")`는 1(`""`), 2(`"aaa"`), 5(`""`), 6(`""`)
   위치의 네 매치다.
3. **`^`는 `s`의 맨 앞에서만** 매치된다. 검색을 다시 시작하는 위치마다 매치되지는 않는다.
   `REGEX_FIND_ALL("a\nb", "^.")`는 `"a"` 하나다.
4. 매치가 있으면 `REGEX_FIND(s, p) == REGEX_FIND_ALL(s, p).1`이다.
5. 매치 개수에 상한은 없다(FIND와 같음).

1–3은 Java `Matcher.find`의 반복과 JavaScript `matchAll`(플래그 `g`, `u` 없음)이 이미 같은 방식으로
동작한다. 두 엔진에서 위 예들과 뒤보기, `\b`, 빈 패턴, 참여하지 않은 그룹, 여러 매치에 걸친 이름 붙은
그룹을 실행해 결과가 같음을 확인했다.

### 3.4 오류

- `s`나 `pattern`이 문자열이 아니면 런타임 오류: `REGEX_FIND_ALL() requires a string argument`.
- 패턴이 올바르지 않으면 런타임 오류: `REGEX_FIND_ALL() invalid regex pattern: <pattern>`.
- 매치가 없는 것은 오류가 아니다.
- 메시지는 레퍼런스(Java)의 형식이며 `REGEX_FIND`도 같은 형식이다. JS 런타임의 메시지는 지금 다르다
  (`first argument must be a string`, 패턴 대신 엔진의 설명을 붙임). 이번 변경에서 두 함수 모두
  레퍼런스에 맞춰, fixture로 오류를 고정할 수 있게 한다.

## 4. 패턴 문법 — 문서화만 (동작 변경 없음)

스펙에 "Regular expressions" 하위 절을 새로 두고 다음을 적는다.

- **패턴 문법은 런타임 엔진의 것이다.** Java 런타임은 `java.util.regex`, JavaScript 런타임은
  플래그 없는 ECMAScript `RegExp`를 쓴다. 문자 클래스, 수량자, 그룹, `|`, `^`, `$`, `\b`,
  앞보기·뒤보기, `(?<name>…)`, 역참조 `\1`·`\k<name>`은 양쪽에서 같다.
- **이름 붙은 그룹의 이름**은 ASCII 영문자로 시작하고 영문자와 숫자만 쓰며, 패턴 안에서 한 번만 쓴다.
  - `(?<first_name>…)`처럼 밑줄이 들어간 이름은 Java 런타임에서 잘못된 패턴이다(JS는 받아들인다).
  - 같은 이름을 두 번 쓰면, 다른 대안(`|`) 안이어도 Java 런타임에서 잘못된 패턴이다(최신 JS 엔진은 받아들인다).
- **위치와 길이는 두 런타임 모두 UTF-16 코드 단위로 센다.** LEN, SUBSTRING, FIND가 이미 그렇다.
  이모지 하나는 2다.
- **BMP 밖의 문자**(대부분의 이모지, 일부 한자 확장 문자)는 두 런타임에서 다르게 매치된다.
  - Java는 이런 문자를 `.`이나 `[^…]` 등에서 한 글자로 본다. JS 런타임은 UTF-16의 두 반쪽을 각각
    한 글자로 본다.
  - 그래서 `REGEX_FIND("😀!", ".")`는 Java에서 이모지 전체(`LEN(m.match)`는 2)에, JS에서 그 반쪽(1)에
    매치된다. `REGEX_FIND_ALL`은 매치 개수가 달라진다.
  - 이식성이 필요한 스크립트는 이런 문자가 있는 텍스트에 `.`이나 부정 클래스를 쓰지 말고, 문자를
    직접 적어 매치한다.
  - 고치지 않는 이유: JS에 `u` 플래그를 켜면 `.`은 맞춰진다. 하지만 `a\-b`, `\_`처럼 Java가 받는 패턴을
    거부하고, 서로게이트 쌍 사이의 빈 매치가 사라진다. 예를 들어 `"x😀y"`에 빈 패턴을 쓰면 Java는
    1–5 위치에서 매치되는데 JS `u`는 3을 건너뛴다.

그 밖에도 알려진 차이가 있다. 이번 범위에서는 바꾸지 않고, 스펙에 적을지는 §8-2에서 정한다.

- Java의 `$`는 끝의 줄바꿈 바로 앞에서도 매치된다. `REGEX_FIND("a\n", "a$")`는 Java에서만 매치된다.
- `a{`는 JS에서 문자 그대로 읽히고, Java에서는 잘못된 패턴이다.
- 소유 수량자 `a++`와 인라인 플래그 `(?i)`는 Java에만 있고, JS에서는 잘못된 패턴이다.
- `\A`, `\Z`는 Java에서 입력의 처음과 끝이지만, JS에서는 오류 없이 글자 `A`, `Z`로 읽힌다.

## 5. 호환성과 마이그레이션 — spec v0.29.0, breaking

`REGEX_FIND`의 반환 모양이 바뀌므로 깨지는 변경이다. `REGEX_FIND_ALL`은 새 이름이라 깨지지 않는다
(대문자 이름 예약, spec v0.12.0).

기존 코드는 대부분 바로 실패한다.

- `res.1`, `res.2` 같은 접근은 `Property '1' does not exist` 같은 런타임 오류가 된다(객체의 정수 키는 문자열 키다).
- `SLICE(res, 2)`, `JOIN(res, …)` → 배열이 아니므로 런타임 오류.

조용히 결과가 달라지는 경우가 있어 마이그레이션 노트에 적는다.

- `loop v in res`는 네 필드의 값을 돈다.
- `"…" + res`는 객체의 텍스트를 붙인다.
- `LEN(res)`는 1 + 그룹 수가 아니라 4다.

매치가 없는지 보는 `res == {}`와 `LEN(res) == 0`은 그대로 동작한다.

| v0.28.0 | v0.29.0 |
|---|---|
| `res.1` | `res.match` |
| `res.2`, `res.3`, … | `res.groups.1`, `res.groups.2`, … (또는 `res.named.NAME`) |
| `LEN(res) - 1` (그룹 수) | `LEN(res.groups)` |

기존 자료에서 영향받는 곳은 fixture 81의 REGEX_FIND 부분(인덱스 접근 8곳)과 함수 패널의 REGEX_FIND
샘플이다. playground 예제와 sample 스크립트에는 REGEX_FIND를 쓰는 곳이 없다.

## 6. 기각한 대안

| 대안 | 기각 사유 |
|---|---|
| 배열에서 전체 일치만 빼기 (Lua·PostgreSQL 방식) | 기존 `res.2`가 오류 없이 그룹 2를 가리키게 된다. "조용한 동작 변화보다 시끄러운 실패" 원칙(design-notes)에 어긋난다. |
| `REGEX_FIND`가 모든 매치를 반환 | 매치가 둘 이상이면 기존 `res.2`가 두 번째 매치 객체가 되어, `"x" + res.2` 같은 코드가 오류 없이 틀린 값을 낸다. |
| 함수 하나에 옵션 인자 (`REGEX_FIND(s, p, {"all": true})`) | 인자에 따라 반환 타입이 바뀐다. |
| `REGEX_FIND`를 두고 새 객체 함수 추가 | 깨지지 않지만 같은 일을 하는 함수가 둘이 되고, 어긋난 인덱스가 계속 남는다. 사용자가 반환 모양 변경을 택했다. |
| 인덱스 0에 전체 일치 (gawk) | `.0`은 언어 설계상 오류다. |
| 그룹 수에 따라 모양을 바꾸는 반환 (Python `findall`, Ruby `scan`) | 반환 모양이 패턴에 따라 달라진다. |
| 그룹마다 시작 위치도 반환 | 요청 범위 밖이다. 필요해지면 필드를 추가한다. 다만 객체 전체를 출력하거나 비교하는 코드의 결과가 바뀌는 작은 비호환이다. |

## 7. 구현 계획

- **스펙** (ProperTee): `LANGUAGE.md` 문자열 함수 표에서 REGEX_FIND 행을 고치고 REGEX_FIND_ALL 행을
  추가한다. "Regular expressions" 하위 절(§3–4)과 v0.29.0 Changelog(마이그레이션 포함)도 쓴다. 이어서
  `grammar/LANGUAGE.md` 복사본, `LANGUAGE.ko.md` 번역, propertee-js의 `LANGUAGE.md` 복사본,
  propertee2-java의 `docs/LANGUAGE.md`(내용 동기화)를 맞춘다. 문법(grammar) 변경은 없다.
- **propertee2-java (0.38.0)**:
  - `Builtins`의 REGEX_FIND가 매치 객체를 만든다. 키 순서를 지키는 `LinkedHashMap`을 쓰고, `position`은
    FIND와 같은 정수 표현으로 둔다. `named`는 `Matcher.namedGroups()`(Java 20+)를 그룹 번호 순으로 정렬해 만든다.
  - REGEX_FIND_ALL은 `while (m.find())`로 모은다.
  - `BuiltinsTest`와 fixture를 갱신한다.
- **propertee-js**:
  - REGEX_FIND는 `new RegExp(pattern).exec(s)`, REGEX_FIND_ALL은 `s.matchAll(new RegExp(pattern, 'g'))`다.
    `u`를 붙이지 않아 지금의 문법을 유지한다.
  - `named`는 `match.groups`(프로토타입이 없는 객체)를 일반 객체에 자기 키로 옮겨 만든다.
  - 오류 메시지를 레퍼런스에 맞추고, 번들을 다시 빌드하고, fixture 복사본을 갱신한다.
  - playground 함수 패널에 두 항목(EN/KO 설명, 샘플, 실행 결과)을 넣고, 강조 목록에 REGEX_FIND_ALL을 추가한다.
- **TeeBox (1.38.0)**: 엔진 0.38.0을 가져온다. 편집기 함수 패널 항목과 강조 목록(playground와 같은 줄)을
  갱신하고 CHANGELOG를 쓴다. 사전 검사는 엔진에서 함수 이름을 받으므로 따로 손댈 것이 없다.
- **편집기 (vim, VS Code)**: 지금 강조 목록에 MATCHES와 REGEX_FIND가 없다. MATCHES, REGEX_FIND,
  REGEX_FIND_ALL을 함께 넣는다.
- **propertee-java (Java 7/8)**: 구현하지 않는다(spec v0.13.0에 고정). Changelog에 적는다.
- **fixture** (141번부터):
  - 81: REGEX_FIND 부분을 새 모양으로 갱신한다.
  - 141_regex_find_object: 필드, 이름 붙은 그룹, 참여하지 않은 그룹, 빈 매치의 위치, 객체 전체 출력.
  - 142_regex_find_all: 여러 매치, FIND와 다른 겹침 규칙, 빈 매치, `^`, 매치 없음 `[]`, REGEX_FIND와의
    동등성, 여러 매치에 걸친 이름 붙은 그룹.
  - 143_error_regex_find_old_index: `res.2`가 `Property '2' does not exist`로 실패하는지(마이그레이션 안전장치).
  - 144_error_regex_invalid_pattern: 맞춘 오류 메시지.
  - BMP 밖 문자와 `$`는 런타임마다 달라서 fixture로 고정하지 않는다.

## 8. 열린 질문

1. **필드 이름**: `match`, `position`, `groups`, `named`. 대안으로 `text`, `index`/`start`, `captures`,
   `names`가 있다. 현재 안을 권한다. `position`은 FIND의 용어와 같고, `groups`는 정규식의 일반 용어다.
   **결정**: 현재 안.
2. **다른 문법 차이**(`$`와 끝 줄바꿈, `a{`, Java 전용 구문)를 스펙의 Regular expressions 절에 이식 가능한
   부분집합으로 적을지, 이번에는 BMP만 적을지. **결정**: §4의 차이를 모두 스펙에 적는다(동작은 바꾸지 않음).
3. **잘못된 패턴의 메시지**에 엔진의 설명을 붙일지. 레퍼런스는 패턴만 붙이고, JS는 지금 엔진 설명을
   붙인다. fixture로 고정하려면 레퍼런스 형식이 맞다. **결정**: 레퍼런스 형식. JS 런타임은 MATCHES까지
   세 정규식 함수의 메시지를 모두 맞췄다.
4. **출하 시점**: design-notes는 깨지는 변경을 한 스펙 버전과 한 마이그레이션 노트로 묶으라고 한다.
   지금 대기 중인 다른 깨지는 변경이 없으므로 v0.29.0으로 단독 출하를 권한다. **결정**: v0.29.0 단독.
