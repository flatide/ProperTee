const vscode = require('vscode');

function activate(context) {
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

        // Dedent for: end, else, monitor
        if (/^(end|else|monitor)\b/.test(code)) {
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
