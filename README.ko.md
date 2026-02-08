# ProperTee

**ProperTee**는 프로퍼티 기반 데이터 처리를 위한 경량 스크립팅 언어입니다. 직관적인 문법, 강력한 동적 접근 패턴, 협력적 멀티스레딩을 지원하며 — 설정 관리, 데이터 변환, 호스트 애플리케이션 내장용으로 설계되었습니다.

**[온라인 플레이그라운드에서 사용해보기](https://flatide.github.io/propertee-js/)**

## 특징

- **간결한 문법**: Pascal/Lua 스타일 `if-then-end`, `loop-do-end` 블록 구조
- **동적 프로퍼티 접근**: `.$key`, `.$(expr)` 문법으로 런타임 키 평가
- **일급 데이터 구조**: 객체 리터럴 `{}`, 배열 리터럴 `[]`
- **1-기반 인덱싱**: 배열의 첫 번째 요소는 `.1`
- **통합 루프**: `loop` 키워드로 조건, 반복, 무한 루프를 모두 처리
- **사용자 정의 함수**: `function` 키워드로 재사용 가능한 로직 작성
- **협력적 멀티스레딩**: `multi` 블록으로 스레드 순수성이 보장된 안전한 병렬 실행
- **주석**: 한 줄 (`//`) 및 블록 (`/* */`) 주석
- **null 없음**: 빈 객체 `{}`가 "값 없음"을 나타내는 센티넬
- **외부 함수 연동**: `registerExternal()`과 Result 패턴으로 호스트 I/O 처리

## 빠른 예제

```propertee
// 변수와 할당
name = "ProperTee"
version = 1.2

// 객체와 배열 (1-기반 인덱싱)
config = {
    debug: true,
    ports: [8080, 8443, 3000],
    "api-key": "secret123"
}

// 배열 접근 (1-기반)
firstPort = config.ports.1    // 8080
secondPort = config.ports.2   // 8443

// 동적 프로퍼티 접근
key = "debug"
isDebug = config.$key          // config.debug와 동일

// 조건문
if isDebug then
    PRINT("디버그 모드 활성화")
else
    PRINT("프로덕션 모드")
end

// 루프 (값 반복)
PRINT("사용 가능한 포트:")
loop port in config.ports do
    PRINT("  Port:", port)
end

// 루프 (키-값 반복, 1-기반 인덱스)
loop idx, port in config.ports do
    PRINT("  인덱스:", idx, "포트:", port)
end

// 함수
function greet(name) do
    greeting = "Hello, " + name + "!"
    return greeting
end

message = greet("ProperTee")
PRINT(message)

// 병렬 실행
function worker(id) do
    PRINT("Worker " + id + " 실행 중")
    return 42
end

multi result do
    thread resultA: worker("A")
    thread resultB: worker("B")
monitor 500
    PRINT("대기 중...")
end

PRINT("결과:", result.resultA.value, result.resultB.value)
```

## 문서

- [언어 명세 (한국어)](LANGUAGE.ko.md)
- [언어 명세 (영어)](LANGUAGE.md)
- [문법 파일 (ANTLR4)](grammar/ProperTee.g4)

## 구현체

| 구현체 | 저장소 | 런타임 |
|---|---|---|
| **JavaScript** | [propertee-js](https://github.com/flatide/propertee-js) | Node.js (ES 모듈, 제너레이터 기반 동시성) |
| **Java** | [propertee-java](https://github.com/flatide/propertee-java) | Java 7+ (Stepper 패턴, 레거시 시스템 내장) |

두 구현체 모두 동일한 ANTLR4 문법을 공유하며 55개 테스트 스위트를 통과합니다.

## 온라인 플레이그라운드

**[https://flatide.github.io/propertee-js/](https://flatide.github.io/propertee-js/)**

브라우저에서 직접 ProperTee 코드를 실행할 수 있는 인터랙티브 웹 페이지입니다.

### 기능

- JSON 프로퍼티 입력
- 스크립트 편집기 및 실행
- 실시간 파싱 및 결과 표시
- 예제 코드 (기본, 프로퍼티 접근, 제어 흐름, 동적 접근)

### 웹 페이지에 내장하기

ProperTee를 웹 페이지에 통합하려면 GitHub의 샘플을 참고하세요:

```html
<!-- ProperTee 번들 로드 -->
<script src="propertee-bundle.js"></script>

<script>
// 프로퍼티와 스크립트 준비
const properties = { user: { name: "Test", score: 100 } };
const scriptText = `
PRINT("Hello,", user.name)
user.score = user.score + 10
PRINT("New score:", user.score)
`;

// 파싱
const chars = new antlr4.InputStream(scriptText);
const lexer = new ProperTeeLexer(chars);
const tokens = new antlr4.CommonTokenStream(lexer);
const parser = new ProperTeeParser(tokens);
const tree = parser.root();

// 스케줄러로 실행
const visitor = new ProperTeeCustomVisitor(properties, {}, {
    stdout: (...args) => console.log(...args),
    stderr: (...args) => console.error(...args)
});
const scheduler = new Scheduler(visitor);
const mainGenerator = visitor.visitRoot(tree);
const result = await scheduler.run(mainGenerator);
</script>
```

전체 내장 예제: [scratch.html](https://github.com/flatide/propertee-js/blob/main/docs/dist/scratch.html)

### 로컬에서 실행하기

```bash
cd docs
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 열기
```

## 구현

ProperTee는 [ANTLR4](https://www.antlr.org/)를 사용하여 구현되었습니다.

- **문법 파일**: [`grammar/ProperTee.g4`](grammar/ProperTee.g4)
- **JavaScript 번들**: [propertee-bundle.js](https://github.com/flatide/propertee-js/blob/main/docs/dist/propertee-bundle.js)
- **내장 샘플**: [scratch.html](https://github.com/flatide/propertee-js/blob/main/docs/dist/scratch.html)

ANTLR4가 렉서와 파서를 생성하고, 커스텀 비지터 패턴으로 인터프리터를 구현합니다.

## 라이선스

BSD 3-Clause License. [LICENSE](LICENSE) 참조.
