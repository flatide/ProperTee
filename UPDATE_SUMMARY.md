# ProperTee v2.3 업데이트 완료

**최종 업데이트**: MONITOR 블록 추가 (2026-01-31)

## ✅ 최신 변경사항 (v2.3)

### 주요 기능 추가
1. **`monitor` 블록 추가**: 병렬 실행 중 진행 상황 실시간 모니터링
   - 문법: `multi ... monitor INTERVAL ... end`
   - 밀리초 단위 주기적 실행
   - 공유 변수와 전역 변수 읽기 전용 접근
   - 모든 작업 완료 후 최종 실행 보장
   
2. **monitor 블록 특징**
   - 더티 리드(dirty read): 잠금 없이 변수 읽기
   - 비차단(non-blocking): 메인 작업에 영향 없음
   - 읽기 전용: 변수 수정 불가, 출력 및 계산만 가능
   - 결과 변수(r1, r2 등) 접근 불가
   
### 업데이트된 예제

#### 병렬 실행 + 모니터링 (v2.3)
```propertee
shared counter = 0

thread increment() uses counter do
    SLEEP(1000)
    counter = counter + 1
    return counter
end

multi
    increment() -> r1
    increment() -> r2
monitor 500
    PRINT("진행 중... counter =", counter)
end

PRINT("Results:", r1, r2)  // 1, 2
PRINT("Counter:", counter)  // 2
```

#### 진행률 추적 예제
```propertee
shared processed = 0
shared total = 100

thread process(item) uses processed do
    doWork(item)
    processed = processed + 1
end

multi
    loop i in items do
        process(i)
    end
monitor 1000
    percent = (processed / total) * 100
    PRINT("Progress:", percent, "%")
end
// 1초마다 진행률 출력
// 모든 작업 완료 후 "Progress: 100%" 출력 보장
```

## ✅ 완료된 모든 작업

### 1. LANGUAGE_SPEC.md 생성 및 업데이트
**위치**: `grammar/LANGUAGE_SPEC.md`

완전한 언어 명세 문서 생성:
- 렉시컬 요소 (키워드, 식별자, 리터럴)
- 데이터 타입 시스템 (1-based 인덱싱)
- 연산자 우선순위
- 문장 구조
- 표준 라이브러리 명세 (필수/선택 함수)
- 구현 제약사항
- 보안 고려사항
- **주석 명세**: 한 줄 주석(`//`)과 블럭 주석(`/* */`) ✅
- **사용자 정의 함수 명세**: `function` 키워드, 재귀, 스코프 규칙 ✅
- **병렬 실행 및 쓰레딩**: `shared`, `uses`, `parallel` 키워드 ✅
- **1-based 인덱싱**: 배열 첫 번째 요소는 `.1` ✅

### 2. 문법 파일 업데이트
**ProperTee.g4**:
- `K_NULL # NullAtom` 포함 확인
- `loop` 기반 반복문 (infinite 키워드 지원)
- 모듈로 연산자(`%`) 확인
- `infinite` 키워드 확인 (loop 전용)
- 블럭 주석 렉서 규칙 추가: `BLOCK_COMMENT : '/*' .*? '*/' -> skip ;` ✅
- **사용자 정의 함수**: `K_FUNCTION`, `K_RETURN` 키워드 추가 ✅
- **functionDef 규칙**: `function name(params) do ... end` ✅
- **return 문**: `return expression?` ✅
- **병렬 실행**: `K_SHARED`, `K_USES`, `K_PARALLEL` 키워드 추가 ✅
- **sharedDecl 규칙**: `shared var1, var2 = init` ✅
- **parallelStmt 규칙**: `parallel ... end` ✅
- **usesClause 규칙**: `uses res1, res2` ✅
- **1-based 인덱싱 주석**: ArrayAccess 주석 업데이트 ✅

### 3. 문서 업데이트

#### README.md ✅
- 특징에 "통합 반복문" 추가
- 특징에 "1-based 인덱싱" 추가 ✅
- 특징에 **"사용자 정의 함수"** 추가 ✅
- 특징에 **"병렬 실행"** 추가 ✅
- "주석 지원" 특징 추가
- 빠른 예제에 함수 정의 예제 추가 ✅
- 빠른 예제에 **병렬 실행 예제** 추가 ✅
- LANGUAGE_SPEC.md 링크 포함

#### grammar.md ✅
- atom에 `"null"` 추가
- 키워드: `loop`, `infinite`, **`function`, `return`, `shared`, `uses`, `parallel`** 추가 ✅
- 반복문 섹션: `loop_statement`
- **함수 정의 섹션 추가** (3.4절) ✅
- **공유 변수 선언 섹션 추가** (3.5절) ✅
- **병렬 실행 섹션 추가** (3.6절) ✅
- **USES 절 섹션 추가** (3.7절) ✅
- **흐름 제어에 return 추가** (3.3절) ✅
- 모듈로 연산자 `%` 추가
- 주석 섹션 추가
- 전체 EBNF에 shared_decl, parallel_stmt, uses_clause 추가 ✅
- **1-based 인덱싱 명시** ✅

#### bnf.md ✅
- atom에 `"null"` 추가
- `loop_statement`로 통일
- **`<function-definition>` 규칙 추가** ✅
- **`<parameter-list>` 규칙 추가** ✅
- **`<uses-clause>` 규칙 추가** ✅
- **`<shared-declaration>` 규칙 추가** ✅
- **`<parallel-statement>` 규칙 추가** ✅
- **flow_control에 return 추가** ✅
- 키워드 목록: **`function`, `return`, `shared`, `uses`, `parallel`** 추가 ✅
- 모듈로 연산자 `%` 추가
- 주석 섹션 추가

#### docs/index.html ✅
- JavaScript 예제 업데이트 (loop 문법)
- 키워드 리스트: **`function`, `return`, `shared`, `uses`, `parallel`** 추가 ✅
- 내장 함수 목록 최신화
- **배열 인덱스를 1-based로 변경** ✅
- **병렬 실행 예제 추가** ✅

#### guide.md ✅
- 5.2절: "Loop: 조건 반복"
- 5.3절: "Loop: 값 반복"
- 7절: "주석" 섹션 추가
- 실전 패턴 (8절로 변경)
- **배열 인덱스 예제를 1-based로 변경** ✅

#### LANGUAGE_SPEC.md ✅
- 사용자 정의 함수 명세 추가
- return 문 명세 추가
- **배열 인덱싱을 1-based로 명시** ✅
- **프로퍼티 접근 예제를 1-based로 변경** ✅

### 4. 예제 파일 업데이트

#### examples/02_property_access.pt ✅
- API 응답 처리 예제 업데이트
- **배열 인덱스를 1-based로 변경** ✅
- **주석 추가: 1-based 인덱싱 명시** ✅

#### examples/03_control_flow.pt ✅
- `while` → `loop` (조건 반복)
- `for` → `loop` (값/키-값 반복)
- 15개 이상의 반복문 업데이트

### 5. 가이드 업데이트 (guide.md)
- 5.2절: "Loop: 조건 반복"
- 5.3절: "Loop: 값 반복"
- 7절: "주석" 섹션 추가
- 실전 패턴 (8절로 변경)

---

## 📊 변경 통계

### 파일 변경
- **신규**: 2개 (LANGUAGE_SPEC.md, UPDATE_SUMMARY.md)
- **업데이트**: 9개
  - README.md ✅ (함수 특징 추가)
  - grammar.md ✅ (함수 정의 섹션 추가)
  - bnf.md ✅ (함수 정의 규칙 추가)
  - guide.md ✅
  - docs/index.html ✅ (function, return 키워드 추가)
  - examples/02_property_access.pt ✅
  - examples/03_control_flow.pt ✅
  - examples/04_real_world.pt ✅
  - UPDATE_SUMMARY.md ✅

### 구문 변경
- `while` → `loop`: ~5개
- `for` → `loop`: ~25개
- **총 30개 이상**의 반복문 업데이트

### 문법 추가
- **블럭 주석**: `/* */` ✅
- **모듈로 연산자**: `%` ✅
- **infinite 키워드**: 무한 루프 (loop 전용) ✅
- **사용자 정의 함수**: `function`, `return` 키워드 ✅
- **재귀 함수 지원**: 함수 내 자기 호출 가능 ✅
- **1-based 인덱싱**: 배열 첫 번째 요소는 `.1` ✅
- **병렬 실행 및 쓰레딩**: `shared`, `uses`, `parallel` 키워드 ✅
  - 공유 변수 선언 (`shared`)
  - 함수의 공유 자원 명시 (`uses`)
  - 병렬 블록 실행 (`parallel...end`)
  - 자동 데드락 방지 (알파벳 순 잠금)

---

## 🎯 ProperTee v2.0 문법 요약

### 키워드
```
if then else end
loop in do infinite
break continue
function thread return
shared uses multi monitor    ← 병렬 실행 + 모니터링
not and or
true false null
```

### 주석
```propertee
// 한 줄 주석

/* 블럭 주석 */

/*
 * 여러 줄
 * 주석
 */
```

**주의**: 블럭 주석은 중첩되지 않습니다.

### 함수 정의
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

// 스크립트 조기 종료
config = loadConfig()
if config == null then
    return null    // 스크립트 전체 종료
end
```

**주의**: 함수는 호스트 언어의 스택 제한을 받습니다. 함수에는 `infinite` 키워드를 사용할 수 없습니다.

### 병렬 실행
```propertee
// 공유 변수 선언
shared counter = 0
shared data = []

// 쓰레드 (병렬 실행 가능)
thread increment() uses counter do
    counter = counter + 1
    return counter
end

thread addData(value) uses data do
    data = PUSH(data, value)
    return data
end

// 병렬 실행 블록 + 모니터링
multi
    increment() -> r1
    increment() -> r2
    addData(10)
    addData(20)
monitor 500
    PRINT("진행 중... counter =", counter, "data size =", LEN(data))
end

PRINT("Counter:", counter)  // 2
PRINT("Results:", r1, r2)   // 1, 2
PRINT("Data:", data)        // [10, 20]
```

**특징**:
- `thread`: 병렬 실행 가능한 쓰레드 선언 (`function`과 구분)
- `shared`: 전역 스코프에서 공유 변수 선언
- `uses`: 쓰레드가 접근하는 공유 자원 명시
- `multi...end`: 쓰레드 호출을 병렬로 실행
- `monitor INTERVAL`: 밀리초 단위로 실행 중 상태 모니터링 (읽기 전용)
- `->` 연산자: 병렬 실행 결과를 변수에 할당
- **자동 데드락 방지**: 자원을 알파벳 순으로 잠금
- **쓰레드 안전**: 명시적 선언으로 안전한 동시 실행
- **비차단 모니터링**: 메인 작업에 영향 없이 진행 상황 관찰

### 반복문
```propertee
// 조건 반복 (while-style)
loop condition do
    ...
end

// 값 반복 (for-each)
loop value in collection do
    ...
end

// 키-값 반복
loop key, value in collection do
    ...
end

// 무한 루프
loop condition infinite do
    ...
end
```

### 연산자
- **산술**: `+`, `-`, `*`, `/`, `%`
- **비교**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **논리**: `and`, `or`, `not`
- **프로퍼티**: `.`, `.$`, `.$()`

### 연산자 우선순위 (낮음 → 높음)
1. `or`
2. `and`
3. 비교 연산자
4. `+` `-`
5. `*` `/` `%`
6. 단항 `-`, `not`
7. `.` (프로퍼티 접근)

### Atom (원자 표현식)
- Number, String, Boolean, **Null**
- Object `{}`, Array `[]`
- Function call, Variable, `(expression)`

### 배열 인덱싱
- **1-based**: 첫 번째 요소는 `.1`
- 예: `arr = [10, 20, 30]` → `arr.1 = 10`, `arr.2 = 20`, `arr.3 = 30`
- 주의: `arr.0`은 에러 발생

---

## 🔄 마이그레이션 가이드

### 구 문법 (v1.x) → 신 문법 (v2.0)

```propertee
# Before (v1.x)
while condition do
    ...
end

for item in items do
    ...
end

for key, value in object do
    ...
end

# After (v2.0)
loop condition do
    ...
end

loop item in items do
    ...
end

loop key, value in object do
    ...
end
```

---

## 📁 최종 문서 구조

```
ProperTee/
├── README.md                     ✅
├── grammar/
│   ├── ProperTee.g4             ✅
│   └── LANGUAGE_SPEC.md         ✅ 신규
├── grammar.md                    ✅
├── bnf.md                        ✅
├── guide.md                      ✅
├── examples/
│   ├── 02_property_access.pt    ✅
│   ├── 03_control_flow.pt       ✅
│   └── 04_real_world.pt         ✅
└── docs/
    └── index.html                ✅
```

---

## 🎉 완료!

모든 파일이 **ProperTee v2.0** 문법으로 일관되게 업데이트되었습니다.

### 주요 개선사항
1. ✅ **통합 반복문**: `loop` 키워드로 문법 일관성 향상
2. ✅ **Null 지원**: K_NULL atom 포함 확인
3. ✅ **완전한 명세**: LANGUAGE_SPEC.md 생성
4. ✅ **일관된 예제**: 모든 예제와 문서 동기화
5. ✅ **블럭 주석**: `/* */` 문법 추가 및 전체 문서화
6. ✅ **모듈로 연산자**: `%` 연산자 추가

### 문법 기능 완성도
- ✅ 조건문 (`if-then-else-end`)
- ✅ 통합 반복문 (`loop`, `loop infinite`)
- ✅ 흐름 제어 (`break`, `continue`, `return`)
- ✅ 사용자 정의 함수 (`function`, 재귀 지원)
- ✅ 프로퍼티 접근 (`.`, `.$`, `.$(`)
- ✅ 산술/논리/비교 연산자 (`+`, `-`, `*`, `/`, `%`, `and`, `or`, `not`, 비교)
- ✅ 리터럴 (Number, String, Boolean, Null, Object, Array)
- ✅ 함수 호출 (내장/사용자 정의)
- ✅ 주석 (한 줄 `//`, 블럭 `/* */`)

### 주요 제약 및 동작
- **Loop 제한**: 기본 1000회, 초과 시 **Runtime Error** (기본값)
  - `infinite` 키워드로 제한 해제 가능
  - `iterationLimitBehavior: 'warn'` 옵션으로 경고 모드 전환 가능
- **재귀 제한**: 호스트 언어(JavaScript) 스택 제한에 의존
  - `infinite` 키워드 사용 불가 (함수에는 적용 안 됨)
  - 깊은 재귀는 스택 오버플로우 가능
- **Return 문**: 함수 내부 및 최상위 스크립트에서 사용 가능
- **스코프**: 함수 내 로컬 스코프, 외부 전역 변수 접근 가능

### 다음 단계
- 구현체(visitor)를 `loop`, `function`, `return` 문법에 맞게 업데이트
- JavaScript 번들 재생성 (ANTLR4)
- Playground 테스트
- 함수 정의 및 재귀 테스트
- 스크립트 레벨 return 테스트
