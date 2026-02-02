# ProperTee

**ProperTee**는 프로퍼티 기반 데이터 처리를 위한 경량 스크립팅 언어입니다. 직관적인 문법과 강력한 동적 접근 기능을 제공하며, 설정 파일, 데이터 변환, 템플릿 처리 등 다양한 용도로 활용할 수 있습니다.

🎯 **[온라인 플레이그라운드에서 바로 체험하기](https://flatide.github.io/propertee-js-concurrency/)**

## 특징

- **간결한 문법**: Pascal/Lua 스타일의 `if-then-end`, `loop-do-end` 블록 구조
- **동적 프로퍼티 접근**: `.$key`, `.$(expr)` 문법으로 런타임 키 평가 지원
- **일급 자료구조**: 객체 리터럴 `{}`, 배열 리터럴 `[]` 내장
- **1-based 인덱싱**: 배열 첫 번째 요소는 `.1`로 접근 (직관적!)
- **표현식 중심 설계**: 모든 구문이 표현식으로 평가 가능
- **통합 반복문**: `loop` 키워드로 조건, 반복, 무한 루프 통합
- **사용자 정의 함수**: `function` 키워드로 재사용 가능한 함수 정의
- **병렬 실행**: `multi` 블록으로 안전한 동시 실행 지원
- **주석 지원**: 한 줄 주석(`//`)과 블럭 주석(`/* */`) 지원

## 빠른 예제

```propertee
// 변수 선언과 할당
name = "ProperTee"
version = 1.0

// 객체와 배열 (1-based 인덱싱)
config = {
    debug: true,
    ports: [8080, 8443, 3000],
    "api-key": "secret123"
}

// 배열 접근 (1-based)
firstPort = config.ports.1    // 8080
secondPort = config.ports.2   // 8443

// 동적 프로퍼티 접근
key = "debug"
isDebug = config.$key          // config.debug와 동일

// 조건문
if isDebug then
    PRINT("Debug mode enabled")
else
    PRINT("Production mode")
end

// 반복문 (값 반복)
PRINT("Available ports:")
loop port in config.ports do
    PRINT("  Port:", port)
end

// 반복문 (키-값 반복, 1-based 인덱스)
loop idx, port in config.ports do
    PRINT("  Index:", idx, "Port:", port)
end

// 함수 정의
function greet(name) do
    greeting = "Hello, " + name + "!"
    return greeting
end

message = greet("ProperTee")
PRINT(message)

// 병렬 실행
shared counter = 0

thread increment() uses counter do
    counter = counter + 1
    return counter
end

multi
    increment() -> r1
    increment() -> r2
monitor 500
    PRINT("진행 중... counter =", counter)
end

PRINT("Results:", r1, r2)    // 1, 2
PRINT("Counter:", counter)    // 2
```

## 문서

- [언어 명세 (공식)](grammar/LANGUAGE_SPEC.md)
  - [함수 제약사항 (가변 인자, 비동기)](grammar/LANGUAGE_SPEC.md#181-current-limitations)
- [문법 파일 (ANTLR4)](grammar/ProperTee.g4)
- [문법 명세 (EBNF)](grammar.md)
- [BNF 명세](bnf.md)
- [언어 가이드](guide.md)
- [예제 모음](examples/)

## 온라인 플레이그라운드

🌐 **[https://flatide.github.io/propertee-js-concurrency/](https://flatide.github.io/propertee-js-concurrency/)**

브라우저에서 바로 ProperTee 코드를 실행해볼 수 있는 대화형 웹페이지입니다.

### 기능

- 📋 JSON 형식으로 Properties 입력
- 📝 ProperTee 스크립트 작성 및 실행
- 💻 실시간 파싱 및 실행 결과 확인
- 🎨 예제 코드 제공 (기본, 프로퍼티 접근, 제어 구조, 동적 접근)

### 웹페이지에 임베딩하기

ProperTee를 자신의 웹페이지에 통합하려면 GitHub의 샘플을 참고하세요.

```html
<!-- ProperTee 번들 로드 -->
<script src="propertee-bundle.js"></script>

<script>
// Properties와 스크립트 준비
const properties = { user: { name: "Test", score: 100 } };
const scriptText = `
PRINT("Hello,", user.name)
user.score = user.score + 10
user.score
`;

// 파싱 및 실행
const chars = new antlr4.InputStream(scriptText);
const lexer = new ProperTeeLexer(chars);
const tokens = new antlr4.CommonTokenStream(lexer);
const parser = new ProperTeeParser(tokens);
const tree = parser.root();

// 실행
const visitor = new ProperTeeCustomVisitor(properties, {}, {
    stdout: (...args) => console.log(...args),
    stderr: (...args) => console.error(...args)
});
const result = visitor.visit(tree);
</script>
```

완전한 임베딩 예제는 [GitHub 저장소의 scratch.html](https://github.com/flatide/propertee-js-concurrency/blob/main/dist/scratch.html)을 참조하세요.

### 로컬 실행

```bash
# 플레이그라운드 로컬 실행
cd docs
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

## 구현

ProperTee는 [ANTLR4](https://www.antlr.org/)를 사용하여 구현되었습니다. 

- **문법 파일**: [`grammar/ProperTee.g4`](grammar/ProperTee.g4)
- **JavaScript 번들**: [propertee-bundle.js](https://github.com/flatide/propertee-js-concurrency/blob/main/dist/propertee-bundle.js)
- **임베딩 샘플**: [scratch.html](https://github.com/flatide/propertee-js-concurrency/blob/main/dist/scratch.html)

ANTLR4에서 렉서와 파서를 생성하고, 커스텀 비지터 패턴으로 인터프리터를 구현합니다.

## 라이선스

BSD License
