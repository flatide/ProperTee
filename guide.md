# ProperTee 언어 가이드

이 문서는 ProperTee 언어의 기능과 사용법을 설명합니다.

## 목차

1. [시작하기](#1-시작하기)
2. [변수와 타입](#2-변수와-타입)
3. [연산자](#3-연산자)
4. [프로퍼티 접근](#4-프로퍼티-접근)
5. [제어 구조](#5-제어-구조)
6. [함수](#6-함수)
7. [실전 패턴](#7-실전-패턴)

---

## 1. 시작하기

ProperTee는 프로퍼티 기반 데이터를 처리하기 위해 설계된 스크립팅 언어입니다.

### 첫 번째 프로그램

```propertee
// Hello, ProperTee!
message = "Hello, World!"
print(message)
```

### 언어 철학

- **명확성**: 코드는 읽기 쉬워야 합니다
- **유연성**: 동적 데이터 접근이 자연스러워야 합니다
- **간결성**: 불필요한 구문을 최소화합니다

---

## 2. 변수와 타입

### 2.1 변수 선언

ProperTee는 동적 타입 언어입니다. 변수는 선언 없이 할당으로 생성됩니다.

```propertee
name = "Alice"      // 문자열
age = 30            // 숫자
active = true       // 불리언
data = null         // null 값
```

### 2.2 데이터 타입

| 타입 | 예시 | 설명 |
|------|------|------|
| Number | `42`, `3.14` | 정수 및 부동소수점 |
| String | `"hello"` | 쌍따옴표 문자열 |
| Boolean | `true`, `false` | 논리값 |
| Object | `{a: 1, b: 2}` | 키-값 쌍 |
| Array | `[1, 2, 3]` | 순서 있는 목록 |
| Null | `null` | 값 없음 |

### 2.3 객체

```propertee
// 기본 객체
user = {
    name: "Alice",
    age: 30
}

// 특수 키
headers = {
    "Content-Type": "application/json",
    "X-Api-Key": "secret"
}

// 숫자 키
mapping = {
    0: "zero",
    1: "one",
    2: "two"
}

// 중첩 객체
config = {
    server: {
        host: "localhost",
        port: 8080
    },
    database: {
        url: "postgres://localhost/db"
    }
}
```

### 2.4 배열

```propertee
// 기본 배열
numbers = [1, 2, 3, 4, 5]

// 혼합 타입
mixed = [1, "two", true, null]

// 중첩 배열
matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]

// 객체 배열
users = [
    {name: "Alice", age: 30},
    {name: "Bob", age: 25}
]
```

---

## 3. 연산자

### 3.1 산술 연산자

```propertee
a = 10
b = 3

sum = a + b         // 13
diff = a - b        // 7
product = a * b     // 30
quotient = a / b    // 3.333...
negative = -a       // -10
```

### 3.2 비교 연산자

```propertee
x = 5
y = 10

x == y      // false (같음)
x != y      // true  (다름)
x < y       // true  (미만)
x <= y      // true  (이하)
x > y       // false (초과)
x >= y      // false (이상)
```

### 3.3 논리 연산자

```propertee
a = true
b = false

a and b     // false
a or b      // true
not a       // false

// 복합 조건
x = 5
x > 0 and x < 10    // true
```

---

## 4. 프로퍼티 접근

ProperTee의 핵심 기능은 유연한 프로퍼티 접근입니다.

### 4.1 정적 접근

가장 기본적인 점(.) 표기법입니다.

```propertee
user = {name: "Alice", age: 30}

user.name       // "Alice"
user.age        // 30
```

### 4.2 배열 인덱스 접근

숫자로 배열 요소에 접근합니다.

```propertee
colors = ["red", "green", "blue"]

colors.0        // "red"
colors.1        // "green"
colors.2        // "blue"
```

### 4.3 문자열 키 접근

특수 문자가 포함된 키에 접근합니다.

```propertee
headers = {
    "Content-Type": "application/json",
    "X-Request-Id": "abc123"
}

headers."Content-Type"      // "application/json"
headers."X-Request-Id"      // "abc123"
```

### 4.4 동적 접근 (변수 평가)

`.$변수명`으로 변수 값을 키로 사용합니다.

```propertee
data = {
    name: "Alice",
    email: "alice@example.com"
}

field = "name"
data.$field         // "Alice" (data.name과 동일)

field = "email"
data.$field         // "alice@example.com"
```

### 4.5 동적 접근 (표현식 평가)

`.$(표현식)`으로 임의의 표현식을 키로 사용합니다.

```propertee
// 문자열 조합
users = {
    user_1: "Alice",
    user_2: "Bob",
    user_3: "Charlie"
}

id = 2
users.$("user_" + id)       // "Bob"

// 계산된 인덱스
items = ["a", "b", "c", "d", "e"]
base = 1
items.$(base + 2)           // "d" (items.3)

// 조건부 키
config = {
    dev_api: "http://localhost:3000",
    prod_api: "https://api.example.com"
}

env = "prod"
config.$(env + "_api")      // "https://api.example.com"
```

### 4.6 체인 접근

여러 접근을 연결할 수 있습니다.

```propertee
app = {
    users: [
        {name: "Alice", roles: ["admin", "user"]},
        {name: "Bob", roles: ["user"]}
    ]
}

// 정적 체인
app.users.0.name            // "Alice"
app.users.0.roles.0         // "admin"

// 동적 체인
idx = 1
role = "roles"
app.users.$idx.$role.0      // "user"
```

### 4.7 프로퍼티 할당

좌변(lvalue)에서도 동일한 접근 방식을 사용합니다.

```propertee
obj = {x: 1, y: 2}

// 정적 할당
obj.z = 3

// 동적 할당
key = "w"
obj.$key = 4                // obj.w = 4

// 표현식 할당
prefix = "val_"
obj.$(prefix + "a") = 100   // obj.val_a = 100
```

---

## 5. 제어 구조

### 5.1 조건문 (if-then-else-end)

```propertee
// 기본 조건문
if x > 0 then
    result = "positive"
end

// if-else
if age >= 18 then
    status = "adult"
else
    status = "minor"
end

// 중첩 조건
if score >= 90 then
    grade = "A"
else
    if score >= 80 then
        grade = "B"
    else
        if score >= 70 then
            grade = "C"
        else
            grade = "F"
        end
    end
end
```

### 5.2 While 루프

```propertee
// 기본 while
i = 0
while i < 5 do
    print(i)
    i = i + 1
end

// 조건부 탈출
sum = 0
n = 1
while true do
    sum = sum + n
    n = n + 1
    if sum > 100 then
        break
    end
end
```

### 5.3 For 루프

```propertee
// 배열 순회 (값만)
colors = ["red", "green", "blue"]
for color in colors do
    print(color)
end

// 객체 순회 (키, 값)
user = {name: "Alice", age: 30, city: "Seoul"}
for key, value in user do
    print(key + ": " + value)
end

// continue 사용
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
for n in numbers do
    if n / 2 * 2 == n then  // 짝수면 건너뛰기
        continue
    end
    print(n)  // 홀수만 출력
end
```

### 5.4 흐름 제어

```propertee
// break - 루프 탈출
for item in items do
    if item == target then
        found = true
        break
    end
end

// continue - 다음 반복으로
for item in items do
    if not isValid(item) then
        continue
    end
    process(item)
end
```

---

## 6. 함수

함수는 `이름(인자1, 인자2, ...)` 형식으로 호출합니다.

```propertee
// 인자 없음
result = now()

// 단일 인자
length = strlen("hello")

// 여러 인자
sum = add(1, 2, 3)

// 표현식 인자
output = format("Value: {}", x * 2)

// 객체 인자
response = request({
    method: "POST",
    url: "/api/data",
    body: {name: "test"}
})

// 체인 호출
result = parse(fetch(url)).data.items.0
```

---

## 7. 실전 패턴

### 7.1 설정 관리

```propertee
// 환경별 설정
env = "production"

config = {
    development: {
        debug: true,
        api_url: "http://localhost:3000"
    },
    production: {
        debug: false,
        api_url: "https://api.example.com"
    }
}

current = config.$env
api_url = current.api_url
debug = current.debug
```

### 7.2 데이터 변환

```propertee
// 원본 데이터
raw_users = [
    {id: 1, first_name: "Alice", last_name: "Kim"},
    {id: 2, first_name: "Bob", last_name: "Lee"}
]

// 변환된 데이터 구성
transformed = []
for user in raw_users do
    new_user = {
        id: user.id,
        full_name: user.first_name + " " + user.last_name
    }
    push(transformed, new_user)
end
```

### 7.3 동적 검증

```propertee
// 필수 필드 검증
required_fields = ["name", "email", "age"]
data = {name: "Alice", email: "alice@example.com"}

for field in required_fields do
    if data.$field == null then
        errors = push(errors, "Missing field: " + field)
    end
end
```

### 7.4 중첩 데이터 탐색

```propertee
// JSON 응답 처리
response = {
    status: "success",
    data: {
        users: [
            {name: "Alice", permissions: {admin: true, write: true}},
            {name: "Bob", permissions: {admin: false, write: true}}
        ]
    }
}

// 관리자 찾기
for user in response.data.users do
    if user.permissions.admin == true then
        admin_name = user.name
        break
    end
end
```

### 7.5 템플릿 데이터 바인딩

```propertee
// 템플릿 변수
template_vars = {
    title: "Welcome",
    username: "Alice",
    items_count: 5
}

// 동적 접근으로 바인딩
placeholders = ["title", "username", "items_count"]
for key in placeholders do
    value = template_vars.$key
    replace_placeholder(key, value)
end
```

---

## 다음 단계

- [문법 명세](grammar.md)에서 전체 EBNF 문법을 확인하세요
- [예제 모음](examples/)에서 더 많은 코드를 살펴보세요
