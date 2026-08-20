// Minimal Debug Adapter for ProperTee — launches the CLI and streams its output.
//
// ProperTee's runtime has no debug protocol (no breakpoints/stepping — the cooperative
// scheduler is deterministic, and the language's own `debug` statement prints state), so this
// adapter implements just enough of DAP for the F5 / "Run Without Debugging" UX: launch the
// configured runtime, forward stdout/stderr to the Debug Console, report the exit code, and
// answer breakpoint requests with "unverified". Deliberately dependency-free (no vscode import,
// no DAP wire framing — the inline-implementation host passes protocol messages as objects), so
// it can be exercised directly under node.

const { spawn } = require('child_process');
const path = require('path');

class Emitter {
    constructor() { this._listeners = []; }
    get event() {
        return (listener) => {
            this._listeners.push(listener);
            return { dispose: () => { this._listeners = this._listeners.filter(l => l !== listener); } };
        };
    }
    fire(value) { for (const l of this._listeners.slice()) l(value); }
}

class ProperTeeDebugAdapter {
    constructor() {
        this._emitter = new Emitter();
        this._seq = 1;
        this._child = null;
        this._terminatedSent = false;
    }

    // --- vscode.DebugAdapter interface -------------------------------------------------------

    get onDidSendMessage() { return this._emitter.event; }

    handleMessage(message) {
        if (message.type === 'request') this._dispatch(message);
    }

    dispose() { this._kill(); }

    // --- protocol ----------------------------------------------------------------------------

    _send(message) { message.seq = this._seq++; this._emitter.fire(message); }

    _respond(request, body, success = true, errorMessage = undefined) {
        this._send({
            type: 'response', request_seq: request.seq, command: request.command,
            success, message: errorMessage, body
        });
    }

    _event(event, body) { this._send({ type: 'event', event, body }); }

    _output(category, text) { this._event('output', { category, output: text }); }

    _dispatch(request) {
        switch (request.command) {
            case 'initialize':
                this._respond(request, {
                    supportsConfigurationDoneRequest: true,
                    supportsTerminateRequest: true
                });
                this._event('initialized');
                return;

            case 'launch':
                this._launch(request);
                return;

            case 'configurationDone':
            case 'setExceptionBreakpoints':
            case 'setFunctionBreakpoints':
            case 'pause':
            case 'next':
            case 'stepIn':
            case 'stepOut':
                this._respond(request, {});
                return;

            case 'setBreakpoints': {
                const requested = (request.arguments && request.arguments.breakpoints) || [];
                this._respond(request, {
                    breakpoints: requested.map(() => ({
                        verified: false,
                        message: 'ProperTee runs to completion — breakpoints are not supported.'
                    }))
                });
                return;
            }

            case 'threads':
                this._respond(request, { threads: [{ id: 1, name: 'main' }] });
                return;

            case 'stackTrace':
                this._respond(request, { stackFrames: [], totalFrames: 0 });
                return;

            case 'scopes':
                this._respond(request, { scopes: [] });
                return;

            case 'continue':
                this._respond(request, { allThreadsContinued: true });
                return;

            case 'evaluate':
                this._respond(request, undefined, false,
                    'ProperTee has no debug-time evaluation — use PRINT or the debug statement in the script.');
                return;

            case 'terminate':
            case 'disconnect':
                this._kill();
                this._respond(request, {});
                this._terminated();
                return;

            default:
                this._respond(request, {});
        }
    }

    // --- launch ------------------------------------------------------------------------------

    _launch(request) {
        const config = request.arguments || {};
        const program = config.program;
        if (!program) {
            this._respond(request, undefined, false, 'No "program" set in the launch configuration.');
            this._terminated();
            return;
        }

        const command = config.command || 'propertee2';
        const args = [...(config.commandArgs || [])];
        if (config.props && Object.keys(config.props).length > 0) {
            args.push('-p', JSON.stringify(config.props));
        }
        args.push(program, ...(config.args || []));
        const cwd = config.cwd || path.dirname(program);

        this._output('console', `${command} ${args.join(' ')}\n`);
        let child;
        try {
            child = spawn(command, args, { cwd, env: process.env });
        } catch (e) {
            this._respond(request, undefined, false, `Failed to launch '${command}': ${e.message}`);
            this._terminated();
            return;
        }
        this._child = child;

        child.on('error', (e) => {
            // e.g. ENOENT — the runtime isn't on PATH / the configured command is wrong
            this._output('stderr',
                `Failed to launch '${command}': ${e.message}\n` +
                'Set "propertee.runtime.command" (or "command" in launch.json) to the propertee2 CLI ' +
                'or e.g. command "java" with commandArgs ["-jar", "/path/to/propertee2.jar"].\n');
            this._exited(1);
        });
        child.stdout.on('data', (d) => this._output('stdout', d.toString()));
        child.stderr.on('data', (d) => this._output('stderr', d.toString()));
        child.on('close', (code) => this._exited(code === null ? 1 : code));

        this._respond(request, {});
    }

    _exited(exitCode) {
        this._child = null;
        this._event('exited', { exitCode });
        this._terminated();
    }

    _terminated() {
        if (this._terminatedSent) return;
        this._terminatedSent = true;
        this._event('terminated');
    }

    _kill() {
        if (this._child) {
            try { this._child.kill(); } catch (_) { /* already gone */ }
            this._child = null;
        }
    }
}

module.exports = { ProperTeeDebugAdapter };
