/* global DISABLE_FLAKEY */

import { createElement as h, render, Component } from '../../src/index';
import { setupScratch, teardown } from './helpers';

/** @jsx h */

function getAttributes(node) {
	let attrs = {};
	for (let i=node.attributes.length; i--; ) {
		attrs[node.attributes[i].name] = node.attributes[i].value;
	}
	return attrs;
}

// hacky normalization of attribute order across browsers.
function sortAttributes(html) {
	return html.replace(/<([a-z0-9-]+)((?:\s[a-z0-9:_.-]+=".*?")+)((?:\s*\/)?>)/gi, (s, pre, attrs, after) => {
		let list = attrs.match(/\s[a-z0-9:_.-]+=".*?"/gi).sort( (a, b) => a>b ? 1 : -1 );
		if (~after.indexOf('/')) after = '></'+pre+'>';
		return '<' + pre + list.join('') + after;
	});
}

describe('render()', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render nothing node given null', () => {
		render(null, scratch);
		let c = scratch.childNodes;
		expect(c).to.have.length(0);
	});

	it('should render an empty text node given an empty string', () => {
		render('', scratch);
		let c = scratch.childNodes;
		expect(c).to.have.length(1);
		expect(c[0].data).to.equal('');
		expect(c[0].nodeName).to.equal('#text');
	});

	it('should create empty nodes (<* />)', () => {
		render(<div />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.childNodes[0].nodeName).to.equal('DIV');

		scratch.parentNode.removeChild(scratch);
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);

		render(<span />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.childNodes[0].nodeName).to.equal('SPAN');

	});

	it('should support custom tag names', () => {
		render(<foo />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.firstChild).to.have.property('nodeName', 'FOO');

		scratch.parentNode.removeChild(scratch);
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);

		render(<x-bar />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.firstChild).to.have.property('nodeName', 'X-BAR');
	});

	// Not supported currently
	xit('should append new elements when called without a merge argument', () => {
		render(<div />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.firstChild).to.have.property('nodeName', 'DIV');

		render(<span />, scratch);
		expect(scratch.childNodes).to.have.length(2);
		expect(scratch.childNodes[0]).to.have.property('nodeName', 'DIV');
		expect(scratch.childNodes[1]).to.have.property('nodeName', 'SPAN');
	});

	it('should merge new elements when called twice', () => {
		render(<div />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.firstChild).to.have.property('nodeName', 'DIV');

		render(<span />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.firstChild).to.have.property('nodeName', 'SPAN');
	});

	it('should nest empty nodes', () => {
		render((
			<div>
				<span />
				<foo />
				<x-bar />
			</div>
		), scratch);

		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.childNodes[0].nodeName).to.equal('DIV');

		let c = scratch.childNodes[0].childNodes;
		expect(c).to.have.length(3);
		expect(c[0].nodeName).to.equal('SPAN');
		expect(c[1].nodeName).to.equal('FOO');
		expect(c[2].nodeName).to.equal('X-BAR');
	});

	it('should not render falsy values', () => {
		render((
			<div>
				{null},{undefined},{false},{0},{NaN}
			</div>
		), scratch);

		expect(scratch.firstChild).to.have.property('innerHTML', ',,,0,NaN');
	});

	it('should not render null', () => {
		render(null, scratch);
		expect(scratch.innerHTML).to.equal('');
	});

	it('should not render undefined', () => {
		render(undefined, scratch);
		expect(scratch.innerHTML).to.equal('');
	});

	it('should not render boolean true', () => {
		render(true, scratch);
		expect(scratch.innerHTML).to.equal('');
	});

	it('should not render boolean false', () => {
		render(false, scratch);
		expect(scratch.innerHTML).to.equal('');
	});

	it('should render NaN as text content', () => {
		render(NaN, scratch);
		expect(scratch.innerHTML).to.equal('NaN');
	});

	it('should render numbers (0) as text content', () => {
		render(0, scratch);
		expect(scratch.innerHTML).to.equal('0');
	});

	it('should render numbers (42) as text content', () => {
		render(42, scratch);
		expect(scratch.innerHTML).to.equal('42');
	});

	it('should render strings as text content', () => {
		render('Testing, huh! How is it going?', scratch);
		expect(scratch.innerHTML).to.equal('Testing, huh! How is it going?');
	});

	it('should clear falsy attributes', () => {
		render((
			<div anull="anull" aundefined="aundefined" afalse="afalse" anan="aNaN" a0="a0" />
		), scratch);

		render((
			<div anull={null} aundefined={undefined} afalse={false} anan={NaN} a0={0} />
		), scratch);

		expect(getAttributes(scratch.firstChild), 'from previous truthy values').to.eql({
			a0: '0',
			anan: 'NaN'
		});

	});

	it('should not render falsy attributes on hydrate', () => {
		render((
			<div anull={null} aundefined={undefined} afalse={false} anan={NaN} a0={0} />
		), scratch);

		expect(getAttributes(scratch.firstChild), 'initial render').to.eql({
			a0: '0',
			anan: 'NaN'
		});
	});

	it('should clear falsy input values', () => {
		render((
			<div>
				<input value={0} />
				<input value={false} />
				<input value={null} />
				<input value={undefined} />
			</div>
		), scratch);

		let root = scratch.firstChild;
		expect(root.children[0]).to.have.property('value', '0');
		expect(root.children[1]).to.have.property('value', 'false');
		expect(root.children[2]).to.have.property('value', '');
		expect(root.children[3]).to.have.property('value', '');
	});

	it('should clear falsy DOM properties', () => {
		function test(val) {
			render((
				<div>
					<input value={val} />
					<table border={val} />
				</div>
			), scratch);
		}

		test('2');
		test(false);
		expect(scratch).to.have.property('innerHTML', '<div><input><table></table></div>', 'for false');

		test('3');
		test(null);
		expect(scratch).to.have.property('innerHTML', '<div><input><table></table></div>', 'for null');

		test('4');
		test(undefined);
		expect(scratch).to.have.property('innerHTML', '<div><input><table></table></div>', 'for undefined');
	});

	it('should apply string attributes', () => {
		render(<div foo="bar" data-foo="databar" />, scratch);

		let div = scratch.childNodes[0];
		expect(div.attributes.length).to.equal(2);

		expect(div.attributes[0].name).to.equal('foo');
		expect(div.attributes[0].value).to.equal('bar');

		expect(div.attributes[1].name).to.equal('data-foo');
		expect(div.attributes[1].value).to.equal('databar');
	});

	it('should not serialize function props as attributes', () => {
		render(<div click={function a(){}} ONCLICK={function b(){}} />, scratch);

		let div = scratch.childNodes[0];
		expect(div.attributes.length).to.equal(0);
	});

	it('should serialize object props as attributes', () => {
		render(<div foo={{ a: 'b' }} bar={{ toString() { return 'abc'; } }} />, scratch);

		let div = scratch.childNodes[0];
		expect(div.attributes.length).to.equal(2);

		expect(div.attributes[0].name).equal('foo');
		expect(div.attributes[0].value).equal('[object Object]');

		expect(div.attributes[1].name).equal('bar');
		expect(div.attributes[1].value).equal('abc');
	});

	it('should apply class as String', () => {
		render(<div class="foo" />, scratch);
		expect(scratch.childNodes[0]).to.have.property('className', 'foo');
	});

	it('should alias className to class', () => {
		render(<div className="bar" />, scratch);
		expect(scratch.childNodes[0]).to.have.property('className', 'bar');
	});

	describe('style attribute', () => {
		// Not supported currently
		xit('should apply style as String', () => {
			render(<div style="top:5px; position:relative;" />, scratch);
			expect(scratch.childNodes[0].style.cssText)
				.that.matches(/top\s*:\s*5px\s*/)
				.and.matches(/position\s*:\s*relative\s*/);
		});

		// Not supported currently
		xit('should properly switch from string styles to object styles and back', () => {
			render((
				<div style="display: inline;">test</div>
			), scratch);

			let root = scratch.firstChild;
			expect(root.style.cssText).to.equal('display: inline;');

			render((
				<div style={{ color: 'red' }} />
			), scratch);

			expect(root.style.cssText).to.equal('color: red;');

			render((
				<div style="color: blue" />
			), scratch);

			expect(root.style.cssText).to.equal('color: blue;');

			render((
				<div style={{ color: 'yellow' }} />
			), scratch);

			expect(root.style.cssText).to.equal('color: yellow;');

			render((
				<div style="display: block" />
			), scratch);

			expect(root.style.cssText).to.equal('display: block;');
		});

		it('should serialize style objects', () => {
			render((
				<div style={{
					color: 'rgb(255, 255, 255)',
					background: 'rgb(255, 100, 0)',
					backgroundPosition: '10px 10px',
					'background-size': 'cover',
					padding: 5,
					top: 100,
					left: '100%'
				}}
				>
					test
				</div>
			), scratch);

			let root = scratch.firstChild;
			let { style } = root;
			expect(style).to.have.property('color').that.equals('rgb(255, 255, 255)');
			expect(style).to.have.property('background').that.contains('rgb(255, 100, 0)');
			expect(style).to.have.property('backgroundPosition').that.equals('10px 10px');
			expect(style).to.have.property('backgroundSize', 'cover');
			expect(style).to.have.property('padding', '5px');
			expect(style).to.have.property('top', '100px');
			expect(style).to.have.property('left', '100%');

			render((
				<div style={{ color: 'rgb(0, 255, 255)' }}>test</div>
			), scratch);

			expect(root.style.cssText).to.equal('color: rgb(0, 255, 255);');

			render((
				<div style={{ backgroundColor: 'rgb(0, 255, 255)' }}>test</div>
			), scratch);

			expect(root.style.cssText).to.equal('background-color: rgb(0, 255, 255);');
		});

	});

	describe('event handling', () => {
		let proto;

		function fireEvent(on, type) {
			let e = document.createEvent('Event');
			e.initEvent(type, true, true);
			on.dispatchEvent(e);
		}

		beforeEach(() => {
			proto = document.createElement('div').constructor.prototype;

			sinon.spy(proto, 'addEventListener');
			sinon.spy(proto, 'removeEventListener');
		});

		afterEach(() => {
			proto.addEventListener.restore();
			proto.removeEventListener.restore();
		});

		it('should only register on* functions as handlers', () => {
			let click = () => {},
				onclick = () => {};

			render(<div click={click} onClick={onclick} />, scratch);

			expect(scratch.childNodes[0].attributes.length).to.equal(0);

			expect(proto.addEventListener).to.have.been.calledOnce
				.and.to.have.been.calledWithExactly('click', sinon.match.func, false);
		});

		it('should add event handlers with a normalized event name', () => {
			let click = sinon.spy(),
				mousedown = sinon.spy();

			render(<div onClick={() => click(1)} onMouseDown={mousedown} />, scratch);

			expect(proto.addEventListener).to.have.been.calledTwice
				.and.to.have.been.calledWith('click')
				.and.calledWith('mousedown');

			fireEvent(scratch.childNodes[0], 'click');
			expect(click).to.have.been.calledOnce
				.and.calledWith(1);
		});

		it('should update event handlers', () => {
			let click1 = sinon.spy();
			let click2 = sinon.spy();

			render(<div onClick={click1} />, scratch);

			fireEvent(scratch.childNodes[0], 'click');
			expect(click1).to.have.been.calledOnce;
			expect(click2).to.not.have.been.called;

			click1.resetHistory();
			click2.resetHistory();

			render(<div onClick={click2} />, scratch);

			fireEvent(scratch.childNodes[0], 'click');
			expect(click1).to.not.have.been.called;
			expect(click2).to.have.been.called;
		});

		it('should remove event handlers', () => {
			let click = sinon.spy(),
				mousedown = sinon.spy();

			render(<div onClick={() => click(1)} onMouseDown={mousedown} />, scratch);
			render(<div onClick={() => click(2)} />, scratch);

			expect(proto.removeEventListener)
				.to.have.been.calledWith('mousedown');

			fireEvent(scratch.childNodes[0], 'mousedown');
			expect(mousedown).not.to.have.been.called;

			proto.removeEventListener.resetHistory();
			click.resetHistory();
			mousedown.resetHistory();

			render(<div />, scratch);

			expect(proto.removeEventListener)
				.to.have.been.calledWith('click');

			fireEvent(scratch.childNodes[0], 'click');
			expect(click).not.to.have.been.called;
		});

		it('should use capturing for event props ending with *Capture', () => {
			let click = sinon.spy(),
				focus = sinon.spy();

			render((
				<div onClickCapture={click} onFocusCapture={focus}>
					<button />
				</div>
			), scratch);

			let root = scratch.firstChild;
			root.firstElementChild.click();
			root.firstElementChild.focus();

			expect(click, 'click').to.have.been.calledOnce;

			if (DISABLE_FLAKEY!==true) {
				// Focus delegation requires a 50b hack I'm not sure we want to incur
				expect(focus, 'focus').to.have.been.calledOnce;

				// IE doesn't set it
				expect(click).to.have.been.calledWithMatch({ eventPhase: 0 });		// capturing
				expect(focus).to.have.been.calledWithMatch({ eventPhase: 0 });		// capturing
			}
		});
	});

	describe('dangerouslySetInnerHTML', () => {
		it('should support dangerouslySetInnerHTML', () => {
			let html = '<b>foo &amp; bar</b>';
			// eslint-disable-next-line react/no-danger
			let root = render(<div dangerouslySetInnerHTML={{ __html: html }} />, scratch);

			expect(scratch.firstChild, 'set').to.have.property('innerHTML', html);
			expect(scratch.innerHTML).to.equal('<div>'+html+'</div>');

			root = render(<div>a<strong>b</strong></div>, scratch, root);

			expect(scratch, 'unset').to.have.property('innerHTML', `<div>a<strong>b</strong></div>`);

			// eslint-disable-next-line react/no-danger
			render(<div dangerouslySetInnerHTML={{ __html: html }} />, scratch, root);

			expect(scratch.innerHTML, 're-set').to.equal('<div>'+html+'</div>');
		});

		it('should apply proper mutation for VNodes with dangerouslySetInnerHTML attr', () => {
			class Thing extends Component {
				constructor(props, context) {
					super(props, context);
					this.state.html = this.props.html;
				}
				render(props, { html }) {
					// eslint-disable-next-line react/no-danger
					return html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <div />;
				}
			}

			let thing;

			render(<Thing ref={c => thing=c} html="<b><i>test</i></b>" />, scratch);

			expect(scratch.innerHTML).to.equal('<div><b><i>test</i></b></div>');

			thing.setState({ html: false });
			thing.forceUpdate();

			expect(scratch.innerHTML).to.equal('<div></div>');

			thing.setState({ html: '<foo><bar>test</bar></foo>' });
			thing.forceUpdate();

			expect(scratch.innerHTML).to.equal('<div><foo><bar>test</bar></foo></div>');
		});

		it('should hydrate with dangerouslySetInnerHTML', () => {
			let html = '<b>foo &amp; bar</b>';
			scratch.innerHTML = `<div>${html}</div>`;
			// eslint-disable-next-line react/no-danger
			render(<div dangerouslySetInnerHTML={{ __html: html }} />, scratch, scratch.lastChild);

			expect(scratch.firstChild).to.have.property('innerHTML', html);
			expect(scratch.innerHTML).to.equal(`<div>${html}</div>`);
		});
	});

	it('should reconcile mutated DOM attributes', () => {
		let check = p => render(<input type="checkbox" checked={p} />, scratch, scratch.lastChild),
			value = () => scratch.lastChild.checked,
			setValue = p => scratch.lastChild.checked = p;
		check(true);
		expect(value()).to.equal(true);
		check(false);
		expect(value()).to.equal(false);
		check(true);
		expect(value()).to.equal(true);
		setValue(true);
		check(false);
		expect(value()).to.equal(false);
		setValue(false);
		check(true);
		expect(value()).to.equal(true);
	});

	it('should ignore props.children if children are manually specified', () => {
		expect(
			<div a children={['a', 'b']}>c</div>
		).to.eql(
			<div a>c</div>
		);
	});

	it('should reorder child pairs', () => {
		let root = render((
			<div>
				<a>a</a>
				<b>b</b>
			</div>
		), scratch, root);

		let a = scratch.firstChild.firstChild;
		let b = scratch.firstChild.lastChild;

		expect(a).to.have.property('nodeName', 'A');
		expect(b).to.have.property('nodeName', 'B');

		root = render((
			<div>
				<b>b</b>
				<a>a</a>
			</div>
		), scratch, root);

		expect(scratch.firstChild.firstChild).to.have.property('nodeName', 'B');
		expect(scratch.firstChild.lastChild).to.have.property('nodeName', 'A');
		expect(scratch.firstChild.firstChild).to.equal(b);
		expect(scratch.firstChild.lastChild).to.equal(a);
	});

	it('should not merge attributes with node created by the DOM', () => {
		const html = (htmlString) => {
			const div = document.createElement('div');
			div.innerHTML = htmlString;
			return div.firstChild;
		};

		const DOMElement = html`<div><a foo="bar"></a></div>`;
		const preactElement = <div><a /></div>;

		render(preactElement, scratch, DOMElement);
		expect(scratch).to.have.property('innerHTML', '<div><a></a></div>');
	});

	it('should skip non-preact elements', () => {
		class Foo extends Component {
			render() {
				let alt = this.props.alt || this.state.alt || this.alt;
				let c = [
					<a>foo</a>,
					<b>{ alt?'alt':'bar' }</b>
				];
				if (alt) c.reverse();
				return <div>{c}</div>;
			}
		}

		let comp;
		let root = render(<Foo ref={c => comp = c} />, scratch, root);

		let c = document.createElement('c');
		c.textContent = 'baz';
		comp.base.appendChild(c);

		let b = document.createElement('b');
		b.textContent = 'bat';
		comp.base.appendChild(b);

		expect(scratch.firstChild.children, 'append').to.have.length(4);

		comp.forceUpdate();

		expect(scratch.firstChild.children, 'forceUpdate').to.have.length(4);
		expect(scratch.innerHTML, 'forceUpdate').to.equal(`<div><a>foo</a><b>bar</b><c>baz</c><b>bat</b></div>`);

		comp.alt = true;
		comp.forceUpdate();

		expect(scratch.firstChild.children, 'forceUpdate alt').to.have.length(4);
		expect(scratch.innerHTML, 'forceUpdate alt').to.equal(`<div><b>alt</b><a>foo</a><c>baz</c><b>bat</b></div>`);

		// Re-rendering from the root is non-destructive if the root was a previous render:
		comp.alt = false;
		root = render(<Foo ref={c => comp = c} />, scratch, root);

		expect(scratch.firstChild.children, 'root re-render').to.have.length(4);
		expect(scratch.innerHTML, 'root re-render').to.equal(`<div><a>foo</a><b>bar</b><c>baz</c><b>bat</b></div>`);

		comp.alt = true;
		root = render(<Foo ref={c => comp = c} />, scratch, root);

		expect(scratch.firstChild.children, 'root re-render 2').to.have.length(4);
		expect(scratch.innerHTML, 'root re-render 2').to.equal(`<div><b>alt</b><a>foo</a><c>baz</c><b>bat</b></div>`);

		root = render(<div><Foo ref={c => comp = c} /></div>, scratch, root);

		expect(scratch.firstChild.children, 'root re-render changed').to.have.length(3);
		expect(scratch.innerHTML, 'root re-render changed').to.equal(`<div><div><a>foo</a><b>bar</b></div><c>baz</c><b>bat</b></div>`);
	});

	// Discussion: https://github.com/developit/preact/issues/287
	('HTMLDataListElement' in window ? it : xit)('should allow <input list /> to pass through as an attribute', () => {
		render((
			<div>
				<input type="range" min="0" max="100" list="steplist" />
				<datalist id="steplist">
					<option>0</option>
					<option>50</option>
					<option>100</option>
				</datalist>
			</div>
		), scratch);

		let html = scratch.firstElementChild.firstElementChild.outerHTML;
		expect(sortAttributes(html)).to.equal(sortAttributes('<input type="range" min="0" max="100" list="steplist">'));
	});

	it('should not execute append operation when child is at last', (done) => {
		let input;
		class TodoList extends Component {
			constructor(props) {
				super(props);
				this.state = { todos: [], text: '' };
				this.setText = this.setText.bind(this);
				this.addTodo = this.addTodo.bind(this);
			}
			setText(e) {
				this.setState({ text: e.target.value });
			}
			addTodo() {
				let { todos, text } = this.state;
				todos = todos.concat({ text });
				this.setState({ todos, text: '' });
			}
			render() {
				const { todos, text } = this.state;
				return (
					<div onKeyDown={this.addTodo}>
						{ todos.map( todo => (<div>{todo.text}</div> )) }
						<input value={text} onInput={this.setText} ref={(i) => input = i} />
					</div>
				);
			}
		}
		const root = render(<TodoList />, scratch);
		input.focus();
		input.value = 1;
		root._component.setText({
			target: input
		});
		root._component.addTodo();
		expect(document.activeElement).to.equal(input);
		setTimeout(() => {
			expect(/1/.test(scratch.innerHTML)).to.equal(true);
			done();
		}, 10);
	});
});
