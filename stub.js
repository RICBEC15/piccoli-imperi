"use strict";
// Stub DOM minimale per eseguire game.js sotto Node, a scopo di test.
// IMPORTANTE: setTimeout deve essere sincrono, altrimenti i turni IA non avanzano nei test.
// I callback si eseguono in coda ("a trampolino") e non uno dentro l'altro: con un impero
// per paese il giro dei turni IA fa migliaia di passi e la pila delle chiamate esploderebbe.
const _coda = [];
let _inCoda = false;
global.setTimeout = (fn) => {
  if (typeof fn !== 'function') return 0;
  _coda.push(fn);
  if (_inCoda) return 0;
  _inCoda = true;
  try { while (_coda.length) _coda.shift()(); } finally { _inCoda = false; _coda.length = 0; }
  return 0;
};
global.clearTimeout = () => {};
global.requestAnimationFrame = (fn) => { if (typeof fn === 'function') fn(); return 0; };

function makeStyle() {
  return new Proxy({}, { get: () => '', set: () => true });
}
function makeClassList() {
  const set = new Set();
  return {
    add: (...c) => c.forEach(x => set.add(x)),
    remove: (...c) => c.forEach(x => set.delete(x)),
    toggle: (c, force) => { if (force === undefined) { if (set.has(c)) set.delete(c); else set.add(c); } else if (force) set.add(c); else set.delete(c); },
    contains: (c) => set.has(c)
  };
}
function makeCtx() {
  const noop = () => {};
  const ctx = new Proxy({
    canvas: { width: 800, height: 600 },
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop,
    fill: noop, stroke: noop, fillRect: noop, clearRect: noop, strokeRect: noop,
    fillText: noop, strokeText: noop, drawImage: noop, setLineDash: noop,
    measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop: noop }),
    getImageData: () => ({ data: [] }), putImageData: noop
  }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  return ctx;
}
function makeElement(tag) {
  const ctxCache = {};
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    style: makeStyle(),
    classList: makeClassList(),
    children: [],
    attributes: {},
    _listeners: {},
    dataset: {},
    innerHTML: '', textContent: '', value: '', checked: false, disabled: false, title: '',
    width: 800, height: 600,
    files: [],
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    removeEventListener() {},
    dispatchEvent(evt) { (this._listeners[evt.type] || []).forEach(fn => fn(evt)); return true; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
    remove() {},
    click() { this.dispatchEvent({ type: 'click' }); },
    focus: () => {}, blur: () => {},
    getContext(type) { if (!ctxCache[type]) ctxCache[type] = makeCtx(); return ctxCache[type]; },
    getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0, right: 800, bottom: 600 }),
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    querySelector: () => makeElement('div'),
    querySelectorAll: () => []
  };
  return el;
}

const elementsById = {};
function getElementById(id) {
  if (!elementsById[id]) elementsById[id] = makeElement('div');
  return elementsById[id];
}

global.document = {
  _listeners: {},
  getElementById,
  createElement: (tag) => makeElement(tag),
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
  removeEventListener() {},
  dispatchEvent(evt) { (this._listeners[evt.type] || []).forEach(fn => fn(evt)); return true; },
  body: makeElement('body'),
  documentElement: makeElement('html'),
  querySelector: () => makeElement('div'),
  querySelectorAll: () => []
};

const _storage = {};
global.localStorage = {
  getItem: (k) => (k in _storage ? _storage[k] : null),
  setItem: (k, v) => { _storage[k] = String(v); },
  removeItem: (k) => { delete _storage[k]; },
  clear: () => { Object.keys(_storage).forEach(k => delete _storage[k]); }
};

global.window = global;
// le forme dei territori (v72) si disegnano con Path2D: qui basta che i metodi esistano
global.Path2D = global.Path2D || class Path2D { moveTo() {} lineTo() {} closePath() {} };
global.alert = () => {};
global.confirm = () => true;
global.URL = global.URL || { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} };
global.Blob = global.Blob || function Blob() {};
