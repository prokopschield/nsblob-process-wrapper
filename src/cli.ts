#!/usr/bin/env node

import { fetch_buffer } from 'nsblob-stream';
import pretty from 'pretty-print-buffer';
import { isatty } from 'tty';

import { exec } from '.';

async function main() {
	const is_tty = isatty(process.stdout.fd);

	const output = await exec(process.argv.slice(2).join(' '), process.stdin);

	console.log('--- STANDARD OUTPUT ---');

	const stdout = await fetch_buffer(output.stdout);

	process.stdout.write(is_tty ? pretty(stdout) : stdout);

	console.log(`(${stdout.length} bytes)`);

	console.log('--- STANDARD ERROR ---');

	const stderr = await fetch_buffer(output.stderr);

	process.stdout.write(is_tty ? pretty(stderr) : stderr);

	console.log(`(${stderr.length} bytes)`);

	console.log(`EXIT CODE: ${output.exitCode}`);

	process.exit();
}

main();
