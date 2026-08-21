const vscode = require('vscode');
const path = require('path');

// The runtime invocation: settings first, overridable per launch config.
// Default assumes the `propertee2` CLI on PATH; a jar works via
// command "java" + commandArgs ["-jar", "/path/to/propertee2-<version>.jar"].
function runtimeFor(config) {
    const settings = vscode.workspace.getConfiguration('propertee');
    return {
        command: (config && config.command) || settings.get('runtime.command') || 'propertee2',
        commandArgs: (config && config.commandArgs) || settings.get('runtime.args') || []
    };
}

function activate(context) {
    // --- Run (integrated terminal) -----------------------------------------------------------
    context.subscriptions.push(
        vscode.commands.registerCommand('propertee.runFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== 'propertee') {
                vscode.window.showErrorMessage('ProperTee: open a .tee script to run.');
                return;
            }
            await editor.document.save();
            const file = editor.document.uri.fsPath;
            const { command, commandArgs } = runtimeFor(null);
            const quote = (s) => /[\s"']/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
            const line = [command, ...commandArgs, file].map(quote).join(' ');
            const terminal = vscode.window.terminals.find(t => t.name === 'ProperTee')
                || vscode.window.createTerminal({ name: 'ProperTee', cwd: path.dirname(file) });
            terminal.show(true);
            terminal.sendText(line);
        })
    );

    // --- Debug (F5 / Run Without Debugging) --------------------------------------------------
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider('propertee', {
            resolveDebugConfiguration(folder, config) {
                // F5 with no launch.json: run the active .tee file
                if (!config.type && !config.request && !config.name) {
                    const editor = vscode.window.activeTextEditor;
                    if (!editor || editor.document.languageId !== 'propertee') return undefined;
                    config = {
                        type: 'propertee', name: 'Run ProperTee script', request: 'launch',
                        program: editor.document.uri.fsPath
                    };
                }
                const runtime = runtimeFor(config);
                config.command = runtime.command;
                config.commandArgs = runtime.commandArgs;
                return config;
            }
        }),
        vscode.debug.registerDebugAdapterDescriptorFactory('propertee', {
            // 0.6.0: the runtime IS the debug adapter — `propertee2 --dap` speaks DAP on stdio
            // (runtime 0.24.0+), giving real breakpoints, stepping, stack, variables, and
            // hover/REPL evaluation. The launch configuration (program/props/noDebug) is passed
            // through to it verbatim.
            createDebugAdapterDescriptor(session) {
                const { command, commandArgs } = runtimeFor(session.configuration);
                return new vscode.DebugAdapterExecutable(command, [...commandArgs, '--dap']);
            }
        })
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('propertee', {
            provideDocumentFormattingEdits(document, options) {
                const indent = options.insertSpaces !== false
                    ? ' '.repeat(options.tabSize || 4)
                    : '\t';
                const text = document.getText();
                const formatted = formatText(text, indent);
                if (formatted === text) return [];
                return [vscode.TextEdit.replace(
                    new vscode.Range(document.positionAt(0), document.positionAt(text.length)),
                    formatted
                )];
            }
        })
    );

    // `not a == b` parses as `(not a) == b` (LANGUAGE.md §Precedence) — with a boolean a and a
    // non-boolean b this silently always yields false, so flag the shape as suspicious.
    const diagnostics = vscode.languages.createDiagnosticCollection('propertee');
    context.subscriptions.push(diagnostics);
    const refresh = (document) => {
        if (document.languageId !== 'propertee') return;
        diagnostics.set(document.uri, scanNotComparison(document));
    };
    vscode.workspace.textDocuments.forEach(refresh);
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(refresh),
        vscode.workspace.onDidChangeTextDocument(e => refresh(e.document)),
        vscode.workspace.onDidCloseTextDocument(document => diagnostics.delete(document.uri))
    );
}

// not + non-parenthesized simple operand (identifier/member chain or literal) + ==/!=.
// `not (a == b)` — the correct form — is deliberately not matched.
const NOT_COMPARISON =
    /\bnot\s+(?!\()((?:::)?[A-Za-z_]\w*(?:\.\$?[A-Za-z_]\w*|\.\d+)*|\d+(?:\.\d+)?)\s*(==|!=)/g;

function scanNotComparison(document) {
    const found = [];
    for (let line = 0; line < document.lineCount; line++) {
        const code = blankStrings(document.lineAt(line).text);
        NOT_COMPARISON.lastIndex = 0;
        let m;
        while ((m = NOT_COMPARISON.exec(code)) !== null) {
            const flipped = m[2] === '==' ? '!=' : '==';
            found.push(new vscode.Diagnostic(
                new vscode.Range(line, m.index, line, m.index + m[0].length),
                `'not ${m[1]} ${m[2]} …' parses as '(not ${m[1]}) ${m[2]} …' — 'not' binds tighter than comparison. ` +
                `If you meant to negate the comparison, write '${m[1]} ${flipped} …' or 'not (${m[1]} ${m[2]} …)'.`,
                vscode.DiagnosticSeverity.Warning
            ));
        }
    }
    return found;
}

// Blank out string contents (quotes kept) and drop the line comment, so neither can false-match.
function blankStrings(line) {
    let out = '', inStr = false, esc = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inStr) {
            if (esc) { esc = false; out += ' '; continue; }
            if (c === '\\') { esc = true; out += ' '; continue; }
            if (c === '"') { inStr = false; out += '"'; continue; }
            out += ' ';
        } else {
            if (c === '"') { inStr = true; out += '"'; continue; }
            if (c === '/' && line[i + 1] === '/') break;
            out += c;
        }
    }
    return out;
}

function formatText(text, indent) {
    const lines = text.split(/\r?\n/);
    let level = 0;
    let inBlockComment = false;
    const result = [];

    for (const raw of lines) {
        const trimmed = raw.trim();

        if (!trimmed) { result.push(''); continue; }

        // Block comment continuation
        if (inBlockComment) {
            result.push(indent.repeat(level) + trimmed);
            if (trimmed.includes('*/')) inBlockComment = false;
            continue;
        }

        // Block comment start (not closed on same line)
        if (trimmed.startsWith('/*') && !trimmed.includes('*/')) {
            result.push(indent.repeat(level) + trimmed);
            inBlockComment = true;
            continue;
        }

        // Pure line comment
        if (trimmed.startsWith('//')) {
            result.push(indent.repeat(level) + trimmed);
            continue;
        }

        // Normalize line content (keyword spacing)
        const normalized = normalizeLine(trimmed);
        const code = extractCode(normalized);

        // Dedent for: end, elseif, else, monitor
        if (/^(end|elseif|else|monitor)\b/.test(code)) {
            level = Math.max(0, level - 1);
        }

        result.push(indent.repeat(level) + normalized);

        // Indent after: then/do at EOL, standalone else/multi, monitor N
        if (/\b(then|do)\s*$/.test(code) ||
            /^(else|multi)\s*$/.test(code) ||
            /^monitor\s+\d+\s*$/.test(code)) {
            level++;
        }
    }

    return result.join('\n');
}

// Strip trailing line comment (preserving strings)
function extractCode(line) {
    let inStr = false, esc = false;
    for (let i = 0; i < line.length; i++) {
        if (esc) { esc = false; continue; }
        if (line[i] === '\\' && inStr) { esc = true; continue; }
        if (line[i] === '"') { inStr = !inStr; continue; }
        if (!inStr && line[i] === '/' && line[i + 1] === '/') {
            return line.substring(0, i).trimEnd();
        }
    }
    return line.trimEnd();
}

// Normalize keyword spacing on a single line
function normalizeLine(line) {
    const saved = [];
    let out = '', i = 0;

    // Extract strings, block comments, and line comments into placeholders
    while (i < line.length) {
        if (line[i] === '"') {
            let j = i + 1;
            while (j < line.length) {
                if (line[j] === '\\') { j += 2; continue; }
                if (line[j] === '"') { j++; break; }
                j++;
            }
            saved.push(line.substring(i, j));
            out += `\x00${saved.length - 1}\x00`;
            i = j;
        } else if (line[i] === '/' && i + 1 < line.length && line[i + 1] === '/') {
            // Line comment — normalize code so far, append comment, done
            out = normalizeCode(out);
            const comment = line.substring(i).replace(/^\/\/([^\s/])/, '// $1');
            out = out.trimEnd() + '  ' + comment.trimEnd();
            out = out.replace(/\x00(\d+)\x00/g, (_, idx) => saved[parseInt(idx)]);
            return out.trimEnd();
        } else if (line[i] === '/' && i + 1 < line.length && line[i + 1] === '*') {
            let j = line.indexOf('*/', i + 2);
            j = j === -1 ? line.length : j + 2;
            saved.push(line.substring(i, j));
            out += `\x00${saved.length - 1}\x00`;
            i = j;
        } else {
            out += line[i];
            i++;
        }
    }

    out = normalizeCode(out);
    out = out.replace(/\x00(\d+)\x00/g, (_, idx) => saved[parseInt(idx)]);
    return out.trimEnd();
}

function normalizeCode(code) {
    // Collapse multiple spaces
    code = code.replace(/ {2,}/g, ' ');

    // Space before do/then after non-word char: ")do" → ") do"
    code = code.replace(/(\S)\b(do|then)\b/g, '$1 $2');

    // Space after keywords when jammed against next token
    code = code.replace(/\b(return|if|loop|thread|monitor|not|and|or|in)\b(?=[^\s),])/g, '$1 ');

    // Space before :: after word char: "return::" → "return ::"
    code = code.replace(/([a-zA-Z0-9_])::/g, '$1 ::');

    // Space after colon in thread spawn: "thread key:func()" → "thread key: func()"
    code = code.replace(/\bthread\s+(\S+?):(?!\s)/g, 'thread $1: ');

    return code;
}

function deactivate() {}

module.exports = { activate, deactivate };
