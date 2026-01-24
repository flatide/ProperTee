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

## 라이선스

BSD License
