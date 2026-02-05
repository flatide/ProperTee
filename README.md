# ProperTee

**ProperTee** is a lightweight scripting language for property-based data processing. It features intuitive syntax, powerful dynamic access patterns, and cooperative multithreading — designed for configuration, data transformation, and embedding in host applications.

**[Try the Online Playground](https://flatide.github.io/propertee-js/)**

## Features

- **Concise syntax**: Pascal/Lua-style `if-then-end`, `loop-do-end` block structure
- **Dynamic property access**: `.$key`, `.$(expr)` syntax for runtime key evaluation
- **First-class data structures**: Object literals `{}`, array literals `[]`
- **1-based indexing**: First array element is `.1`
- **Unified loop**: `loop` keyword covers condition, iteration, and infinite loops
- **User-defined functions**: `function` keyword for reusable logic
- **Cooperative multithreading**: `multi` blocks for safe parallel execution with thread purity
- **Comments**: Single-line (`//`) and block (`/* */`) comments
- **No null**: Empty object `{}` is the no-value sentinel
- **External function integration**: `registerExternal()` with Result pattern for host I/O

## Quick Example

```propertee
// Variables and assignment
name = "ProperTee"
version = 1.2

// Objects and arrays (1-based indexing)
config = {
    debug: true,
    ports: [8080, 8443, 3000],
    "api-key": "secret123"
}

// Array access (1-based)
firstPort = config.ports.1    // 8080
secondPort = config.ports.2   // 8443

// Dynamic property access
key = "debug"
isDebug = config.$key          // same as config.debug

// Conditionals
if isDebug then
    PRINT("Debug mode enabled")
else
    PRINT("Production mode")
end

// Loops (value iteration)
PRINT("Available ports:")
loop port in config.ports do
    PRINT("  Port:", port)
end

// Loops (key-value iteration, 1-based index)
loop idx, port in config.ports do
    PRINT("  Index:", idx, "Port:", port)
end

// Functions
function greet(name) do
    greeting = "Hello, " + name + "!"
    return greeting
end

message = greet("ProperTee")
PRINT(message)

// Parallel execution
thread worker(id) do
    PRINT("Worker " + id + " running")
    return 42
end

multi
    worker("A") -> resultA
    worker("B") -> resultB
monitor 500
    PRINT("waiting...")
end

PRINT("Results:", resultA, resultB)
```

## Documentation

- [Language Specification (Official)](grammar/LANGUAGE_SPEC.md)
  - [Function Limitations (Variadic, Async)](grammar/LANGUAGE_SPEC.md#181-current-limitations)
- [Grammar File (ANTLR4)](grammar/ProperTee.g4)
- [Grammar Reference (EBNF)](grammar.md)
- [BNF Reference](bnf.md)
- [Language Guide](guide.md)
- [Examples](examples/)

## Implementations

| Implementation | Repository | Runtime |
|---|---|---|
| **JavaScript** | [propertee-js](https://github.com/flatide/propertee-js) | Node.js (ES modules, generator-based concurrency) |
| **Java** | [propertee-java](https://github.com/flatide/propertee-java) | Java 7+ (Stepper pattern, legacy system embedding) |

Both implementations share the same ANTLR4 grammar and pass the same 41-test suite.

## Online Playground

**[https://flatide.github.io/propertee-js/](https://flatide.github.io/propertee-js/)**

An interactive web page where you can run ProperTee code directly in the browser.

### Features

- JSON properties input
- Script editor with execution
- Real-time parsing and results
- Example code (basics, property access, control flow, dynamic access)

### Embedding in a Web Page

To integrate ProperTee into your own web page, refer to the sample on GitHub:

```html
<!-- Load ProperTee bundle -->
<script src="propertee-bundle.js"></script>

<script>
// Prepare properties and script
const properties = { user: { name: "Test", score: 100 } };
const scriptText = `
PRINT("Hello,", user.name)
user.score = user.score + 10
PRINT("New score:", user.score)
`;

// Parse
const chars = new antlr4.InputStream(scriptText);
const lexer = new ProperTeeLexer(chars);
const tokens = new antlr4.CommonTokenStream(lexer);
const parser = new ProperTeeParser(tokens);
const tree = parser.root();

// Execute with scheduler
const visitor = new ProperTeeCustomVisitor(properties, {}, {
    stdout: (...args) => console.log(...args),
    stderr: (...args) => console.error(...args)
});
const scheduler = new Scheduler(visitor);
const mainGenerator = visitor.visitRoot(tree);
const result = await scheduler.run(mainGenerator);
</script>
```

Full embedding example: [scratch.html](https://github.com/flatide/propertee-js/blob/main/docs/dist/scratch.html)

### Running Locally

```bash
cd docs
python3 -m http.server 8000
# Open http://localhost:8000 in browser
```

## Implementation

ProperTee is implemented using [ANTLR4](https://www.antlr.org/).

- **Grammar file**: [`grammar/ProperTee.g4`](grammar/ProperTee.g4)
- **JavaScript bundle**: [propertee-bundle.js](https://github.com/flatide/propertee-js/blob/main/docs/dist/propertee-bundle.js)
- **Embedding sample**: [scratch.html](https://github.com/flatide/propertee-js/blob/main/docs/dist/scratch.html)

ANTLR4 generates the lexer and parser; a custom visitor pattern implements the interpreter.

## License

BSD 3-Clause License. See [LICENSE](LICENSE).
