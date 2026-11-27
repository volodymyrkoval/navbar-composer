/**
 * In-page half of the WebKit layout check (see run.ts). It builds a mock navbar, drives it with the plugin's own pin,
 * overflow and scroll-mode rules, and compares the pinned layout with the unpinned one at the same button count.
 * The count is reached in three ways, because a stuck overflow state only shows when it is reached from above.
 */

import { overflowEdges } from '../../src/core/overflowEdges';
import { pinnedEdgeIds } from '../../src/core/pins';
import { LONGPRESS_MENU_MARGIN_PX, MIN_SHRUNK_BUTTON_PX, needsScrollMode } from '../../src/core/scrollMode';
import type { LayoutPins } from '../../src/core/settingsModel';

export interface CheckInput { bodyClass: string; maxCount: number }
export interface CheckResult { cases: number; failures: string[] }

type MenuPlace = 'first' | 'last';

interface Bar { pill: HTMLElement; row: HTMLElement; menu: MenuPlace; pins: LayoutPins }
interface Layout { pillWidth: number; scrollWidth: number; clientWidth: number; scrolls: boolean }

/** Matches the button width on all three bars. */
const BUTTON_PX = 52;
const START = 'navbar-composer-has-overflow-start';
const END = 'navbar-composer-has-overflow-end';
const SCROLL_MODE = 'navbar-composer-scroll-mode';
const PINS: Record<string, LayoutPins> = {
	'pin first': { pinStart: true },
	'pin last': { pinEnd: true },
	'both pins': { pinStart: true, pinEnd: true },
};

function createBar(menu: MenuPlace, pins: LayoutPins): Bar {
	document.querySelector('.mobile-navbar')?.remove();
	const pill = document.body.appendChild(document.createElement('div'));
	pill.className = 'mobile-navbar mod-raised';
	const row = pill.appendChild(document.createElement('div'));
	row.className = 'mobile-navbar-actions';
	return { pill, row, menu, pins };
}

function createButton(menu: boolean): HTMLElement {
	const button = document.createElement('div');
	button.className = `mobile-navbar-action navbar-composer-ordered${menu ? ' has-longpress-menu' : ''}`;
	button.appendChild(document.createElement('span'));
	return button;
}

/** Adds or removes plain buttons, keeping the menu button first or last, then marks the pins as the renderer does. */
function setCount(bar: Bar, count: number): void {
	const { row, menu } = bar;
	if (row.children.length === 0) row.appendChild(createButton(true));
	while (row.children.length < count) {
		if (menu === 'first') row.appendChild(createButton(false));
		else row.insertBefore(createButton(false), row.lastElementChild);
	}
	while (row.children.length > count) {
		(menu === 'first' ? row.lastElementChild : row.firstElementChild)?.remove();
	}
	markPins(bar);
}

function markPins({ row, pins }: Bar): void {
	const buttons = Array.from(row.children) as HTMLElement[];
	const ids = buttons.map((_, index) => String(index));
	const edges = pinnedEdgeIds(ids, pins);
	buttons.forEach((button, index) => {
		button.style.setProperty('--navbar-composer-order', String(index));
		button.classList.toggle('navbar-composer-pinned-start', ids[index] === edges.start);
		button.classList.toggle('navbar-composer-pinned-end', ids[index] === edges.end);
	});
}

/** One pass of `OverflowIndicator.refresh`: scroll mode first, then the edge classes. */
function refresh({ row }: Bar): void {
	const menuPx = row.querySelector('.has-longpress-menu') === null ? 0 : LONGPRESS_MENU_MARGIN_PX;
	row.classList.toggle(SCROLL_MODE, needsScrollMode(row.children.length, row.clientWidth, MIN_SHRUNK_BUTTON_PX, menuPx));
	const edges = overflowEdges(row);
	row.classList.toggle(START, edges.start);
	row.classList.toggle(END, edges.end);
}

function layoutOf({ pill, row }: Bar): Layout {
	return {
		pillWidth: Math.round(pill.getBoundingClientRect().width * 10) / 10,
		scrollWidth: row.scrollWidth,
		clientWidth: row.clientWidth,
		scrolls: row.classList.contains(START) || row.classList.contains(END),
	};
}

/** Refreshes until nothing changes, as the resize observer would. Returns `null` when the bar keeps flapping. */
function settle(bar: Bar): Layout | null {
	let previous = '';
	for (let pass = 0; pass < 8; pass++) {
		refresh(bar);
		const layout = layoutOf(bar);
		const current = JSON.stringify(layout);
		if (current === previous) return layout;
		previous = current;
	}
	return null;
}

/**
 * While the row scrolls, each pinned button is outside the scrolled content (`position: absolute`, or it would move with
 * the bounce) and sits on its row edge, 52px wide and as high as the row.
 */
function pinPositionErrors({ row }: Bar): string[] {
	row.scrollLeft = (row.scrollWidth - row.clientWidth) / 2;
	const box = row.getBoundingClientRect();
	const errors: string[] = [];
	for (const edge of ['start', 'end'] as const) {
		const element = row.querySelector(`.navbar-composer-pinned-${edge}`);
		if (element === null) continue;
		const { position } = getComputedStyle(element);
		if (position !== 'absolute') errors.push(`${edge} pin is ${position}, part of the scrolled content`);
		const pin = element.getBoundingClientRect();
		const gap = edge === 'start' ? pin.left - box.left : box.right - pin.right;
		const off = [gap, pin.top - box.top, pin.height - box.height, pin.width - BUTTON_PX];
		if (off.some((n) => Math.abs(n) > 0.5)) errors.push(`${edge} pin off by ${off.map((n) => n.toFixed(1)).join('/')}`);
	}
	return errors;
}

/** The row really scrolls, and at either end of its travel no pin covers the outermost unpinned button. */
function reachErrors({ row }: Bar): string[] {
	const unpinned = Array.from(row.children).filter((el) => !/navbar-composer-pinned-/.test(el.className));
	const rect = (selector: string): DOMRect | undefined => row.querySelector(selector)?.getBoundingClientRect();
	const errors: string[] = [];

	row.scrollLeft = 0;
	const startPin = rect('.navbar-composer-pinned-start');
	const first = unpinned[0]?.getBoundingClientRect();
	if (startPin && first && first.left < startPin.right - 0.5) errors.push('start pin covers a button');

	row.scrollLeft = row.scrollWidth;
	if (row.scrollLeft <= 0) errors.push('row cannot be scrolled');
	const endPin = rect('.navbar-composer-pinned-end');
	const last = unpinned[unpinned.length - 1]?.getBoundingClientRect();
	if (endPin && last && last.right > endPin.left + 0.5) errors.push('end pin covers a button');

	row.scrollLeft = 0;
	return errors;
}

function compare(bar: Bar, expected: Layout): string[] {
	const actual = settle(bar);
	if (actual === null) return ['never settles (flapping)'];
	const errors = actual.scrolls ? [...pinPositionErrors(bar), ...reachErrors(bar)] : [];
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		errors.push(`pins off ${describe(expected)}, pins on ${describe(actual)}`);
	}
	return errors;
}

function describe({ pillWidth, scrollWidth, clientWidth, scrolls }: Layout): string {
	return `pill ${pillWidth} row ${scrollWidth}/${clientWidth}${scrolls ? ' scrolling' : ''}`;
}

/** The unpinned layout at every count, each on a fresh bar. */
function references(menu: MenuPlace, maxCount: number): Map<number, Layout> {
	const result = new Map<number, Layout>();
	for (let count = 1; count <= maxCount; count++) {
		const bar = createBar(menu, {});
		setCount(bar, count);
		const layout = settle(bar);
		if (layout === null) throw new Error(`unpinned bar never settles at ${count}`);
		result.set(count, layout);
	}
	// A bar that never scrolls would make every comparison pass.
	if (!result.get(maxCount)?.scrolls) throw new Error(`unpinned bar does not scroll at ${maxCount} buttons`);
	return result;
}

function checkPins(menu: MenuPlace, name: string, pins: LayoutPins, input: CheckInput, out: CheckResult): void {
	const expected = references(menu, input.maxCount);
	const record = (bar: Bar, count: number, way: string): void => {
		out.cases++;
		for (const error of compare(bar, expected.get(count) as Layout)) {
			out.failures.push(`menu ${menu}, ${name}, ${count} buttons, ${way}: ${error}`);
		}
	};

	for (let count = 1; count <= input.maxCount; count++) {
		const bar = createBar(menu, {});
		setCount(bar, count);
		settle(bar);
		bar.pins = pins;
		markPins(bar);
		record(bar, count, 'pins switched on');
	}

	// One bar for the whole walk, so classes left over from the previous count carry on, as on a device.
	const walk = createBar(menu, pins);
	for (let count = 1; count <= input.maxCount; count++) {
		setCount(walk, count);
		record(walk, count, 'going up');
	}
	for (let count = input.maxCount - 1; count >= 1; count--) {
		setCount(walk, count);
		record(walk, count, 'coming down');
	}
}

function run(input: CheckInput): CheckResult {
	document.body.className = input.bodyClass;
	const out: CheckResult = { cases: 0, failures: [] };
	for (const menu of ['first', 'last'] as const) {
		for (const [name, pins] of Object.entries(PINS)) checkPins(menu, name, pins, input, out);
	}
	return out;
}

declare global {
	interface Window { checkInput: CheckInput; checkResult: string }
}

window.checkResult = JSON.stringify(run(window.checkInput));
