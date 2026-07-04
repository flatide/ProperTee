# 설계 초안 — 스크립트 실패 승격과 호스트 결과 봉투 (`FAIL` / `UNWRAP` / Result envelope)

> **상태: 언어 파트 채택·출하 (2026-07-04) — 스펙 v0.10.0으로 §10 명세(B안 포함)가 그대로 랜딩.** GitHub 이슈는 사용자 결정으로 발행하지 않음(분석은 이 문서가 정본). 호스트 파트(§5 TeeBox 무조건 Result 봉투)는 별도 트랙으로 미착수.

## 1. 배경 — 호스트가 받는 세 가지 결과 형태

TeeBox에서 스크립트 실행 결과를 받아가는 호스트(클라이언트 API `/api/client/runs/{runId}/result`) 관점에서 런의 종결은 세 가지로 갈라진다 (TeeBox 1.2.0 실측):

| 경우 | RunStatus | 호스트가 받는 것 |
|---|---|---|
| 1. 스크립트 런타임 에러 | `FAILED` | `errorMessage` 문자열, `resultData` 없음 |
| 2. 미처리 I/O 에러 (Result 객체) | `COMPLETED` | `resultData` = `{status:"error", ok:false, value:"..."}` — Result 모양의 일반 객체 |
| 3. 정상 리턴 | `COMPLETED` | `resultData` = 임의 값 |

케이스 2는 의미상 예외에 해당하지만 ProperTee에는 `throw`가 없으므로 케이스 1과 다른 취급이 되고, 형태상으로는 케이스 3(정상 리턴)에 가깝다. 케이스 2는 Result 객체, 케이스 3은 맨값이라 호스트 처리 코드가 파편화된다.

## 2. 문제 정의 — 파편화의 실체는 "미처리 꼬리(unhandled tail)"

ProperTee의 에러 모델은 의도된 2계층이다:

- **프로그래밍 오류·오용** → 런타임 에러, 즉시 중단 (v0.7.0 loud-failure 철학)
- **환경/I/O 실패** → Result 값 (예상 가능·복구 가능, 스크립트가 판단) — Go/Rust식 errors-as-values

이 모델의 귀결: **I/O 실패가 "런의 실패"인지는 스크립트 의미론이지 런타임 의미론이 아니다.** HTTP 실패를 재시도해 성공하는 스크립트는 `COMPLETED`가 맞고, `ok:false`가 치명적인지는 작성자만 안다. 따라서 케이스 2를 런타임/호스트가 자동 분류하는 것은 원리적으로 불가능하다 — Result는 별도 타입이 아닌 일반 객체라, 미처리 에러 Result와 "정당하게 반환된 Result 모양의 데이터"를 구별할 수 없다.

예외 모델은 미처리 에러를 **전파(propagation)**로 해결하고, Result 모델은 **명시적 에스컬레이션**으로 해결한다. 그런데 ProperTee에는 현재 그 수단이 없다 — 스크립트가 의도적으로 런타임 에러를 일으킬 방법이 없어서(`1 + true` 같은 핵 제외), "이 에러는 치명적"이라고 판단한 스크립트조차 런을 `FAILED`로 만들 수 없다. **이것이 파편화의 실체다: 미처리 꼬리를 접을 곳이 없는 것.** 최소 수정은 전파 기계(throw/try)가 아니라 에스컬레이션 프리미티브의 추가다.

전형적인 고통 패턴 (성공 경로만 추적하는 체이닝):

```
res = a()
if res.ok then
    res = b()
    if res.ok then
        res = c()
    end
end
return res       // 피라미드 중첩 + Result 한 겹 더 쌓인 채 호스트로 + 실패해도 FAILED 불가
```

## 3. 제안 A (언어) — `FAIL(message)` 빌트인

호출 지점의 line:col로 일반 런타임 에러를 발생시킨다. 키워드가 아닌 빌트인이므로 문법 변경 없음.

```
res = HTTP_GET(url)
if not res.ok then
    FAIL("upstream failed: " + res.value.body)
end
```

- 런은 `FAILED` + `errorMessage`로 종결 → 케이스 2→1 변환이 **유일하게 지식이 있는 계층(스크립트)에서 명시적으로** 일어난다.
- 에러 메시지 포맷은 기존 엔진 에러와 동일한 `Runtime Error at line X:Y: <message>` 틀 사용 — v1 스테퍼·컨포먼스 기계가 무변경으로 동작. 엔진 에러와 구별하는 표식은 넣지 않는다(스크립트 관점에서 둘 다 동일한 "치명적 실패"라는 것이 이 모델의 요지). *열린 쟁점: 호스트가 의도적 실패를 구별할 필요가 실제로 생기면 재검토.*
- 인자: 문자열 권장, 비문자열은 `TO_STRING` 코어션.
- 여느 빌트인처럼 `setIgnoredFunctions`로 차단 가능.
- Result가 아닌 일반 검증 실패(입력값 검증 등)에도 쓰이는 범용 프리미티브.

**구현 노트 (2026-07-04, 코드 확인):** 세 런타임 모두 런타임 에러가 이미 네이티브 예외다 — propertee2-java `value/TeeError extends RuntimeException`(엔진 최상단 catch → `Runtime error: ...` 출력), v1 `createError()`→RuntimeException(TeeBox `ScriptExecutor`의 `catch (Throwable)` → `FAILED`+`errorMessage`까지 배관 완비), js `Error`. 따라서 FAIL은 그 예외를 던지는 한 줄이며 새 전파 기계가 불필요하다. 주의 세 가지:

1. **위치 규약** — propertee2-java에서 카탈로그 빌트인의 에러는 위치 없는 `Runtime Error: <msg>` 형식이다(픽스처 67이 고정). `at line X:Y`를 붙이려면 FAIL을 카탈로그가 아니라 **PRINT/SLEEP처럼 인터프리터 디스패치 레벨**에 둔다(`throw err(msg, ctx)` — 기존 선례, 비용 동일).
2. **Result 래핑 경계** — 외부 함수 경로는 throw를 `Result.error`로 변환한다(`callExternal`). FAIL은 반드시 **엔진 빌트인**이어야 하며, 호스트가 `registerExternal("FAIL", ...)`로 흉내 내면 throw가 Result로 삼켜져 승격이 무산된다(에러 Result를 "반환"하는 정반대 동작).
3. **multi 격리 자동 상속** — 워커 안의 FAIL은 기존 규칙대로 해당 스레드만 `{status:"error"}` + `[THREAD ERROR]`로 수집되고 런은 계속된다. 새 전파 규칙 설계 불요. UNWRAP도 동일 메커니즘(모양 검사 후 `res.value` 반환 또는 동일 throw).

## 4. 제안 B (언어) — `UNWRAP(res[, message])` 빌트인 (체이닝 설탕)

`ok:true`면 `res.value` 반환, 아니면 실패 메시지로 FAIL. Rust의 `?`/`expect`에 해당. 별도 에러 메커니즘이 아니라 FAIL로 정확히 탈설탕된다:

```
// UNWRAP(res) ≡
if not res.ok then
    FAIL(TO_STRING(res.value))
end
// ... 그리고 res.value 로 평가
```

입력별 세 갈래: ① Result + `ok:true` → `res.value` 반환, ② Result + `ok:false` → FAIL과 동일한 런타임 에러(의도적 승격), ③ 비Result → 오용 에러 `UNWRAP() requires a Result object`(`LEN(5)` 부류). ②와 ③은 호스트에서 구별되지 않는다(둘 다 `FAILED`+`errorMessage`) — FAIL의 "엔진 에러와 의도적 실패를 구별하지 않는다" 결정과 같은 결.

```
a_val = UNWRAP(a())
b_val = UNWRAP(b())
return UNWRAP(c())        // §2의 피라미드가 세 줄로; 호스트에는 맨값 또는 FAILED만 도달
```

설계 쟁점 (채택 시 확정 필요):

1. **인자 판정 (덕타이핑)** — Result는 스크립트에 도달하면 일반 객체이므로 모양으로 판정할 수밖에 없다. 최소 기준: "boolean `ok`와 `value` 키를 가진 객체". 아니면 런타임 에러 `UNWRAP() requires a Result object`. 맨값 통과(pass-through)는 조용한 오폭을 낳으므로 배제 (loud-failure 일관). **⚠️ §9의 브랜드(B안)를 채택하면 이 쟁점은 브랜드 키 판정으로 대체된다 — 모양 키로 출시 후 브랜드 키로 조이는 것은 파괴적 변경이므로, 배치 채택 시점에 §9의 순서 결정을 먼저 내려야 한다.**
2. **실패 메시지** — `UNWRAP(res)`는 `TO_STRING(res.value)`를 메시지로; `UNWRAP(res, msg)`는 `msg + ": " + TO_STRING(res.value)` (Rust `expect` 관례).
3. **`status:"running"` Result** — `ok:false`이므로 FAIL. multi 진행 중 결과를 UNWRAP하는 것 자체가 프로그래밍 오류이므로 에러가 맞다.

역할 분담: **FAIL = 에스컬레이션 프리미티브 (범용, 필수), UNWRAP = 체이닝 설탕 (실전 해결사).** 둘 다 빌트인이라 한 스펙 버전에 같이 실어도 부담 없음. FAIL만 먼저 가고 UNWRAP을 후속으로 미루는 것도 가능하나, §2의 체이닝 패턴이 흔하므로 동시 도입 권장.

## 5. 제안 C (TeeBox) — 무조건 Result 봉투 (검사 없음)

언어가 이미 통일 봉투 개념을 갖고 있다 — Result `{status, ok, value}` 그 자체. `multi`가 모든 스레드 결과를 이 모양으로 수집하듯, **런 전체를 "스레드 #0"으로 보고 같은 규약을 적용**한다:

| RunStatus | 봉투 |
|---|---|
| `COMPLETED` | `{status:"done", ok:true, value:<resultData 그대로>}` |
| `FAILED` | `{status:"error", ok:false, value:<errorMessage>}` |
| `QUEUED`/`PENDING`/`RUNNING` | `{status:"running", ok:false, value:{}}` |
| `SERVER_RESTARTED` | `{status:"error", ok:false, value:"server restarted"}` |

- **추가적(additive)**: 기존 필드/엔드포인트 유지, 새 필드 또는 새 뷰로 노출 → 기존 클라이언트 비파괴.
- 호스트 클라이언트 코드는 항상 `env.ok ? use(env.value) : handle(env.value)` 한 모양.
- 이중 래핑(`env.value`가 또 Result)은 **스크립트가 일부러 Result를 반환한 경우에만** 나타나며, 이는 파편화가 아니라 정당한 용도다: FAIL/UNWRAP 경로는 `errorMessage`가 문자열이라 구조화된 에러 정보(예: HTTP Result의 `{status, body, headers}`)가 납작해진다. 호스트가 에러의 **구조**를 원하면 스크립트는 Result를 데이터로 반환하고(`COMPLETED` + `env.value.ok` 검사), **메시지**로 충분하면 UNWRAP으로 승격한다 — 두 경로의 역할 분담.

## 6. 검토 후 배제한 대안들

| 대안 | 배제 근거 |
|---|---|
| **`throw` / `try-catch`** | 예외 부재는 이 언어의 기능(숨은 되감기 없음). `multi` 워커 경계의 전파 문제는 이미 Result 수집 `{status:"error"}`가 답. 문법·스펙·컨포먼스 비용 대비 이득 없음. 상세 검토는 아래 §6.1. |
| **버려진 `ok:false` Result 자동 승격 (must_use 의미론)** | "검사됐는가"를 동적·비국소적으로 추적해야 하고, 결과를 안 보는 게 정당한 fire-and-forget(`WRITE_FILE` 등)에서 오폭. 결정론·byte-parity 스토리와도 상충. |
| **호스트의 `resultData` 모양 검사 (sniffing → FAILED 뒤집기)** | `{"ok": false}`를 데이터로 반환하는 스크립트가 갑자기 실패하고, 배열 속에 묻힌 에러 Result는 놓치고, 스크립트 작성자 몰래 의미가 바뀜. 불건전. |
| **최상위 리턴 조건부 패스스루** ("Result 모양이면 그대로, 아니면 래핑") | 겉보기 일관성은 있으나 판정 자체가 불가능: ① **프록시 시나리오** — TeeBox 스크립트가 다른 TeeBox 런의 결과(그 자체가 Result 봉투)를 받아 그대로 반환하면 안쪽 런의 `ok:false`가 바깥 런의 실패로 오판됨. 이 생태계에선 가설이 아니라 기본 동작. ② **모양 민감성** — 정확 일치/superset 어느 규칙이든 자의적이고, 데이터에 필드 하나 추가가 호스트 계약을 소리 없이 뒤집음. ③ v0.7.0(truthiness 제거)·v0.8.0(no implicit null)이 걷어낸 "값의 모양에 따라 조용히 달라지는 동작" 부류의 재도입. **일관성은 조건부 패스스루가 아니라 무조건 래핑(§5)에서 나온다 — 검사가 없으면 오판도 없다.** |
| **Result의 일급 타입 승격** | 단순 배제에서 상세 검토로 격상 — §9. 완전 타입(A안)은 여전히 과잉이나, 브랜드 객체(B안) 중간 경로가 존재하며 UNWRAP 판정 방식과 얽힌 순서 결정이 있다. |

### 6.1 `try ... end` 블록으로 FAIL/UNWRAP을 흡수하는 안 (2026-07-04 검토, 배제)

1. **방향이 반대다.** FAIL/UNWRAP은 **승격**(값→에러, 현재 결손), try는 **포획**(에러→값). 포획 방향은 Result 패턴 자체가 이미 담당한다(`if not res.ok`). try를 도입해도 블록 안에서 "치명적"을 선언할 FAIL은 여전히 필요 — 흡수가 아니라 기껏해야 직교 조합(Rust의 `catch`가 `?`를 흡수하지 못하는 것과 동일).
2. **빌트인 불가능성 = 비용 비대칭.** FAIL/UNWRAP은 평가된 값에 작용하므로 빌트인(비파괴)이 가능하지만, 포획은 평가 자체를 제어해야 하므로 반드시 문법이다 — `CATCH(a())`는 인자 평가 시점에 에러가 먼저 터져 불가능. 따라서 try는 새 예약어(파괴적) + 문법 + 세 런타임(v1은 에러 재라우팅 TryStepper) + 픽스처 + 에디터 풀 코스.
3. **포획 자체가 이 언어에서 위험.** 모든 런타임 에러를 잡으면 프로그래밍 오류까지 삼켜져(가려진 버그) loud-failure 방향에 역행. "FAIL만 잡는 try"는 에러 표식이 필요해 §3의 무표식 결정과 충돌. 불순한 메인 흐름의 부분 부수효과 문제(a() 성공-변이 후 b() 실패 시 상태?)와, 포획된 에러 메시지가 프로그램 값이 되어 메시지 수정이 파괴적 변경이 되는 문제.
4. **"try 안에서 ok:false 자동 승격" 변형(UNWRAP 흡수)**: 스코프 안 모든 값에 대한 모양 검사 — §6의 조건부 패스스루 배제 논거(프록시 오판, 모양 민감성)가 블록 스코프로 일반화되어 그대로 적용 + 같은 식이 try 안팎에서 다른 의미를 갖는 문맥 의존 의미론.
5. **포획의 정당한 용도는 이미 표현 가능 — `multi`.** 워커의 런타임 에러(FAIL 포함)는 `{status:"error", ok:false}`로 수집되고 런은 계속된다. 결정적으로 **워커는 순수(글로벌 쓰기 금지)라 실패 포획이 건전** — 부분 부수효과 문제가 설계상 없다. "에러 포획은 순수성이 보장된 경계에서만"이 이 언어의 기존 답. 포획 인체공학이 실제 고통이 되면 그때 "순수 함수 하나를 Result로 실행하는 설탕"(단일 스레드 multi의 축약) 같은 좁은 제안으로 다룬다.

### 6.2 승격 블록 (`strict do ... end` 류) — 포획 없이 UNWRAP 보일러플레이트만 줄이는 안 (2026-07-04 검토, 보류)

§6.1의 try와 달리 **포획이 없는** 변형: 블록 안에서 Result 반환 호출이 `ok:true`면 자동 언래핑, `ok:false`면 자동 FAIL. 에러는 여전히 종결적이라 §6.1의 3번(부분 부수효과·메시지 값화·TryStepper) 반론은 소멸한다. 훨씬 작은 제안이며, 건전한 설계가 존재한다:

- **트리거는 값의 모양이 아니라 호출 대상의 종류(callee kind)에 키를 건다.** 엔진은 디스패치 시점에 외부 함수·Result 반환 빌트인(SHELL/HTTP/파일 I/O/JSON_PARSE)을 정확히 알므로, "방금 런타임이 Result로 감쌌다"는 사실 기반 — 모양 sniffing이 아니라 오판이 없다.
- **렉시컬 스코프 필수.** 다이내믹 스코프는 같은 함수가 호출 문맥에 따라 다르게 동작하는 원격 작용.

그럼에도 보류한 근거:

1. **사용자 함수 구멍.** 렉시컬 + callee-kind 키의 귀결로, 사용자 함수가 반환하는 Result는 참여 불가(엔진에겐 데이터; 들여다보면 다시 sniffing). I/O를 함수로 감싼 체인(`res = a(); res = b()` — 동기 사례가 바로 이것)에서 무력하고, 블록 안에서도 `UNWRAP(a())`가 필요해진다.
2. **비용.** 새 예약어 = FAIL/UNWRAP만이면 완전 비파괴였을 배치가 파괴적으로 바뀜. 가독성도 트레이드오프 — UNWRAP은 "이 호출이 런을 죽일 수 있다"가 그 줄에 보이지만, 블록은 그 정보가 모드 선언으로 이사.
3. **한계 효용.** UNWRAP이 이미 줄당 비용을 토큰 하나로 줄였다. 블록이 없애는 것은 그 토큰 하나뿐.

**결론: FAIL/UNWRAP을 먼저 보내고, 실사용에서 체인 보일러플레이트가 데이터로 확인되는 고통이면 이 절의 설계(callee-kind 키 + 렉시컬)에서 재검토를 시작한다.** 부기: 다인자 `UNWRAP(a(), b(), c())` 축약은 인자 선평가 때문에 `a()` 실패 후에도 `b()`/`c()`의 부수효과가 실행되어 순차 체인의 단축 기대와 어긋남 — 배제.

## 7. 영향 / 호환성 / 전파

- **비파괴**: 문법 변경 없음, 예약어 추가 없음. 기존 스크립트 의미 불변. 이름 충돌(`FAIL`/`UNWRAP`이라는 외부 함수를 이미 등록한 호스트)만 이론상 존재 — 빌트인 대문자 관례상 무시 가능 수준.
- **스펙**: LANGUAGE.md(+ko) 빌트인 카탈로그 2행 + Result 패턴 절에 에스컬레이션 문단. 마이너 버전 범프(v0.10.0 후보).
- **전파** (design-notes.md §What an accepted change touches 준용): propertee2-java(레퍼런스) + 신규 픽스처(99+: FAIL 정상/차단, UNWRAP ok/error/비Result), propertee-js, propertee-java 1.x(스펙 동기화 정책), editors(vscode/vim 빌트인 하이라이트 목록).
- **TeeBox 봉투(§5)는 별도 트랙** — 언어 변경과 독립적으로 진행 가능하며, 언어 파트 없이 봉투만 도입해도 케이스 1↔3 통일 효과는 있다 (케이스 2 해소에는 언어 파트 필요).

## 8. 요약

| 계층 | 조치 | 해결하는 것 |
|---|---|---|
| 언어 | `FAIL(message)` 빌트인 | 케이스 2→1 명시적 승격 (미처리 꼬리를 접는 수단) |
| 언어 | `UNWRAP(res[, msg])` 빌트인 | 체이닝 피라미드 + Result 적층 + 승격을 한 줄로 |
| 언어 (선택) | Result 브랜드 + `OK`/`ERR` 생성자 (§9 B안) | UNWRAP 판정 엄격화 + 미래 확장(승격 블록·패스스루·must_use)의 문 — 채택 시점에 결정 필요 |
| TeeBox | 무조건 Result 봉투 (런 = 스레드 #0) | 호스트가 다루는 모양을 하나로 (검사·재해석 없이) |

## 9. Result의 타입 승격 재검토 — 일급 타입(A) vs 브랜드 객체(B) (2026-07-04)

§6에서 한 줄로 배제했던 안의 상세 검토. 지금까지의 배제 논거들(§6 sniffing, §6.2 사용자 함수 구멍)의 공통 뿌리가 "Result는 타입이 아니라 모양"이므로, 뿌리를 직접 제거하는 안이다.

**현재 사실 (코드 확인):** 세 런타임 모두 Result는 생성 즉시 일반 객체로 물질화된다 — propertee2-java의 `value/Result`는 `LinkedHashMap` 팩토리일 뿐("surfaced to scripts as a plain ProperTee object")이고 v1·js도 동일 구조. 런타임 내부에서도 "진짜" Result와 스크립트가 위조한 리터럴은 구별 불가. 브랜드는 오늘 존재하지 않는다.

### A안 — 완전한 일급 타입 (`TYPE_OF` → `"result"`)

얻는 것 (배제 논거의 뿌리 제거): ① UNWRAP 판정 정확화(덕타이핑 소멸), ② §6.2 승격 블록의 사용자 함수 구멍 폐쇄, ③ **최상위 리턴 조건부 패스스루(§6 배제)가 건전해짐** — JSON을 거친 데이터는 객체이지 Result가 아니므로(JSON에 Result 타입이 없음) 프록시 오판이 원리적으로 소멸, ④ must_use류 진단 식별 가능.

대가:
- v0.7.0급 파괴 배치: `TYPE_OF` 변화, 리터럴 위조 불가(→ `OK(v)`/`ERR(msg)` 생성자 필요, mock 마이그레이션), 가변성·동등성·deepCopy·JSON 직렬화(단방향: format은 3필드 객체, parse는 객체 — Result는 JSON 왕복하지 않는 프로토콜) 전부 재정의.
- 전파가 null(v0.8.0)보다 훨씬 광범위: multi 수집·외부함수·SHELL/HTTP/파일IO/JSON_PARSE 전 경로, 세 런타임 + v1 스테퍼/Gson.
- **철학적 비용 최대**: 값 우주가 JSON 동형이 아니게 됨 — null도 "순수 데이터"라서 들어왔는데(no implicit null) Result는 첫 **프로토콜 타입**. 임베딩 호스트의 "모든 값이 JSON-ish" 단순성 상실, 선례 위험(다음은 date? handle?).

### B안 — 브랜드 객체 (은닉 타입, 중간 경로)

Result는 겉보기에 계속 객체다 — `TYPE_OF`는 `"object"`, 표시·JSON·멤버 접근·가변성 전부 현행 유지(→ .expected byte-parity 자동 생존). 런타임만 내부적으로 출처를 안다.

- **구현이 쌈**: Java는 `LinkedHashMap` 서브클래스(Map 인터페이스로 기존 경로 전부 무변경 동작, `instanceof`가 브랜드; deepCopy만 서브클래스 보존 분기), js는 Symbol 마커(`JSON.stringify`가 심볼 키를 무시하는 성질이 TEE_NULL 때는 함정이었지만 여기서는 무료 기능).
- 소비자(UNWRAP·§6.2 블록·패스스루·must_use)가 브랜드에 키를 걸면 A안의 이득 ①~④를 거의 전부 획득. 호스트 경계도 in-process에서는 브랜드 생존(TeeBox가 resultData를 instanceof로 식별) → 패스스루 구현 가능.
- 브랜드 규칙: 런타임 생성(빌트인/외부함수/multi 수집)과 `OK`/`ERR`만 브랜드 부여, deepCopy·할당 보존, JSON 통과 시 소멸(프로토콜은 왕복하지 않음 — 정확한 동작), 리터럴은 비브랜드.
- **정직성 반론**: 눈에 안 보이는 출처로 동작이 갈린다 — PRINT로 동일하게 보이는 두 객체가 UNWRAP에서 다르게 동작. 완화: `IS_RESULT(x)` 빌트인으로 관찰 가능화. A안은 이 구별을 TYPE_OF로 정직하게 드러내는 대신 ~10배의 파괴를 지불하는 관계.

### 순서 결정 — FAIL/UNWRAP 채택 시점에 함께 정해야 함

UNWRAP을 모양(덕) 키로 출시한 뒤 브랜드 키로 조이는 것은 그 자체가 파괴적 변경이다:

| | 모양 키 UNWRAP | 브랜드 키 UNWRAP |
|---|---|---|
| 배치 크기 | 빌트인 2개 (FAIL/UNWRAP) | 빌트인 4개 (+`OK`/`ERR`; `IS_RESULT`는 선택) + 브랜드 의미론 |
| mock/위조 리터럴 | 즉시 동작 | UNWRAP이 거부 → `OK`/`ERR`로 작성 (3필드 리터럴보다 짧아 마이그레이션이 이득이기도) |
| 미래 확장 (블록·패스스루·must_use) | 막힘 (전환 시 파괴적) | 전부 열림 |

**권고:** A안은 기각 유지. 단 B안의 존재로 §6의 그림이 바뀐다 — 조건부 패스스루와 §6.2 블록이 "원리적 불가"에서 "브랜드가 있으면 건전"으로 이동. 배치를 채택한다면 **브랜드 포함(B안: 브랜드 키 UNWRAP + OK/ERR)을 기본 권고** — 지금이 UNWRAP을 엄격하게 만들 수 있는 마지막 싼 시점이고, 이미 두 번 제기된 요구(패스스루·승격 블록)의 문을 열어두기 때문. 은닉 상태의 인지 비용이 더 우려되면 모양 키로 시작하되 미래 전환이 파괴적임을 감수한다.

## 10. B안 채택 시 언어 스펙 변경 명세 (검토용, 2026-07-04)

스펙 버전 **v0.10.0** 후보. 문법·예약어 변경 없음(빌트인만 추가) — **거의 비파괴** (호환성 에지는 §10.5).

### 10.1 새 빌트인 5종 — LANGUAGE.md 빌트인 카탈로그 추가 행 (영문 문안 초안)

| Function | Description |
|---|---|
| `FAIL(message)` | Raise a runtime error at the call site with `message` (non-string coerced via `TO_STRING`). The script terminates exactly as with any runtime error — `Runtime Error at line L:C: <message>`; inside a `multi` thread, only that thread fails (collected as `{status:"error"}`). Never returns. |
| `UNWRAP(res[, message])` | If `res` is a genuine Result with `ok` true, evaluates to `res.value`. If `ok` is false (including `"running"`), raises a runtime error with `TO_STRING(res.value)` — prefixed `message + ": "` when the second argument is given. A value that is not a genuine Result is a runtime error (`UNWRAP() requires a Result`). |
| `OK([value])` | Construct a genuine Result `{status:"done", ok:true, value:value}`. Missing argument → `value` is `{}`. |
| `ERR([value])` | Construct a genuine Result `{status:"error", ok:false, value:value}`. Missing argument → `value` is `{}`. `value` may be any type (structured errors allowed, as with HTTP error Results). |
| `IS_RESULT(x)` | `true` if `x` is a genuine Result (runtime-created or `OK`/`ERR`-constructed), else `false`. Accepts any value; never errors. |

### 10.2 "genuine Result" (브랜드) 의미론 — §External Functions and the Result Pattern 확장 문안 (영문 초안)

> **Genuine Results.** Result objects created by the runtime — Result-returning built-ins (`JSON_PARSE`, `SHELL`/`SHELL_CTX`, `HTTP`/`HTTP_GET`/`HTTP_POST`, the file-I/O group), external function calls (sync and async, including timeout errors), and `multi` thread collection entries — and by the `OK`/`ERR` constructors are *genuine Results*: the runtime remembers their origin. A script object literal with the same three fields is a plain object, **not** a genuine Result.
>
> The distinction is invisible to `TYPE_OF` (still `"object"`), display, equality, and JSON serialization; it is observed only by `IS_RESULT` and `UNWRAP`. Copies of a genuine Result (assignment, argument passing, `PUSH`, deep copy) are genuine Results; field mutation does not remove the origin. The origin does not survive JSON: `JSON_FORMAT` renders a genuine Result as the plain three-field object, and nothing inside `JSON_PARSE`d data is a genuine Result (the wrapping Result returned by `JSON_PARSE` itself is genuine).

규칙 요약 (생성/전파/소멸/관찰):
- **생성**: Result 반환 빌트인 · 외부 함수 반환 래핑 · multi 수집 항목 · `OK`/`ERR`. (multi 수집 객체 자체는 일반 객체 — 그 항목들이 genuine.)
- **전파**: 할당·인자 전달·PUSH·deepCopy 보존. 필드 변경(mutation)해도 브랜드 유지 (브랜드는 출처이지 모양 검증이 아님).
- **소멸**: JSON 경계 — `JSON_FORMAT` 출력은 현행과 byte 동일한 3필드 객체, 파싱된 데이터 내부는 절대 genuine이 아님. (프로토콜은 왕복하지 않는다 — no-implicit-null과 같은 결.)
- **관찰**: `IS_RESULT`와 `UNWRAP`만. 그 외 모든 관측 경로(TYPE_OF/표시/동등성)에서 비가시.

### 10.3 명시적 불변 항목

- 문법·예약어·키워드 목록 불변. `TYPE_OF` 반환값 불변(`"object"`). Result 표시 형식·`JSON_FORMAT` 출력·동등성·멤버 접근·가변성 불변. `SHELL(ctx, cmd)`의 SHELL_CTX 자동 언래핑 동작 불변. **기존 96 픽스처 .expected 전부 불변.**
- 기존 스펙 문서의 "check `res.ok == true`" 패턴은 계속 유효 — FAIL/UNWRAP은 추가 선택지.

### 10.4 구현 스케치 (전파 대상별)

- **propertee2-java**: `value/Result` 팩토리가 `LinkedHashMap` 서브클래스(가칭 `TeeResult`) 반환 — Map 인터페이스로 기존 경로 전부 무변경, `instanceof`가 브랜드. `Values.deepCopy`에 서브클래스 보존 분기 1개. FAIL/UNWRAP/OK/ERR/IS_RESULT 중 위치(line:col)가 필요한 FAIL/UNWRAP은 PRINT/SLEEP처럼 인터프리터 디스패치, OK/ERR/IS_RESULT는 PURE 카탈로그.
- **v1 propertee-java**: 동일 서브클래스 전략(TeeNull 때의 TypeChecker 분기 선례) + Gson 직렬화는 Map이라 무변경. IfStepper류 영향 없음(FAIL은 예외 throw뿐).
- **propertee-js**: Result 생성 지점에 Symbol 마커 — `JSON.stringify`가 심볼 키를 무시하므로 표시/JSON 경로 무변경(TEE_NULL 때는 함정, 여기선 무료 기능). deepCopy에 마커 보존.

### 10.5 호환성 에지 (정직 목록)

1. **이름 섀도잉**: 사용자 함수 `function FAIL(...)` 등은 빌트인을 가리므로(디스패치가 사용자 함수 우선 — propertee2 확인, v1 검증 필요) 기존 스크립트는 무변경 동작. 단 호스트가 `registerExternal("FAIL", ...)` 등으로 등록한 외부 함수는 인터프리터 디스패치 레벨(FAIL/UNWRAP)이 선행해 가려짐 — PRINT/SLEEP이 오늘 이미 그런 것과 동일한 선례. 가능성 낮음, 마이그레이션 노트에 명기.
2. **브랜드 비가시성**: PRINT로 동일하게 보이는 두 객체가 UNWRAP에서 다르게 동작할 수 있음 — `IS_RESULT`로 판별 가능함을 스펙과 마이그레이션 노트에 명기.
3. 그 외 관측 가능한 변화 없음.

### 10.6 마이그레이션 노트 문안 (Changelog v0.10.0 초안)

> v0.10.0 — additive: `FAIL`, `UNWRAP`, `OK`, `ERR`, `IS_RESULT` built-ins and the *genuine Result* origin rule. No grammar or keyword changes; no existing behavior changes. Scripts (or hosts) that define/register functions under these five names shadow the new built-ins and keep their existing behavior. Note that `UNWRAP` accepts only genuine Results — replace hand-built `{"status":...,"ok":...,"value":...}` literals with `OK(v)`/`ERR(v)` where they must interoperate with `UNWRAP`.

### 10.7 신규 픽스처 계획 (레퍼런스 99+)

| 픽스처 | 내용 |
|---|---|
| `99_fail` | FAIL 기본/TO_STRING 코어션/`if not res.ok then FAIL(...)` 패턴, 에러 라인 검증 |
| `100_unwrap` | 체인 성공 경로, `ok:false` 승격(1·2인자), running Result 승격 |
| `101_result_brand` | OK/ERR 생성, IS_RESULT 판별(genuine/리터럴/비객체), 브랜드의 할당·deepCopy·multi 수집 생존, JSON 왕복 후 소멸 |
| `102_error_unwrap_nonresult` | 위조 리터럴/맨값에 UNWRAP → `UNWRAP() requires a Result` |
| `103_fail_thread` | multi 워커 안 FAIL → `[THREAD ERROR]` + `{status:"error"}` 수집, 런 계속 |

(+ 키워드/함수 숨김 픽스처에 FAIL 차단 케이스 추가 검토.)

### 10.8 결정 필요 항목 체크리스트 (스펙 확정 전)

1. **생성자 이름**: `OK`/`ERR` (간결, Rust 어휘) vs `RESULT_OK`/`RESULT_ERR` (기존 빌트인 명명 관례에 근접) — 초안은 OK/ERR.
2. **`IS_RESULT` 포함 여부**: 브랜드 관찰가능성 완화책으로 포함 권고 — 초안은 포함.
3. **`FAIL()` 무인자**: 런타임 에러(`FAIL() requires a message`) vs `{}` 코어션("{}") — 초안은 에러(loud).
4. **`ERR` 인자 타입**: 임의 값 허용(HTTP 에러 Result의 구조화 value 선례) vs 문자열 강제 — 초안은 임의 값.
5. **mutation 후 브랜드**: 유지(출처 개념) vs 소멸(모양 검증 개념) — 초안은 유지.
6. **UNWRAP 2인자 메시지 형식**: `msg + ": " + TO_STRING(value)` — 초안 확정치.
7. **버전**: v0.10.0 (첫 additive 단독 배치) — 초안 확정치.

### 10.9 전파 목록 (채택 시)

design-notes.md §What an accepted change touches 준용: 스펙 리포 LANGUAGE.md(+grammar 사본, +ko 수동 번역) → propertee2-java(구현+픽스처 99–103, docs/LANGUAGE.md 내용 동기화) → propertee-js(구현+픽스처 변형, 플레이그라운드 빌트인 목록/하이라이트) → propertee-java 1.x(스펙 동기화 정책) → editors vscode/vim(빌트인 하이라이트 5종) → TeeBox는 별도 트랙(§5 봉투 + 브랜드 기반 패스스루 옵션).
