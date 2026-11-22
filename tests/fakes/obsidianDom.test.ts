import { describe, expect, it } from 'vitest';

describe('Obsidian DOM helpers', () => {
	it('createEl appends a child with its classes, text and attributes', () => {
		const host = document.createElement('div');

		const child = host.createEl('section', {
			cls: ['panel', 'wide'],
			text: 'Hello',
			attr: { 'data-role': 'card' },
		});

		expect(host.lastElementChild).toBe(child);
		expect(child.tagName).toBe('SECTION');
		expect(child.classList.contains('panel')).toBe(true);
		expect(child.classList.contains('wide')).toBe(true);
		expect(child.textContent).toBe('Hello');
		expect(child.getAttribute('data-role')).toBe('card');
	});

	it('instanceOf reports whether an element is of the given DOM type', () => {
		const el = document.createElement('div');

		expect(el.instanceOf(HTMLDivElement)).toBe(true);
		expect(el.instanceOf(HTMLSpanElement)).toBe(false);
	});

	it('setAttr sets a named attribute on an element', () => {
		const el = document.createElement('div');

		el.setAttr('data-state', 'open');

		expect(el.getAttribute('data-state')).toBe('open');
	});

	it('setText replaces the text content of an element', () => {
		const el = document.createElement('span');
		el.setText('first');

		el.setText('second');

		expect(el.textContent).toBe('second');
	});

	it('exposes activeDocument and activeWindow as the jsdom document and window', () => {
		expect(activeDocument).toBe(document);
		expect(activeWindow).toBe(window);
	});

	it('setCssProps writes custom properties to the inline style', () => {
		const el = document.createElement('div');

		el.setCssProps({ '--navbar-composer-order': '3' });

		expect(el.style.getPropertyValue('--navbar-composer-order')).toBe('3');
	});

	it('addClass and removeClass accept several class names at once', () => {
		const el = document.createElement('div');

		el.addClass('a', 'b');
		expect(el.hasClass('a') && el.hasClass('b')).toBe(true);

		el.removeClass('a', 'b');
		expect(el.hasClass('a') || el.hasClass('b')).toBe(false);
	});

	it('toggleClass adds and removes a class that hasClass reports', () => {
		const el = document.createElement('div');

		el.toggleClass('open', true);
		expect(el.hasClass('open')).toBe(true);

		el.toggleClass('open', false);
		expect(el.hasClass('open')).toBe(false);
	});

	it('empty removes every child of the element', () => {
		const host = document.createElement('div');
		host.createSpan({ text: 'a' });
		host.createSpan({ text: 'b' });

		host.empty();

		expect(host.childNodes).toHaveLength(0);
	});

	it('createDiv and createSpan append a div and a span', () => {
		const host = document.createElement('div');

		const box = host.createDiv({ cls: 'box' });
		const label = host.createSpan({ text: 'label' });

		expect(box.tagName).toBe('DIV');
		expect(box.classList.contains('box')).toBe(true);
		expect(label.tagName).toBe('SPAN');
		expect(label.textContent).toBe('label');
		expect(Array.from(host.children)).toEqual([box, label]);
	});
});
