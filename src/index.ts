import cp from 'child_process';
import { saturate, store } from 'nsblob-stream';
import { Readable } from 'stream';

export type Input = string | Buffer | Readable;

export type Output = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

export async function exec(
	binaryPath: string,
	stdin: Input | Promise<Input> = '',
	options: cp.ExecOptions = {}
): Promise<Output> {
	const child = cp.exec(binaryPath, options);

	const stdout_p = child.stdout ? store(child.stdout) : '';
	const stderr_p = child.stderr ? store(child.stderr) : '';

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
