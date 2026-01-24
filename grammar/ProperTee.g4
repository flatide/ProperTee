/**
 * ProperTee Grammar
 * ANTLR4 Grammar Definition
 * 
 * ProperTee is a lightweight scripting language designed for 
 * property-based data processing with dynamic access capabilities.
 */

grammar ProperTee;

// ============================================================
// Parser Rules
// ============================================================

root : statement* EOF ;

statement
    : assignment    # AssignStmt
    | ifStatement   # IfStmt
    | iterationStmt # iterStmt
    | flowControl   # FlowStmt
    | expression    # ExprStmt
    ;

// Assignment
// Valid:   myVar = 10, prop.width = 20, prop.$width = 30
// Invalid: 10 = 20, (a+b) = 30

assignment
    : lvalue '=' expression
    ;

lvalue
    : ID                                     # VarLValue       // e.g., width = 10
    | lvalue '.' access                      # PropLValue      // e.g., obj.x = 10
    ;

block : statement* ;

// Control Structures

ifStatement
    : K_IF condition=expression K_THEN thenBody=block (K_ELSE elseBody=block)? K_END
    ;

iterationStmt
    : K_WHILE expression K_DO block K_END                         # WhileLoop
    | K_FOR ID (',' ID)? K_IN expression K_DO block K_END         # ForLoop
    ;

flowControl
    : K_BREAK     # BreakStmt
    | K_CONTINUE  # ContinueStmt
    ;

// Expressions (ordered by precedence, lowest to highest)

expression
    : atom                                  # AtomExpr
    | expression '.' access                 # MemberAccessExpr
    | '-' expression                        # UnaryMinusExpr
    | K_NOT expression                      # NotExpr
    | expression ('*' | '/') expression     # MultiplicativeExpr
    | expression ('+' | '-') expression     # AdditiveExpr
    | expression op=comparisonOp expression # ComparisonExpr
    | expression K_AND expression           # AndExpr
    | expression K_OR expression            # OrExpr
    ;

// Property Access Methods

access
    : ID                                    # StaticAccess      // .width
    | NUMBER                                # ArrayAccess       // .0
    | STRING                                # StringKeyAccess   // ."key"
    | '$' ID                                # VarEvalAccess     // .$key (shorthand for .$(key))
    | '$' '(' expression ')'                # EvalAccess        // .$(expr) (full form)
    ;

// Atoms (Primary Expressions)

atom
    : functionCall           # FuncAtom
    | ID                     # VarReference
    | NUMBER                 # NumberAtom
    | STRING                 # StringAtom
    | (K_TRUE | K_FALSE)     # BooleanAtom
    | objectLiteral          # ObjectAtom
    | arrayLiteral           # ArrayAtom
    | '(' expression ')'     # ParenAtom
    ;

// Function Call

functionCall
    : funcName=ID '(' (expression (',' expression)*)? ')'
    ;

// Object Literal

objectLiteral
    : '{' (objectEntry (',' objectEntry)*)? '}'
    ;

objectEntry
    : objectKey ':' expression
    ;

objectKey
    : ID                     // member: value
    | STRING                 // "key-name": value
    | NUMBER                 // 0: value
    ;

// Array Literal

arrayLiteral
    : '[' (expression (',' expression)*)? ']'
    ;

// Comparison Operators

comparisonOp : '>' | '<' | '==' | '>=' | '<=' | '!=' ;

// ============================================================
// Lexer Rules
// ============================================================

// Keywords

K_IF        : 'if';
K_THEN      : 'then';
K_ELSE      : 'else';
K_END       : 'end';
K_WHILE     : 'while';
K_FOR       : 'for';
K_IN        : 'in';
K_DO        : 'do';
K_BREAK     : 'break';
K_CONTINUE  : 'continue';
K_NOT       : 'not';
K_AND       : 'and';
K_OR        : 'or';
K_TRUE      : 'true';
K_FALSE     : 'false';
K_NULL      : 'null';

// Identifiers and Literals

ID : [a-zA-Z_][a-zA-Z0-9_]* ;
NUMBER : [0-9]+ ('.' [0-9]+)? ;
STRING : '"' ( '\\' . | ~["\\] )* '"' ;

// Comments and Whitespace

COMMENT : '//' ~[\r\n]* -> skip ;
WS : [ \t\r\n;]+ -> skip ;
