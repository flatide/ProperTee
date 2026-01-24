# ProperTee

**ProperTee**는 프로퍼티 기반 데이터 처리를 위한 경량 스크립팅 언어입니다. 직관적인 문법과 강력한 동적 접근 기능을 제공하며, 설정 파일, 데이터 변환, 템플릿 처리 등 다양한 용도로 활용할 수 있습니다.

## 특징

- **간결한 문법**: Pascal/Lua 스타일의 `if-then-end`, `for-do-end` 블록 구조
- **동적 프로퍼티 접근**: `.$key`, `.$(expr)` 문법으로 런타임 키 평가 지원
- **일급 자료구조**: 객체 리터럴 `{}`, 배열 리터럴 `[]` 내장
- **표현식 중심 설계**: 모든 구문이 표현식으로 평가 가능

## 빠른 예제

```propertee
// 변수 선언과 할당
name = "ProperTee"
version = 1.0

// 객체와 배열
config = {
    debug: true,
    ports: [8080, 8443],
    "api-key": "secret123"
}

// 동적 프로퍼티 접근
key = "debug"
isDebug = config.$key          // config.debug와 동일

// 조건문
if isDebug then
    log("Debug mode enabled")
else
    log("Production mode")
end

// 반복문
for port in config.ports do
    listen(port)
end
```

## 문서

- [문법 명세 (EBNF)](grammar.md)
- [언어 가이드](guide.md)
- [예제 모음](examples/)

## 온라인 플레이그라운드

`playground/` 폴더에는 브라우저에서 바로 ProperTee 코드를 실행해볼 수 있는 대화형 웹페이지가 포함되어 있습니다.

### 사용 방법

1. `playground/scratch.html` 파일을 브라우저로 엽니다
2. **Properties** 영역에 JSON 형식으로 초기 프로퍼티를 입력합니다
3. **Script** 영역에 ProperTee 코드를 작성합니다
4. **Run** 버튼을 클릭하여 실행합니다

플레이그라운드는 ANTLR4로 생성된 JavaScript 파서(`propertee-bundle.js`)를 사용하여 실시간으로 코드를 파싱하고 실행합니다. 실행 결과, 반환값, 프로퍼티 상태, 변수 상태를 모두 확인할 수 있습니다.

## 구현

ProperTee는 [ANTLR4](https://www.antlr.org/)를 사용하여 구현되었습니다. 문법 파일(`grammar/ProperTee.g4`)에서 렉서와 파서를 생성하고, 커스텀 비지터 패턴으로 인터프리터를 구현합니다.

## 라이선스

BSD License
