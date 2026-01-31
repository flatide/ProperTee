# ProperTee Language Specification

Version: 1.0  
Last Updated: 2026-01-25

## 1. Type System

### 1.1 Primitive Types
- **Number**: IEEE 754 floating-point numbers (e.g., `42`, `3.14`, `-7.5`)
- **String**: UTF-16 encoded strings (e.g., `"hello"`, `"world"`)
- **Boolean**: `true` or `false`
- **Null**: `null` (represents intentional absence of value)

### 1.2 Complex Types
- **Object**: Key-value pairs `{key: value, ...}`
- **Array**: Ordered collections `[item1, item2, ...]`

### 1.3 No Undefined
⚠️ **ProperTee does NOT have an `undefined` type.**

Any attempt to access non-existent variables or properties results in a **runtime error**.

---

## 2. Operators

### 2.1 Arithmetic Operators

#### Addition (`+`)
- **Allowed types**: 
  - `Number + Number` → Number
  - `String + String` → String (concatenation)
- **Type coercion**: ❌ None
- **Error cases**:
  - `String + Number` → Runtime Error
  - `Boolean + Number` → Runtime Error
  - Mixed types → Runtime Error

**Examples:**
```javascript
10 + 5         // ✅ 15
"Hello" + " World"  // ✅ "Hello World"
"5" + 3        // ❌ Runtime Error: Type mismatch
```

#### Subtraction (`-`)
- **Allowed types**: `Number - Number` only
- **Error cases**: Non-numeric operands → Runtime Error

**Examples:**
```javascript
10 - 3         // ✅ 7
"10" - 5       // ❌ Runtime Error
```

#### Multiplication (`*`)
- **Allowed types**: `Number * Number` only
- **Error cases**: Non-numeric operands → Runtime Error

#### Division (`/`)
- **Allowed types**: `Number / Number` only
- **Error cases**: 
  - Non-numeric operands → Runtime Error
  - **Division by zero → Runtime Error** ⚠️

**Examples:**
```javascript
10 / 2         // ✅ 5
10 / 0         // ❌ Runtime Error: Division by zero
```

#### Modulo (`%`)
- **Allowed types**: `Number % Number` only
- **Error cases**:
  - Non-numeric operands → Runtime Error
  - **Modulo by zero → Runtime Error** ⚠️

**Examples:**
```javascript
10 % 3         // ✅ 1
10 % 0         // ❌ Runtime Error: Division by zero
```

#### Unary Minus (`-`)
- **Allowed types**: `-Number` only
- Negates numeric value
- **Error cases**: Non-numeric operand → Runtime Error

**Examples:**
```javascript
x = -5        // ✅ -5
y = -(3 + 2)  // ✅ -5
z = -"10"     // ❌ Runtime Error: Unary minus requires numeric operand
```

### 2.2 Comparison Operators

All comparison operators: `==`, `!=`, `>`, `<`, `>=`, `<=`

#### Equality operators (`==`, `!=`)
- **Allowed types**: Any type (no type coercion)
- Compares values using strict equality
- Different types are never equal

**Examples:**
```javascript
5 == 5         // ✅ true
5 != 3         // ✅ true
null == null   // ✅ true
5 == "5"       // ✅ false (no type coercion)
true == 1      // ✅ false (different types)
```

#### Ordering operators (`>`, `<`, `>=`, `<=`)
- **Allowed types**: `Number` comparison `Number` only
- **Error cases**: Non-numeric operands → Runtime Error

**Examples:**
```javascript
10 > 5         // ✅ true
3.5 <= 3.5     // ✅ true
"10" > 5       // ❌ Runtime Error: Comparison requires numeric operands
```

### 2.3 Logical Operators

- `and`: Logical AND
- `or`: Logical OR
- `not`: Logical NOT

#### Type Requirements
- **Allowed types**: `Boolean` operands only
- **No truthy/falsy evaluation**: Unlike JavaScript, only `true` and `false` are valid
- **Error cases**: Non-boolean operands → Runtime Error

**Examples:**
```javascript
true and false     // ✅ false
true or false      // ✅ true
not true           // ✅ false

// Comparisons return boolean, so can be combined
(5 > 3) and (2 < 4)    // ✅ true
(x == 10) or (y == 20) // ✅ Works if x and y are defined

// These are ERRORS (no truthy/falsy)
1 and 0            // ❌ Runtime Error: Logical AND requires boolean operands
"hello" or ""      // ❌ Runtime Error: Logical OR requires boolean operands
not 0              // ❌ Runtime Error: Logical NOT requires boolean operand
```

**Short-circuit evaluation:**
- `and`: If left is `false`, right is not evaluated
- `or`: If left is `true`, right is not evaluated

---

## 3. Variables and Scope

### 3.1 Variable Declaration

Variables are created on **first assignment**. No explicit declaration keyword needed.

**Examples:**
```javascript
x = 10              // Creates variable x
myName = "Alice"    // Creates variable myName
```

### 3.2 Variable Reference

⚠️ **Error**: Accessing undefined variable → **Runtime Error**

Variables **must be assigned before use**.

**Examples:**
```javascript
x = 10
PRINT(x)           // ✅ 10

PRINT(y)           // ❌ Runtime Error: Variable 'y' is not defined
```

### 3.3 Scoping Rules

- All variables are **function-scoped** (or global in top-level)
- No block scoping
- Assignments create or update variables in current scope

### 3.4 Variable Lookup Priority

1. Local variables (`this.variables`)
2. Built-in properties (`this.properties`)

If variable not found in either → Runtime Error

---

## 4. Property Access

### 4.1 Reading Properties

**Syntax:**
- `object.property` - Static property name
- `object.0` - Numeric key (array index)
- `object."key-name"` - String key with special characters
- `object.$varName` - Dynamic property using variable (shorthand)
- `object.$(expression)` - Dynamic property using expression

⚠️ **Error cases:**
- `null.property` → Runtime Error: "Cannot access property of null"
- `object.nonExistent` → Runtime Error: "Property does not exist"

**Examples:**
```javascript
obj = {name: "Alice", age: 30}
PRINT(obj.name)        // ✅ "Alice"
PRINT(obj.city)        // ❌ Runtime Error: Property 'city' does not exist

arr = [1, 2, 3]
PRINT(arr.0)           // ✅ 1
PRINT(arr.10)          // ❌ Runtime Error: Property '10' does not exist

obj2 = null
PRINT(obj2.name)       // ❌ Runtime Error: Cannot access property 'name' of null
```

### 4.2 Writing Properties

**Syntax:** `object.property = value`

- **Creates new property** if it doesn't exist
- Updates existing property if it exists

⚠️ **Error cases:**
- `null.property = value` → Runtime Error
- Assigning to non-object (e.g., `5.property = 10`) → Runtime Error

**Examples:**
```javascript
obj = {name: "Alice"}
obj.age = 30           // ✅ Creates new property
obj.name = "Bob"       // ✅ Updates existing property

PRINT(obj.age)         // ✅ 30
PRINT(obj.name)        // ✅ "Bob"
```

### 4.3 Dynamic Property Access

**Using variables:**
```javascript
key = "name"
obj = {name: "Alice"}
PRINT(obj.$key)        // ✅ "Alice" (shorthand for .$(key))
PRINT(obj.$(key))      // ✅ "Alice" (full form)
```

---

## 5. Control Flow

### 5.1 If Statement

**Syntax:**
```
if condition then
    statements
else
    statements
end
```

- `else` block is optional
- Condition should evaluate to boolean

**Examples:**
```javascript
x = 10
if x > 5 then
    PRINT("Greater than 5")
end

if x == 0 then
    PRINT("Zero")
else
    PRINT("Non-zero")
end
```

### 5.2 Loop Statement

#### Condition Loop

**Syntax:**
```
loop condition do
    statements
end

loop condition infinite do
    statements
end
```

- Default iteration limit: **1000** (configurable)
- Use `infinite` keyword to remove limit

**Examples:**
```javascript
counter = 0
loop counter < 10 do
    PRINT(counter)
    counter = counter + 1
end

// Infinite loop (must have break)
loop true infinite do
    PRINT("Running...")
    if shouldStop then
        break
    end
end
```

#### Collection Loop (Value Only)

**Syntax:**
```
loop value in collection do
    statements
end
```

- Iterates over **values** only
- Arrays: iterates over elements
- Objects: iterates over property values

**Examples:**
```javascript
// Array
numbers = [10, 20, 30]
loop num in numbers do
    PRINT(num)        // 10, 20, 30
end

// Object
scores = {alice: 95, bob: 87}
loop score in scores do
    PRINT(score)      // 95, 87
end
```

#### Collection Loop (Key and Value)

**Syntax:**
```
loop key, value in collection do
    statements
end
```

- First variable = **key/index**
- Second variable = **value**
- Arrays: key is numeric index (0, 1, 2, ...)
- Objects: key is string property name

**Examples:**
```javascript
// Array with index
items = ["apple", "banana", "cherry"]
loop idx, item in items do
    PRINT(idx, ":", item)
    // 0 : apple
    // 1 : banana
    // 2 : cherry
end

// Object with keys
person = {name: "Alice", age: 30}
loop key, val in person do
    PRINT(key, "=", val)
    // name = Alice
    // age = 30
end
```

### 5.3 Flow Control

- `break`: Exit current loop immediately
- `continue`: Skip to next iteration

**Examples:**
```javascript
loop i, num in numbers do
    if num < 0 then
        continue      // Skip negative numbers
    end
    
    if num > 100 then
        break         // Stop if number too large
    end
    
    PRINT(num)
end
```

---

## 6. Iteration Limits

### 6.1 Default Behavior

⚠️ All loops have a default maximum iteration count: **1000**

**Behavior when limit exceeded:**

#### Warning Mode (Default) ⚠️
- Outputs warning to stderr
- **Breaks the loop** (equivalent to explicit `break`)
- **Continues with next statement**
- Warning message: `"Warning: Loop exceeded maximum iterations (1000), stopping loop"`

**Example:**
```javascript
counter = 0
loop counter < 10000 do
    PRINT(counter)
    counter = counter + 1
end
// After 1000 iterations:
// ⚠️ Warning: Loop exceeded maximum iterations (1000), stopping loop

PRINT("After loop")  // ✅ This executes
```

#### Error Mode (Optional)
- Throws runtime error
- **Stops execution completely**
- Error message: `"Runtime Error: Loop exceeded maximum iterations (1000)..."`

**Example:**
```javascript
// With iterationLimitBehavior: 'error'

counter = 0
loop counter < 10000 do
    PRINT(counter)
    counter = counter + 1
end
// After 1000 iterations:
// ❌ Runtime Error: Loop exceeded maximum iterations (1000)...

PRINT("This never executes")  // ❌ NOT EXECUTED
```

**Configuration:**
```javascript
// Warning mode (default)
const visitor = new ProperTeeCustomVisitor(
    properties,
    functions,
    ioStreams,
    { 
        maxIterations: 1000,
        iterationLimitBehavior: 'warn'  // default
    }
);

// Error mode (strict)
const visitor = new ProperTeeCustomVisitor(
    properties,
    functions,
    ioStreams,
    { 
        maxIterations: 1000,
        iterationLimitBehavior: 'error'  // stops execution on limit
    }
);
```

### 6.2 Infinite Loops

Use `infinite` keyword after condition to remove iteration limit:

**Syntax:**
```
loop condition infinite do
    statements
end

loop key, value in collection infinite do
    statements
end
```

⚠️ **Must include explicit `break`** to avoid true infinite loop

**Example:**
```javascript
loop true infinite do
    PRINT("Running...")
    if shouldStop then
        break  // Must have break!
    end
end
```

### 6.3 Configuration

Iteration limit can be configured when creating the visitor:

```javascript
const visitor = new ProperTeeCustomVisitor(
    properties,
    functions,
    ioStreams,
    { maxIterations: 5000 }  // Custom limit
);
```

---

## 7. Error Handling

### 7.1 Runtime Errors (Fatal)

All runtime errors **immediately halt execution**. There is no try-catch mechanism.

**Error Categories:**

1. **Division by zero**
   - `x / 0`
   - `x % 0`

2. **Undefined variable**
   - Accessing non-existent variable

3. **Property access errors**
   - Null property access: `null.property`
   - Non-existent property: `object.missingProperty`

4. **Type errors**
   - Invalid operator operands: `"hello" * 5`
   - Non-object property assignment: `5.property = 10`

5. **Loop limit exceeded** (only in 'error' mode)
   - Iteration limit reached without `infinite` keyword
   - Default behavior is 'warn' mode (non-fatal)

6. **Unknown function**
   - Calling undefined function

### 7.2 Warnings (Non-Fatal)

**Loop limit warnings** (default behavior):
- Iteration limit reached → warning to stderr, loop breaks, execution continues
- Use `infinite` keyword to remove limit
- Can be changed to error mode via `iterationLimitBehavior: 'error'`

### 7.3 No Exception Handling

ProperTee does **NOT** have try-catch exception handling.

All errors are **fatal** and stop execution immediately (warnings are non-fatal).

### 7.4 Error Output

When runtime error occurs:
- Previous output (from `PRINT`) is displayed
- Error message is shown
- Execution stops

When warning occurs:
- Warning message is output to stderr
- Loop breaks
- Execution continues with next statement

---

## 8. Type Coercion

### 8.1 Strict Type System

⚠️ ProperTee does **NOT** perform implicit type coercion.

**JavaScript behavior NOT supported:**
```javascript
// JavaScript (works with coercion)
"5" + 3        // "53"
"10" - 2       // 8
true + false   // 1
5 * "2"        // 10

// ProperTee (all errors)
"5" + 3        // ❌ Runtime Error
"10" - 2       // ❌ Runtime Error
true + false   // ❌ Runtime Error
5 * "2"        // ❌ Runtime Error
```

### 8.2 Valid Type Combinations

**Addition (`+`):**
- ✅ Number + Number → Number
- ✅ String + String → String
- ❌ Any other combination → Error

**Subtraction, Multiplication, Division, Modulo (`-`, `*`, `/`, `%`):**
- ✅ Number (operator) Number → Number
- ❌ Any other combination → Error

**Comparison (`>`, `<`, `>=`, `<=`):**
- ✅ Number (operator) Number → Boolean
- ❌ Any other combination → Error

**Equality (`==`, `!=`):**
- ✅ Any type (operator) Any type → Boolean
- Note: No type coercion, so `5 == "5"` is `false`

**Logical operators (`and`, `or`, `not`):**
- ✅ Boolean (operator) Boolean → Boolean
- ❌ Any other combination → Error

### 8.3 Explicit Conversion

Currently, ProperTee does not provide type conversion functions.

If needed in the future, consider adding:
- `TO_NUMBER(value)` - Convert to number
- `TO_STRING(value)` - Convert to string
- `TO_BOOLEAN(value)` - Convert to boolean

---

## 9. Built-in Functions

### 9.1 I/O Functions

#### `PRINT(...args)`
- Outputs arguments to stdout
- Multiple arguments are space-separated
- Automatically adds newline
- **Returns**: `null` (no meaningful return value)

**Examples:**
```javascript
PRINT("Hello")              // Hello
PRINT("Score:", 95)         // Score: 95
PRINT(1, 2, 3)              // 1 2 3

result = PRINT("Test")      // result is null
```

### 9.2 Math Functions

#### `SUM(...args)`
- **Returns**: Number (sum of all arguments)
- All arguments must be numbers

#### `MAX(...args)`
- **Returns**: Number (maximum value)
- All arguments must be numbers

#### `MIN(...args)`
- **Returns**: Number (minimum value)
- All arguments must be numbers

#### `ABS(n)`
- **Returns**: Number (absolute value)

#### `FLOOR(n)`
- **Returns**: Number (largest integer ≤ n)

#### `CEIL(n)`
- **Returns**: Number (smallest integer ≥ n)

#### `ROUND(n)`
- **Returns**: Number (nearest integer)

**Examples:**
```javascript
PRINT(SUM(1, 2, 3, 4))      // 10
PRINT(MAX(5, 2, 8, 1))      // 8
PRINT(MIN(5, 2, 8, 1))      // 2
PRINT(ABS(-5))              // 5
PRINT(FLOOR(3.7))           // 3
PRINT(CEIL(3.2))            // 4
PRINT(ROUND(3.6))           // 4
```

### 9.3 Utility Functions

#### `LEN(array|string)`
- **Returns**: Number (length of array or string)
- Returns 0 for other types

**Examples:**
```javascript
PRINT(LEN([1, 2, 3]))       // 3
PRINT(LEN("hello"))         // 5
```

### 9.4 String Functions

#### `CHARS(string)`
- **Returns**: Array of strings (each character as a string)
- Converts string to array of characters
- Based on Unicode code points (not UTF-16 code units)

⚠️ **Note on complex characters:**
- Emoji with modifiers (e.g., "👍🏻") will be split into multiple elements
- "👍🏻" → ["👍", "🏻"] (thumbs up + skin tone modifier = 2 elements)
- This is technically correct as they are separate Unicode code points
- For grapheme cluster support (visual characters), external library would be needed

**Examples:**
```javascript
text = "Hello"
chars = CHARS(text)
PRINT(chars)                // ["H", "e", "l", "l", "o"]

// Iterate over characters
loop char in CHARS("ProperTee") do
    PRINT(char)
end
// P, r, o, p, e, r, T, e, e

// Emoji with modifiers are split
emoji = "👍🏻"
chars = CHARS(emoji)
PRINT(LEN(chars))           // 2 (base emoji + modifier)

// Count specific character
text = "ProperTee"
count = 0
loop char in CHARS(text) do
    if char == "e" then
        count = count + 1
    end
end
PRINT(count)                // 3
```

#### `SPLIT(string, delimiter)`
- **Returns**: Array of strings
- Splits string into array by delimiter
- Both arguments must be strings

**Examples:**
```javascript
// CSV parsing
csv = "apple,banana,cherry"
items = SPLIT(csv, ",")
PRINT(items)                // ["apple", "banana", "cherry"]

// Split by space
sentence = "Hello World Test"
words = SPLIT(sentence, " ")
loop word in words do
    PRINT(word)
end
// Hello, World, Test

// Split lines
text = "line1\nline2\nline3"
lines = SPLIT(text, "\n")
PRINT(LEN(lines))           // 3
```

#### `JOIN(array, separator)`
- **Returns**: String (joined elements)
- Joins array elements into a string
- First argument must be array
- Second argument must be string (default: empty string)

**Examples:**
```javascript
words = ["Hello", "World"]
text = JOIN(words, " ")
PRINT(text)                 // "Hello World"

// With comma
items = ["apple", "banana", "cherry"]
csv = JOIN(items, ",")
PRINT(csv)                  // "apple,banana,cherry"

// Without separator
letters = ["a", "b", "c"]
combined = JOIN(letters, "")
PRINT(combined)             // "abc"
```

#### `SUBSTRING(string, start, length?)`
- **Returns**: String (extracted substring)
- Extracts substring from string
- `start`: starting index (0-based)
- `length`: number of characters (optional, defaults to rest of string)

**Examples:**
```javascript
text = "ProperTee"
sub1 = SUBSTRING(text, 0, 6)
PRINT(sub1)                 // "Proper"

sub2 = SUBSTRING(text, 6)
PRINT(sub2)                 // "Tee"

// Extract first character
first = SUBSTRING(text, 0, 1)
PRINT(first)                // "P"
```

#### `UPPERCASE(string)`
- **Returns**: String (uppercase version)
- Converts string to uppercase
- Argument must be string

**Examples:**
```javascript
text = "Hello World"
upper = UPPERCASE(text)
PRINT(upper)                // "HELLO WORLD"

name = "alice"
formatted = UPPERCASE(name)
PRINT(formatted)            // "ALICE"
```

#### `LOWERCASE(string)`
- **Returns**: String (lowercase version)
- Converts string to lowercase
- Argument must be string

**Examples:**
```javascript
text = "Hello World"
lower = LOWERCASE(text)
PRINT(lower)                // "hello world"

NAME = "ALICE"
normalized = LOWERCASE(NAME)
PRINT(normalized)           // "alice"
```

#### `TRIM(string)`
- **Returns**: String (trimmed version)
- Removes whitespace from both ends of string
- Argument must be string

**Examples:**
```javascript
text = "  hello  "
trimmed = TRIM(text)
PRINT(trimmed)              // "hello"

input = "\n\t  test  \n"
cleaned = TRIM(input)
PRINT(cleaned)              // "test"
```

### 9.5 Custom Functions

Custom functions can be injected via constructor:

```javascript
const customFunctions = {
    'DOUBLE': (n) => n * 2,
    'GREET': (name) => `Hello, ${name}!`
};

const visitor = new ProperTeeCustomVisitor(
    {},
    customFunctions,
    {}
);
```

---

## 10. Literals

### 10.1 Number Literals

- Integer: `42`, `-7`, `0`
- Decimal: `3.14`, `-0.5`
- Scientific notation: Not supported

### 10.2 String Literals

- Enclosed in double quotes: `"hello"`
- Escape sequences: `\"` (quote), `\\` (backslash)
- No template strings or interpolation

### 10.3 Boolean Literals

- `true`
- `false`

### 10.4 Null Literal

- `null`

### 10.5 Object Literals

**Syntax:** `{key: value, key2: value2}`

- Keys can be identifiers, strings, or numbers
- Values can be any expression

**Examples:**
```javascript
obj1 = {name: "Alice", age: 30}
obj2 = {"full-name": "Bob Smith", 0: "first"}
obj3 = {x: 1, y: 2, nested: {a: 10}}
```

### 10.6 Array Literals

**Syntax:** `[value1, value2, value3]`

- Values can be any expression

**Examples:**
```javascript
arr1 = [1, 2, 3]
arr2 = ["apple", "banana", "cherry"]
arr3 = [1, "mixed", true, null]
arr4 = [[1, 2], [3, 4]]  // Nested arrays
```

---

## 11. Comments

ProperTee supports two types of comments:

### 11.1 Single-Line Comments

**Syntax:** `// comment text`

- Starts with `//`
- Continues until the end of the line
- Ignored during parsing

**Examples:**
```javascript
// This is a single-line comment
x = 10  // Comment after code

// Multiple single-line comments
// can be used for longer explanations
```

### 11.2 Block Comments

**Syntax:** `/* comment text */`

- Starts with `/*`
- Ends with `*/`
- Can span multiple lines
- Ignored during parsing

**Examples:**
```javascript
/* This is a block comment */
x = 10

/*
This is a multi-line
block comment
*/
y = 20

z = /* inline comment */ 30
```

**Note:** Block comments do **not** nest. The first `*/` closes the comment.

```javascript
/* outer /* inner */ still in comment? */  // ⚠️ Closes at first */
```

---

## 12. Configuration Options

### 11.1 Constructor Signature

```javascript
new ProperTeeCustomVisitor(
    builtInProperties,    // Object: External properties
    builtInFunctions,     // Object: Custom functions
    ioStreams,           // Object: I/O redirection
    options              // Object: Runtime options
)
```

### 11.2 Available Options

#### `maxIterations` (number, default: 1000)
- Maximum loop iterations before limit action
- Set to `Infinity` to disable limit globally (not recommended)

#### `iterationLimitBehavior` (string, default: 'warn')
- **'warn'** (default): Output warning to stderr, break loop, continue execution
- **'error'**: Throw runtime error and stop execution completely

**Examples:**
```javascript
// Warning mode (default) - lenient
const visitor = new ProperTeeCustomVisitor({}, {}, {}, {
    maxIterations: 1000,
    iterationLimitBehavior: 'warn'  // or omit (default)
});

// Error mode - strict
const visitor = new ProperTeeCustomVisitor({}, {}, {}, {
    maxIterations: 1000,
    iterationLimitBehavior: 'error'
});

// Custom iteration limit with warning
const visitor = new ProperTeeCustomVisitor({}, {}, {}, {
    maxIterations: 5000,
    iterationLimitBehavior: 'warn'
});
```

---

## 13. Implementation Notes

### 12.1 Null vs Undefined

- `null` is a **valid value** in ProperTee
- JavaScript `undefined` should **NEVER** be returned to ProperTee scripts
- Internal implementation may use `undefined`, but runtime must convert to errors

### 12.2 JavaScript Interop

When embedding ProperTee in JavaScript:

**Passing data in:**
```javascript
const properties = {
    user: { name: "Alice", score: 100 },
    config: { debug: true }
};

const visitor = new ProperTeeCustomVisitor(properties, {}, {});
```

**Custom functions:**
```javascript
const functions = {
    'LOG': (msg) => console.log('[LOG]', msg),
    'NOW': () => Date.now()
};
```

**I/O redirection:**
```javascript
const output = [];
const ioStreams = {
    stdout: (...args) => output.push(args.join(' ')),
    stderr: (...args) => console.error(...args)
};
```

### 12.3 Error Handling in JavaScript

ProperTee runtime errors throw JavaScript `Error` objects:

```javascript
try {
    const result = visitor.visit(tree);
} catch (e) {
    console.error('Runtime Error:', e.message);
}
```

---

## 14. Complete Examples

### 13.1 Valid Programs

#### Example 1: Basic Arithmetic
```javascript
x = 10
y = 20
sum = x + y
diff = x - y
product = x * y
quotient = y / x

PRINT("Sum:", sum)           // Sum: 30
PRINT("Difference:", diff)   // Difference: -10
PRINT("Product:", product)   // Product: 200
PRINT("Quotient:", quotient) // Quotient: 2
```

#### Example 2: Object Manipulation
```javascript
person = {name: "Alice", age: 30}
person.city = "Seoul"        // Add new property
person.age = 31             // Update property

PRINT(person.name)          // Alice
PRINT(person.age)           // 31
PRINT(person.city)          // Seoul
```

#### Example 3: Array Iteration
```javascript
numbers = [1, 2, 3, 4, 5]
sum = 0

loop num in numbers do
    sum = sum + num
end

PRINT("Sum:", sum)          // Sum: 15
```

#### Example 4: Conditional with Null Check
```javascript
obj = null

if obj != null then
    PRINT(obj.value)
else
    PRINT("Object is null")  // This executes
end
```

#### Example 5: Finding Even Numbers
```javascript
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

loop idx, num in numbers do
    if num % 2 == 0 then
        PRINT("Even number at index", idx, ":", num)
    end
end
```

#### Example 6: String Processing with CHARS
```javascript
// Count vowels
text = "ProperTee"
vowels = CHARS("aeiouAEIOU")
vowelCount = 0

loop char in CHARS(text) do
    loop vowel in vowels do
        if char == vowel then
            vowelCount = vowelCount + 1
            break
        end
    end
end

PRINT("Vowel count:", vowelCount)  // 4
```

#### Example 7: CSV Processing with SPLIT
```javascript
// Parse CSV data
csv = "name,age,city\nAlice,30,Seoul\nBob,25,Busan"
lines = SPLIT(csv, "\n")

// Skip header
firstLine = true
loop line in lines do
    if firstLine then
        firstLine = false
        continue
    end
    
    columns = SPLIT(line, ",")
    name = columns.0
    age = columns.1
    city = columns.2
    
    PRINT(name, "is", age, "years old and lives in", city)
end
// Alice is 30 years old and lives in Seoul
// Bob is 25 years old and lives in Busan
```

#### Example 8: String Formatting
```javascript
// Capitalize first letter
name = "alice"
firstChar = SUBSTRING(name, 0, 1)
restChars = SUBSTRING(name, 1)
formatted = UPPERCASE(firstChar) + LOWERCASE(restChars)
PRINT(formatted)  // "Alice"

// Create acronym
words = SPLIT("ProperTee Execution Engine", " ")
acronym = ""
loop word in words do
    firstLetter = SUBSTRING(word, 0, 1)
    acronym = acronym + UPPERCASE(firstLetter)
end
PRINT(acronym)  // "PEE"
```

### 13.2 Error Cases

#### Error 1: Division by Zero
```javascript
x = 10 / 0
// ❌ Runtime Error: Division by zero
```

#### Error 2: Undefined Variable
```javascript
PRINT(unknownVar)
// ❌ Runtime Error: Variable 'unknownVar' is not defined
```

#### Error 3: Non-existent Property
```javascript
obj = {name: "Test"}
PRINT(obj.age)
// ❌ Runtime Error: Property 'age' does not exist
```

#### Error 4: Type Mismatch in Addition
```javascript
result = "hello" + 5
// ❌ Runtime Error: Addition requires both operands to be numbers or both to be strings

result = 5 + "hello"
// ❌ Runtime Error: Addition requires both operands to be numbers or both to be strings
```

#### Error 5: Type Mismatch in Arithmetic
```javascript
result = "10" - 5
// ❌ Runtime Error: Subtraction requires numeric operands

result = "5" * 2
// ❌ Runtime Error: Arithmetic operator '*' requires numeric operands

result = true / false
// ❌ Runtime Error: Arithmetic operator '/' requires numeric operands
```

#### Error 6: Null Access
```javascript
obj = null
PRINT(obj.name)
// ❌ Runtime Error: Cannot access property 'name' of null
```

#### Error 7: Type Mismatch in Comparison
```javascript
result = "10" > 5
// ❌ Runtime Error: Comparison operator '>' requires numeric operands

result = true >= false
// ❌ Runtime Error: Comparison operator '>=' requires numeric operands
```

#### Error 8: Type Mismatch in Logical Operators
```javascript
result = 1 and 0
// ❌ Runtime Error: Logical AND requires boolean operands

result = "hello" or ""
// ❌ Runtime Error: Logical OR requires boolean operands

result = not 0
// ❌ Runtime Error: Logical NOT requires boolean operand
```

#### Error 9: Type Mismatch in Unary Minus
```javascript
result = -"5"
// ❌ Runtime Error: Unary minus requires numeric operand

result = -true
// ❌ Runtime Error: Unary minus requires numeric operand
```

#### Error 10: Loop Limit Exceeded (Error Mode)
```javascript
// With iterationLimitBehavior: 'error'

counter = 0
loop counter < 10000 do
    counter = counter + 1
end
// ❌ Runtime Error: Loop exceeded maximum iterations (1000)
```

#### Warning 1: Loop Limit Exceeded (Warning Mode - Default)
```javascript
// With iterationLimitBehavior: 'warn' (default)

counter = 0
loop counter < 10000 do
    counter = counter + 1
end
// ⚠️ Warning: Loop exceeded maximum iterations (1000), stopping loop
// Execution continues

PRINT("Counter after loop:", counter)  // ✅ Prints: Counter after loop: 1001
```

---

## 15. Reserved Keywords

The following keywords are reserved and cannot be used as variable names:

- `if`, `then`, `else`, `end`
- `loop`, `in`, `do`, `infinite`
- `break`, `continue`
- `and`, `or`, `not`
- `true`, `false`, `null`

---

## 16. Operator Precedence

From highest to lowest priority:

1. Member access (`.`)
2. Unary operators (`-`, `not`)
3. Multiplicative (`*`, `/`, `%`)
4. Additive (`+`, `-`)
5. Comparison (`>`, `<`, `==`, `>=`, `<=`, `!=`)
6. Logical AND (`and`)
7. Logical OR (`or`)

Use parentheses `()` to override precedence.

---

## 17. Future Considerations

Features that may be added in future versions:

- [ ] Type conversion functions (`TO_NUMBER`, `TO_STRING`, etc.)
- [ ] Array manipulation functions (`PUSH`, `POP`, `SLICE`, etc.)
- [x] String manipulation functions (`SPLIT`, `JOIN`, `SUBSTRING`, etc.) - ✅ Implemented
- [ ] Optional chaining operator (`?.`)
- [ ] Safe property check function (`HAS(obj, "property")`)
- [x] Comments in code - ✅ Implemented (single-line `//` and block `/* */`)
- [ ] Function definitions (user-defined functions)
- [ ] Import/Export system

---

## Appendix A: Grammar Summary

For the complete ANTLR4 grammar, see `ProperTee.g4`.

Key grammar rules:
- `root`: Top-level entry point
- `statement`: Assignments, if, loop, expressions
- `expression`: Operators, member access, atoms
- `atom`: Literals (number, string, boolean, null, object, array)

---

## Appendix B: Version History

### Version 1.0 (2026-01-25)
- Initial specification
- Basic types, operators, control flow
- Loop with `infinite` keyword
- Strict error handling (no undefined)
- Property access validation
- String manipulation functions (CHARS, SPLIT, JOIN, SUBSTRING, UPPERCASE, LOWERCASE, TRIM)
- Block comments (`/* */`) and single-line comments (`//`)

---

**End of Language Specification**
