import assert from "node:assert/strict";
import test from "node:test";
import { navigationFixture } from "./helpers/segmented-navigation-fixture.mjs";

for (const [name, count, gap] of [["primary", 4, 0], ["belt", 3, 4]]) {
  test(`${name} navigation handles nested-label clicks, keyboard boundaries and measured spacing`, (t) => {
    const nav = navigationFixture(t, { count, gap });
    nav.click(1);
    nav.settle();
    nav.assertAt(1);
    assert.deepEqual(nav.selections, [1]);
    assert.equal(nav.key("End").defaultPrevented, true);
    nav.settle();
    nav.assertAt(count - 1);
    nav.key("ArrowRight");
    nav.key("ArrowLeft");
    nav.key("Home");
    nav.key("ArrowLeft");
    nav.settle();
    nav.assertAt(0);
    assert.deepEqual(nav.selections, [1, count - 1, count - 1, count - 2, 0, 0]);
    assert.deepEqual(nav.focused, { index: 0, options: { preventScroll: true } });
    assert.equal(nav.key("Escape").defaultPrevented, false);
    assert.equal(nav.pendingFrames, 0);
  });
}

test("pointer press responds before 80ms without teleporting or committing its preview", (t) => {
  const nav = navigationFixture(t);
  nav.pointer("pointerdown", nav.center(3));
  nav.assertAt(0);
  nav.advance(64);
  assert.ok(nav.transform().x > 0 && nav.transform().x < nav.center(3) - nav.center(0));
  assert.ok(nav.transform().scaleX > 1);
  assert.deepEqual(nav.selections, []);
  nav.settle();
  nav.assertAt(3);
  assert.deepEqual(nav.selections, [], "preview must not switch business content");
  nav.pointer("pointermove", nav.center(1));
  nav.settle();
  nav.assertAt(1);
  nav.pointer("pointerup", nav.center(1));
  assert.deepEqual(nav.selections, [1]);
  assert.equal(nav.captures.size, 0);
  assert.equal(nav.click(1).defaultPrevented, true, "release-generated click must not commit twice");
  assert.deepEqual(nav.selections, [1]);
  nav.click(2);
  nav.settle();
  nav.assertAt(2);
  assert.deepEqual(nav.selections, [1, 2]);
});

for (const [name, initial, neighbor] of [["rightward", 1, 2], ["leftward", 2, 1]]) {
  test(`fast ${name} release before the midpoint stays on the nearest segment`, (t) => {
    const nav = navigationFixture(t, { index: initial });
    const releaseX = nav.center(initial) + (nav.center(neighbor) - nav.center(initial)) * 0.4;
    nav.pointer("pointerdown", nav.center(initial));
    nav.settle();
    nav.advance(16);
    nav.pointer("pointermove", nav.center(initial));
    nav.advance(16);
    nav.pointer("pointermove", releaseX);
    nav.pointer("pointerup", releaseX);
    nav.settle();
    nav.assertAt(initial);
    assert.deepEqual(nav.selections, [initial], "velocity must not predict another selection");
    assert.equal(nav.transform().scaleX, 1);
    assert.equal(nav.transform().scaleY, 1);
  });
}

test("rapid reversal keeps the moving thumb continuous and settles at the latest selection", (t) => {
  const nav = navigationFixture(t);
  nav.click(3);
  nav.advance(96);
  const moving = nav.transform().x;
  assert.ok(moving > 0);
  nav.click(0);
  assert.equal(nav.transform().x, moving, "changing direction must not jump to an endpoint");
  nav.advance(64);
  const reversing = nav.transform().x;
  nav.click(2);
  assert.equal(nav.transform().x, reversing);
  nav.settle();
  nav.assertAt(2);
  assert.deepEqual(nav.selections, [3, 0, 2]);
});

test("reversing a held drag commits only the nearest segment at the final release", (t) => {
  const nav = navigationFixture(t, { index: 1 });
  nav.pointer("pointerdown", nav.center(1));
  nav.settle();
  nav.advance(16);
  nav.pointer("pointermove", nav.center(3));
  nav.advance(16);
  nav.pointer("pointermove", nav.center(0));
  nav.advance(16);
  const releaseX = nav.center(1) + (nav.center(2) - nav.center(1)) * 0.4;
  nav.pointer("pointermove", releaseX);
  assert.deepEqual(nav.selections, [], "drag reversals must remain previews");
  nav.pointer("pointerup", releaseX);
  nav.settle();
  nav.assertAt(1);
  assert.deepEqual(nav.selections, [1]);
});

for (const cancellation of ["pointercancel", "lostpointercapture"]) {
  test(`${cancellation} restores the committed segment and allows the next gesture`, (t) => {
    const nav = navigationFixture(t, { index: 1 });
    nav.pointer("pointerdown", nav.center(3));
    nav.settle();
    nav.assertAt(3);
    nav.pointer(cancellation, nav.center(3));
    nav.settle();
    nav.assertAt(1);
    assert.deepEqual(nav.selections, []);
    assert.equal(nav.captures.size, 0);
    nav.pointer("pointerdown", nav.center(2));
    nav.pointer("pointerup", nav.center(2));
    nav.settle();
    nav.assertAt(2);
    assert.deepEqual(nav.selections, [2]);
  });
}

test("a release outside the track cancels the uncommitted preview", (t) => {
  const nav = navigationFixture(t, { index: 1 });
  nav.pointer("pointerdown", nav.center(3));
  nav.settle();
  nav.pointer("pointerup", nav.center(3) + 100, {}, nav.window);
  nav.settle();
  nav.assertAt(1);
  assert.deepEqual(nav.selections, []);
  assert.equal(nav.captures.size, 0);
  nav.click(0, 0);
  nav.settle();
  nav.assertAt(0);
  assert.deepEqual(nav.selections, [0], "a canceled pointer must not suppress keyboard activation");
});

for (const reset of ["resize", "blur", "external selection"]) {
  test(`${reset} interrupts a gesture without submitting its preview`, (t) => {
    const nav = navigationFixture(t, { index: 1 });
    nav.pointer("pointerdown", nav.center(3));
    nav.advance(64);
    if (reset === "resize") nav.resize(280);
    else if (reset === "blur") nav.blur();
    else nav.setIndex(2);
    nav.pointer("pointerup", nav.center(3));
    nav.settle();
    nav.assertAt(reset === "external selection" ? 2 : 1);
    assert.deepEqual(nav.selections, []);
    assert.equal(nav.captures.size, 0);
    assert.equal(nav.transform().scaleX, 1);
  });
}

test("reduced motion previews and selects immediately without scale or animation frames", (t) => {
  const nav = navigationFixture(t, { reduced: true, count: 3, gap: 4 });
  nav.pointer("pointerdown", nav.center(2));
  nav.assertAt(2);
  assert.deepEqual(nav.selections, []);
  nav.pointer("pointermove", nav.center(1));
  nav.assertAt(1);
  nav.pointer("pointerup", nav.center(1));
  assert.deepEqual(nav.selections, [1]);
  nav.assertAt(1);
  assert.deepEqual(nav.transform(), { x: nav.center(1) - nav.center(0), scaleX: 1, scaleY: 1 });
  assert.equal(nav.pendingFrames, 0);
});

test("vertical motion stays captured while unrelated pointers cannot select", (t) => {
  const nav = navigationFixture(t);
  nav.pointer("pointerdown", nav.center(2), { isPrimary: false });
  nav.pointer("pointerdown", nav.center(2), { button: 2 });
  assert.equal(nav.pendingFrames, 0);
  assert.equal(nav.captures.size, 0);
  assert.equal(nav.touchMove().defaultPrevented, false);
  nav.pointer("pointerdown", nav.center(1));
  nav.pointer("pointermove", nav.center(3), { pointerId: 2 });
  nav.pointer("pointerup", nav.center(3), { pointerId: 2 });
  assert.deepEqual(nav.selections, []);
  assert.equal(nav.touchMove().defaultPrevented, true);
  nav.pointer("pointermove", nav.center(1), { clientY: 140 });
  nav.pointer("pointerup", nav.center(1), { clientY: 140 });
  nav.settle();
  nav.assertAt(1);
  assert.deepEqual(nav.selections, [1]);
  assert.equal(nav.touchMove().defaultPrevented, false);
});

test("destroy releases capture, stops frames, disconnects resize and removes all listeners", (t) => {
  const nav = navigationFixture(t, { index: 1 });
  nav.pointer("pointerdown", nav.center(3));
  nav.advance(64);
  assert.ok(nav.pendingFrames > 0);
  nav.destroy();
  nav.assertAt(1);
  assert.equal(nav.pendingFrames, 0);
  assert.equal(nav.captures.size, 0);
  assert.equal(nav.observerDisconnected, true);
  for (const target of [nav.root, nav.window]) {
    assert.equal([...target.listeners.values()].reduce((total, listeners) => total + listeners.size, 0), 0);
  }
  const previous = nav.transform();
  nav.click(2);
  nav.key("End");
  nav.pointer("pointerdown", nav.center(3));
  nav.pointer("pointerup", nav.center(3));
  nav.advance(500);
  assert.deepEqual(nav.transform(), previous);
  assert.deepEqual(nav.selections, []);
  assert.equal(nav.pendingFrames, 0);
});
