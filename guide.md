# ProperTee 언어 가이드

이 문서는 ProperTee 언어의 기능과 사용법을 설명합니다.

## 목차

1. [시작하기](#1-시작하기)
2. [변수와 타입](#2-변수와-타입)
3. [연산자](#3-연산자)
4. [프로퍼티 접근](#4-프로퍼티-접근)
5. [제어 구조](#5-제어-구조)
6. [함수](#6-함수)
   - 6.1 [함수 호출 구문](#61-함수-호출-구문)
   - 6.2 [표준 라이브러리](#62-표준-라이브러리)
   - 6.3 [커스텀 함수](#63-커스텀-함수)
   - 6.4 [함수 사용 패턴](#64-함수-사용-패턴)
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

### 5.2 Loop: 조건 반복 (while-style)

```propertee
// 기본 조건 루프
i = 0
loop i < 5 do
    print(i)
    i = i + 1
end

// 조건부 탈출
sum = 0
n = 1
loop true do
    sum = sum + n
    n = n + 1
    if sum > 100 then
        break
    end
end

// 명시적 무한 루프
counter = 0
loop true infinite do
    counter = counter + 1
    if counter > 10 then
        break
    end
end
```

### 5.3 Loop: 값 반복 (for-each style)

```propertee
// 배열 순회 (값만)
colors = ["red", "green", "blue"]
loop color in colors do
    print(color)
end

// 객체 순회 (키, 값)
user = {name: "Alice", age: 30, city: "Seoul"}
loop key, value in user do
    print(key + ": " + value)
end

// continue 사용
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
loop n in numbers do
    if n / 2 * 2 == n then  // 짝수면 건너뛰기
        continue
    end
    print(n)  // 홀수만 출력
end
```

### 5.4 흐름 제어

```propertee
// break - 루프 탈출
loop item in items do
    if item == target then
        found = true
        break
    end
end

// continue - 다음 반복으로
loop item in items do
    if not isValid(item) then
        continue
    end
    process(item)
end
```

---

## 6. 함수

ProperTee는 함수 호출 구문을 제공하며, 표준 라이브러리로 여러 내장 함수를 제공합니다.

### 6.1 함수 호출 구문

함수는 `이름(인자1, 인자2, ...)` 형식으로 호출합니다.

```propertee
// 인자 없음
result = getCurrentTime()

// 단일 인자
length = LEN("hello")

// 여러 인자
maximum = MAX(10, 20, 30)

// 표현식 인자
output = PRINT("Value:", x * 2)

// 객체 인자
result = processData({
    type: "user",
    data: {name: "Alice"}
})

// 체인 호출
result = parseResponse(fetchData(url)).data.items.0
```

### 6.2 표준 라이브러리

ProperTee 구현체는 다음 표준 함수들을 제공합니다.

#### 6.2.1 입출력 함수

**`PRINT(...args)`**
- 값들을 출력합니다 (stdout으로 전송)
- 여러 인자를 받아 공백으로 구분하여 출력

```propertee
PRINT("Hello, World!")           // Hello, World!
PRINT("Score:", 100)              // Score: 100
PRINT("User:", user.name, user.age)  // User: Alice 30
```

#### 6.2.2 수학 함수

**`SUM(...numbers)`**
- 숫자들의 합계를 반환합니다

```propertee
total = SUM(1, 2, 3, 4, 5)        // 15
sum = SUM(prices.0, prices.1)     // 가격 합계
```

**`MAX(...numbers)`**
- 인자 중 최댓값을 반환합니다

```propertee
highest = MAX(10, 25, 15, 30)     // 30
max_score = MAX(scores.0, scores.1, scores.2)
```

**`MIN(...numbers)`**
- 인자 중 최솟값을 반환합니다

```propertee
lowest = MIN(10, 25, 15, 30)      // 10
min_temp = MIN(temps.0, temps.1, temps.2)
```

**`ABS(n)`**
- 숫자의 절댓값을 반환합니다

```propertee
positive = ABS(-10)               // 10
distance = ABS(x - y)
```

**`FLOOR(n)`**
- 숫자를 내림합니다

```propertee
down = FLOOR(3.7)                 // 3
rounded_down = FLOOR(price)
```

**`CEIL(n)`**
- 숫자를 올림합니다

```propertee
up = CEIL(3.2)                    // 4
rounded_up = CEIL(price)
```

**`ROUND(n)`**
- 숫자를 반올림합니다

```propertee
rounded = ROUND(3.5)              // 4
rounded2 = ROUND(3.4)             // 3
```

#### 6.2.3 유틸리티 함수

**`LEN(arr|string)`**
- 배열이나 문자열의 길이를 반환합니다

```propertee
str_len = LEN("hello")            // 5
arr_len = LEN([1, 2, 3])          // 3
count = LEN(users)                // users 배열의 길이
```

#### 6.2.4 정규표현식 함수

**`REGEX(pattern, text, mode)`**
- 정규표현식을 사용하여 텍스트를 처리합니다
- `mode`: "test" (매치 여부), "match" (매칭된 값), "replace" (치환)

```propertee
// 패턴 매칭 테스트
is_email = REGEX("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", email, "test")

// 값 추출
phone = "연락처: 010-1234-5678"
number = REGEX("\\d{3}-\\d{4}-\\d{4}", phone, "match")  // "010-1234-5678"

// 문자열 치환
text = "Hello World"
result = REGEX("World", text, "replace", "ProperTee")   // "Hello ProperTee"

// 실전 예제: 이메일 검증
email = "user@example.com"
if REGEX("@", email, "test") then
    PRINT("Valid email format")
end

// URL에서 도메인 추출
url = "https://www.example.com/path"
domain = REGEX("https?://([^/]+)", url, "match")
```

#### 6.2.5 시스템 함수

**`RUN(command, ...args)`**
- 외부 명령이나 스크립트를 실행합니다
- 보안상의 이유로 샌드박스 환경에서는 제한될 수 있습니다

```propertee
// 쉘 명령 실행
result = RUN("ls", "-la")
files = RUN("find", ".", "-name", "*.txt")

// 스크립트 실행
output = RUN("python", "script.py", "--input", data_file)
status = RUN("./deploy.sh", env)

// 조건부 실행
if env == "production" then
    RUN("npm", "run", "build")
    RUN("./deploy.sh", "prod")
end

// 결과 확인
backup_result = RUN("tar", "-czf", "backup.tar.gz", "data/")
if backup_result == 0 then
    PRINT("Backup successful")
else
    PRINT("Backup failed")
end
```

**⚠️ 주의사항:**
- `RUN()` 함수는 호스트 환경의 보안 정책에 따라 제한될 수 있습니다
- 브라우저 환경에서는 사용할 수 없습니다
- 사용자 입력을 직접 전달하지 마세요 (보안 위험)

### 6.3 커스텀 함수

호스트 애플리케이션은 추가 함수를 주입할 수 있습니다:

```javascript
// JavaScript에서 ProperTee 실행 시
const visitor = new ProperTeeCustomVisitor(
    properties,
    {
        // 커스텀 함수 추가
        fetchData: (url) => fetch(url).then(r => r.json()),
        notify: (msg) => alert(msg),
        timestamp: () => Date.now(),
        customFunc: (x, y) => x * y + 10
    },
    ioStreams
);
```

ProperTee 코드에서 사용:

```propertee
// 주입된 커스텀 함수 사용
data = fetchData("https://api.example.com/users")
notify("Data loaded successfully!")
now = timestamp()
result = customFunc(5, 3)  // 25
```

### 6.4 함수 사용 패턴

#### 데이터 검증

```propertee
// 길이 검증
password = "secret123"
if LEN(password) < 8 then
    PRINT("Password too short")
end

// 정규식 검증
email = user.email
if not REGEX("@", email, "test") then
    PRINT("Invalid email")
end
```

#### 수학 계산

```propertee
// 통계 계산
numbers = [10, 20, 15, 25, 30]
total = SUM(numbers.0, numbers.1, numbers.2, numbers.3, numbers.4)
max_val = MAX(numbers.0, numbers.1, numbers.2, numbers.3, numbers.4)
min_val = MIN(numbers.0, numbers.1, numbers.2, numbers.3, numbers.4)
average = total / LEN(numbers)

PRINT("Total:", total)
PRINT("Average:", average)
PRINT("Max:", max_val)
PRINT("Min:", min_val)
```

#### 텍스트 처리

```propertee
// 전화번호 정규화
raw_phone = "010 1234 5678"
clean_phone = REGEX("\\s+", raw_phone, "replace", "-")  // "010-1234-5678"

// URL 파싱
url = "https://example.com:8080/api/users?id=123"
has_port = REGEX(":\\d+", url, "test")
if has_port then
    PRINT("Port specified in URL")
end
```

#### 자동화 작업

```propertee
// 배포 파이프라인
env = "production"

PRINT("Starting deployment to", env)

// 빌드
build_result = RUN("npm", "run", "build")
if build_result != 0 then
    PRINT("Build failed")
    break
end

// 테스트
test_result = RUN("npm", "test")
if test_result != 0 then
    PRINT("Tests failed")
    break
end

// 배포
deploy_result = RUN("./deploy.sh", env)
if deploy_result == 0 then
    PRINT("Deployment successful!")
else
    PRINT("Deployment failed!")
end
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
loop user in raw_users do
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

loop field in required_fields do
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
loop user in response.data.users do
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
loop key in placeholders do
    value = template_vars.$key
    replace_placeholder(key, value)
end
```

---

## 다음 단계

- [문법 명세](grammar.md)에서 전체 EBNF 문법을 확인하세요
- [예제 모음](examples/)에서 더 많은 코드를 살펴보세요
