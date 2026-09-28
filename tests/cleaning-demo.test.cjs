const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}
function harness(reducedMotion = false) {
  const values = [], effects = [], timers = new Map();
  let cursor = 0, timerId = 0, observe;
  const react = { ...require('react'), useState(initial) {
    const index = cursor++;
    if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
    return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value; }];
  }, useRef(initial) {
    const index = cursor++;
    return values[index] ||= { current: initial };
  }, useEffect(run, deps) {
    const index = cursor++;
    const previous = values[index];
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
      effects.push(() => { previous?.cleanup?.(); values[index] = { deps, cleanup: run() }; });
    }
  } };
  const context = { exports: {}, window: {
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
  }, IntersectionObserver: class {
    constructor(callback) { observe = callback; }
    observe() {} disconnect() {}
  }, require: id => id === 'react' ? react : id.startsWith('@/') ? {} : require(id) };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/components/CleaningDemo.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  function render() {
    cursor = 0;
    const tree = context.exports.default();
    nodes(tree).forEach(node => { if (node.ref) node.ref.current = {}; });
    effects.splice(0).forEach(run => run());
    return tree;
  }
  function tick() { const pending = [...timers.values()]; timers.clear(); pending.forEach(run => run()); return render(); }
  return { render, tick, timers, visible(value) { observe?.([{ isIntersecting: value }]); render(); },
    step() { return nodes(render()).find(n => n.props['aria-current'] === 'step').props.children[1]; },
    select(label) { nodes(render()).find(n => n.type === 'button' && n.props.children[1] === label).props.onClick(); render(); },
    toggle() { nodes(render()).find(n => n.props.className === 'cl-sim-play').props.onClick(); render(); },
  };
}

test('simulation autoplays in view, pauses offscreen, and respects manual pause', () => {
  const demo = harness(); demo.render();
  assert.equal(demo.timers.size, 0);
  demo.visible(true);
  assert.equal(demo.timers.size, 1);
  demo.tick(); assert.equal(demo.step(), 'Landing page');
  demo.visible(false); assert.equal(demo.timers.size, 0);
  demo.visible(true); demo.toggle();
  demo.visible(false); demo.visible(true);
  assert.equal(demo.timers.size, 0);
});
test('clicking a step resumes there and clicking the same step restarts its timer', () => {
  const demo = harness(); demo.render(); demo.visible(true); demo.toggle();
  demo.select('AI conversation');
  assert.equal(demo.step(), 'AI conversation'); assert.equal(demo.timers.size, 1);
  const firstTimer = [...demo.timers.keys()][0];
  demo.select('AI conversation');
  assert.notEqual([...demo.timers.keys()][0], firstTimer);
  demo.tick(); assert.equal(demo.step(), 'Appointment');
  demo.select('Your sales call'); demo.tick();
  assert.equal(demo.timers.size, 0);
  demo.toggle(); assert.equal(demo.step(), 'Google search'); assert.equal(demo.timers.size, 1);
});
test('reduced-motion visitors can start playback manually', () => {
  const demo = harness(true); demo.render(); demo.visible(true);
  assert.equal(demo.timers.size, 0);
  demo.toggle(); assert.equal(demo.timers.size, 1);
});

