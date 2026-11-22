/**
 * Runtime versions of the DOM helpers Obsidian adds to Node and Element
 * (`createEl`, `addClass`, ...). The `obsidian` typings already declare them;
 * this file supplies the behaviour so code under test can call them in jsdom.
 */

type ClassOption = string | string[];

interface ElementOptions {
	cls?: ClassOption;
	text?: string;
	attr?: Record<string, string>;
}

function applyOptions(el: HTMLElement, options: ElementOptions = {}): HTMLElement {
	if (options.cls !== undefined) el.addClass(...[options.cls].flat());
	if (options.text !== undefined) el.setText(options.text);
	for (const [name, value] of Object.entries(options.attr ?? {})) {
		el.setAttr(name, value);
	}
	return el;
}

function createEl(this: Node, tag: string, options?: ElementOptions): HTMLElement {
	const owner = this.ownerDocument ?? (this as Document);
	const el = owner.createElement(tag);
	this.appendChild(el);
	return applyOptions(el, options);
}

function createDiv(this: Node, options?: ElementOptions): HTMLElement {
	return createEl.call(this, 'div', options);
}

function createSpan(this: Node, options?: ElementOptions): HTMLElement {
	return createEl.call(this, 'span', options);
}

function empty(this: Element): void {
	this.replaceChildren();
}

function addClass(this: Element, ...classes: string[]): void {
	this.classList.add(...classes);
}

function removeClass(this: Element, ...classes: string[]): void {
	this.classList.remove(...classes);
}

function toggleClass(this: Element, cls: string, on: boolean): void {
	this.classList.toggle(cls, on);
}

function hasClass(this: Element, cls: string): boolean {
	return this.classList.contains(cls);
}

function setCssProps(this: HTMLElement, props: Record<string, string>): void {
	for (const [name, value] of Object.entries(props)) {
		this.style.setProperty(name, value);
	}
}

function setText(this: Node, text: string): void {
	this.textContent = text;
}

function setAttr(this: Element, name: string, value: string): void {
	this.setAttribute(name, value);
}

function instanceOf(this: Element, type: new (...args: never[]) => unknown): boolean {
	return this instanceof type;
}

function installHelpers(target: object, helpers: Record<string, (...args: never[]) => unknown>): void {
	for (const [name, helper] of Object.entries(helpers)) {
		Object.defineProperty(target, name, {
			value: helper,
			writable: true,
			configurable: true,
		});
	}
}

installHelpers(Node.prototype, { createEl, createDiv, createSpan, setText });
installHelpers(Element.prototype, {
	empty,
	addClass,
	removeClass,
	toggleClass,
	hasClass,
	setAttr,
	instanceOf,
});
installHelpers(HTMLElement.prototype, { setCssProps });

Object.assign(globalThis, { activeDocument: document, activeWindow: window });
