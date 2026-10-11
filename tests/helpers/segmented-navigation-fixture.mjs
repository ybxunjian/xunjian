import assert from "node:assert/strict";
import { createSegmentedNavigationMotion } from "../../src/components/ui/segmented-navigation-controller.ts";

/** Minimal DOM geometry and clock for exercising the real controller, without copying its motion logic. */
export function navigationFixture(t, { count = 4, gap = 0, index = 0, reduced = false } = {}) {
  let width = 360, now = 100, nextFrame = 0, focused = null, destroyed = false;
  const left = 23, frames = new Map(), selections = [], captures = new Set();
  const selector = "button[data-segment-index]";
  const buttonWidth = () => (width - 8 - (count - 1) * gap) / count;
  const center = (i) => left + 4 + buttonWidth() / 2 + i * (buttonWidth() + gap);

  class Element extends EventTarget {
    constructor(kind, parent = null, index = null) {
      super();
      this.kind = kind;
      this.parent = parent;
      this.index = index;
      this.dataset = index === null ? {} : { segmentIndex: String(index) };
      this.attributes = new Map();
      this.listeners = new Map();
      this.style = { transform: "", setProperty: (key, value) => this.attributes.set(key, value) };
    }
    addEventListener(type, listener, options) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(listener);
      super.addEventListener(type, listener, options);
    }
    removeEventListener(type, listener, options) {
      this.listeners.get(type)?.delete(listener);
      super.removeEventListener(type, listener, options);
    }
    contains(node) {
      for (let current = node; current; current = current.parent) if (current === this) return true;
      return false;
    }
    closest(query) {
      assert.equal(query, selector);
      return this.kind === "button" ? this : this.parent?.closest(query) ?? null;
    }
    querySelectorAll(query) { assert.equal(query, selector); return buttons; }
    setAttribute(key, value) { this.attributes.set(key, value); }
    get clientWidth() { return width; }
    getBoundingClientRect() {
      const x = this.kind === "button" ? center(this.index) - buttonWidth() / 2 : left;
      const w = this.kind === "button" ? buttonWidth() : width;
      return { left: x, right: x + w, top: 12, bottom: 56, width: w, height: 44 };
    }
    focus(options) { focused = { index: this.index, options }; }
    setPointerCapture(id) { captures.add(id); }
    hasPointerCapture(id) { return captures.has(id); }
    releasePointerCapture(id) {
      if (captures.delete(id)) dispatch(this, "lostpointercapture", { pointerId: id });
    }
  }
  const root = new Element("root"), thumb = new Element("thumb", root), window = new Element("window");
  const buttons = Array.from({ length: count }, (_, i) => new Element("button", root, i));
  const labels = buttons.map((button) => new Element("label", button));
  const observer = { callback: null, disconnected: false };
  class ResizeObserver {
    constructor(callback) { observer.callback = callback; }
    observe(element) { assert.equal(element, root); }
    disconnect() { observer.disconnected = true; }
  }
  const globals = {
    window, Node: Element, Element, ResizeObserver, performance: { now: () => now },
    requestAnimationFrame: (callback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id) => frames.delete(id),
  };
  const originals = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    try { if (!destroyed) controller.destroy(); }
    finally {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  });
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const controller = createSegmentedNavigationMotion(root, thumb, count, index, reduced, (selected) => selections.push(selected));

  function dispatch(element, type, properties = {}) {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries(properties)) Object.defineProperty(event, key, { value });
    element.dispatchEvent(event);
    return event;
  }
  function advance(milliseconds = 16) {
    const end = now + milliseconds;
    while (now < end) {
      now = Math.min(now + 16, end);
      for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now);
    }
  }
  function settle() {
    for (let i = 0; frames.size && i < 400; i++) advance();
    assert.equal(frames.size, 0, "animation must settle without leaking frames");
  }
  function transform() {
    const match = thumb.style.transform.match(/^translate3d\(([^p]+)px,0,0\) scale\(([^,]+),([^\)]+)\)$/);
    assert.ok(match, `Unexpected thumb transform: ${thumb.style.transform}`);
    return { x: Number(match[1]), scaleX: Number(match[2]), scaleY: Number(match[3]) };
  }
  function assertAt(i) {
    assert.ok(Math.abs(transform().x - (center(i) - center(0))) < 0.001, `thumb must align with segment ${i}`);
    assert.equal(buttons.filter((button) => button.attributes.get("data-preview-active") === "true").length, 1);
    assert.equal(buttons[i].attributes.get("data-preview-active"), "true");
  }
  return {
    root, thumb, window, buttons, selections, captures, center, advance, settle, transform, assertAt,
    get pendingFrames() { return frames.size; },
    get focused() { return focused; },
    get observerDisconnected() { return observer.disconnected; },
    pointer(type, x, properties = {}, element = root) {
      return dispatch(element, type, { isPrimary: true, button: 0, pointerId: 1, clientX: x, clientY: 30, ...properties });
    },
    click(i, detail = 1) { return dispatch(root, "click", { target: labels[i], detail }); },
    key(key) { return dispatch(root, "keydown", { key }); },
    touchMove() { return dispatch(root, "touchmove"); },
    blur() { dispatch(window, "blur"); },
    resize(nextWidth) { width = nextWidth; observer.callback(); },
    setIndex(i) { controller.setIndex(i); },
    destroy() { controller.destroy(); destroyed = true; },
  };
}
