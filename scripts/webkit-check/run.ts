/**
 * `npm run check:webkit [-- <stylesheet>]`: lays the stylesheet over a mock of the three navbars in the system WebKit
 * at several widths and fails when pinning changes the pill's width, the row's widths or whether the row scrolls, or
 * when a pin sits in the scrolled content or covers a button. Mac only, not in CI.
 * Run it before every device round. It cannot show bounce or touch behaviour.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildSync } from 'esbuild';
import type { CheckResult } from './page';

const here = import.meta.dirname;

/**
 * Several widths, because a stuck state can depend on a few pixels: rc4 failed at 375, 412 and 414 and passed at 430.
 * `maxCount` is high enough for the bar to scroll at that width.
 */
const BARS = [
	...[320, 375, 390, 393, 402, 412, 414, 430].map((width) => phone(width, 15, true)),
	...[320, 360, 375, 390, 393, 402, 412, 414, 430].map((width) => phone(width, 15, false)),
	...[667, 844, 932].map((width) => phone(width, 24, false)),
	tablet(744, 20),
	tablet(1024, 24),
];

function phone(width: number, maxCount: number, floating: boolean) {
	const kind = floating ? 'floating' : 'non-floating';
	const bodyClass = floating ? 'is-mobile is-phone is-floating-nav' : 'is-mobile is-phone';
	return { name: `phone ${kind} ${width}`, width, maxCount, bodyClass };
}

function tablet(width: number, maxCount: number) {
	return { name: `iPad ${width}`, width, maxCount, bodyClass: 'is-mobile is-tablet is-floating-nav navbar-composer-tablet-bar-shown' };
}

function bundlePage(): string {
	const built = buildSync({ entryPoints: [join(here, 'page.ts')], bundle: true, format: 'iife', write: false });
	return built.outputFiles[0]?.text ?? '';
}

function pageHtml(bar: (typeof BARS)[number], styles: string, script: string): string {
	const input = JSON.stringify({ bodyClass: bar.bodyClass, maxCount: bar.maxCount });
	const base = readFileSync(join(here, 'obsidian-base.css'), 'utf8');
	return `<!doctype html><meta charset="utf-8"><style>${base}</style><style>${styles}</style><body>
<script>window.checkInput = ${input};</script><script>${script}</script>`;
}

function main(): number {
	if (process.platform !== 'darwin') {
		console.error('check:webkit needs macOS (system WebKit and swift).');
		return 1;
	}
	const stylesheet = resolve(process.argv[2] ?? join(here, '../../styles.css'));
	const styles = readFileSync(stylesheet, 'utf8');
	const script = bundlePage();
	const dir = mkdtempSync(join(tmpdir(), 'navbar-webkit-'));
	let failed = 0;
	try {
		for (const bar of BARS) {
			const file = join(dir, 'bar.html');
			writeFileSync(file, pageHtml(bar, styles, script));
			const output = execFileSync('swift', [join(here, 'load.swift'), file, String(bar.width)], { encoding: 'utf8' });
			const { cases, failures } = JSON.parse(output) as CheckResult;
			failed += failures.length;
			console.log(`${bar.name}: ${cases} cases, ${failures.length} failures`);
			for (const failure of failures.slice(0, 6)) console.log(`  ${failure}`);
			for (const way of ['pins switched on', 'going up', 'coming down']) {
				const count = failures.filter((failure) => failure.includes(way)).length;
				if (count > 0) console.log(`  ${way}: ${count} failures`);
			}
		}
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
	return failed === 0 ? 0 : 1;
}

process.exitCode = main();
