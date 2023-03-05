import cp from 'child_process';
import { saturate, Source } from 'nsblob-stream';
import { Readable } from 'stream';

export type Input =
	| string
	| Buffer
	| Readable
	| NodeJS.ReadableStream
	| Source<any>;

export type Output = {
	exitCode: number;
	stdout: Source<{}>;
	stderr: Source<{}>;
};

export async function handle(
	child: cp.ChildProcess,
	stdin: Input | Promise<Input> = ''
): Promise<Output> {
	const stdout_p = child.stdout
		? Source.fromStream(child.stdout, {})
		: Source.fromBuffer(Buffer.alloc(0));

	const stderr_p = child.stderr
		? Source.fromStream(child.stderr, {})
		: Source.fromBuffer(Buffer.alloc(0));

	const exit_p = new Promise<number>((resolve, reject) => {
		child.on('exit', (code) => {
			if (typeof code === 'number') {
				resolve(code || child.exitCode || code);
			} else {
				reject(`Child did not return an exit code.`);
			}
		});
	});

	stdin = await stdin;

	if (typeof stdin === 'string') {
		if (stdin.length === 64) {
			child.stdin && saturate(stdin, child.stdin);
		} else if (stdin.length) {
			child.stdin?.write(stdin);
			child.stdin?.end();
		} else {
			child.stdin?.end();
		}
	} else if (stdin instanceof Uint8Array) {
		child.stdin?.write(stdin);
		child.stdin?.end();
	} else if (stdin instanceof Source) {
		stdin = await stdin.toStream();
		child.stdin && stdin.pipe(child.stdin);
	} else {
		child.stdin && stdin.pipe(child.stdin);
	}

	const stdout = await stdout_p;
	const stderr = await stderr_p;

	const exitCode = await exit_p;

	return {
		exitCode,
		stdout,
		stderr,
	};
}

export async function spawn(
	binaryPath: string,
	args: readonly string[],
	stdin: Input | Promise<Input> = '',
	options: cp.ExecOptions = {}
): Promise<Output> {
	const child = cp.spawn(binaryPath, args, options);

	return handle(child, stdin);
}

export async function exec(
	command: string,
	stdin: Input | Promise<Input> = '',
	options: cp.ExecOptions = {}
): Promise<Output> {
	const child = cp.exec(command, options);

	return handle(child, stdin);
}
