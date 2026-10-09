import { SEGMENT_SELECTION_TRANSITION } from "./segmented-navigation-motion";

/** V9 motion in track-local coordinates; no shared layout projection. */
export function createSegmentedNavigationMotion(root: HTMLElement, thumb: HTMLElement, count: number, initialIndex: number, reduced: boolean, onSelect: (index: number) => void) {
  const { stiffness, damping, mass } = SEGMENT_SELECTION_TRANSITION;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>("button[data-segment-index]")];
  const clamp = (n: number, min = 0, max = (count - 1) * step()) => Math.max(min, Math.min(max, n));
  let spacing = (root.clientWidth - 8) / count;
  let firstCenter = 4 + spacing / 2;
  const step = () => spacing;
  function measure() {
    const first = buttons[0]?.getBoundingClientRect();
    const second = buttons[1]?.getBoundingClientRect();
    if (!first) return;
    spacing = second ? second.left - first.left : first.width;
    firstCenter = first.left - root.getBoundingClientRect().left + first.width / 2;
  }
  measure();
  const local = (e: PointerEvent) => e.clientX - root.getBoundingClientRect().left;
  const fingerAt = (x: number) => clamp(x - firstCenter);
  let selected = initialIndex, position = selected * step(), target = position, visual = position, velocity = 0;
  let scale = 1, scaleTarget = 1, scaleVelocity = 0, stretch = 0, direction = 0;
  let phase: "idle" | "chase" | "blending" | "follow" = "idle";
  let pointer: number | null = null, finger = 0, fingerVelocity = 0, lastMove = 0;
  let holdStarted = 0, blendStarted = 0, lastFrame = 0, raf: number | null = null;
  let samples: { time: number; x: number }[] = [];
  let suppressClick = false;
  function render() {
    const lean = direction * stretch * step() * .12;
    thumb.style.transform = "translate3d(" + (visual + lean) + "px,0,0) scale(" + scale * (1 + stretch) + "," + scale * (1 - stretch * .22) + ")";
    thumb.style.setProperty("--navigation-press", String(clamp((scale - 1) / .15, 0, 1)));
    const active = clamp(Math.round(visual / step()), 0, count - 1);
    buttons.forEach((button, i) => button.setAttribute("data-preview-active", String(i === active)));
  }
  function tick(now: number) {
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .035) : 0;
    lastFrame = now;
    const iterations = Math.ceil(dt / .0035);
    for (let i = 0; i < iterations; i++) {
      const h = dt / iterations;
      if (phase !== "follow") {
        const goal = phase === "chase" || phase === "blending" ? finger : target;
        velocity += (-stiffness * (position - goal) - damping * velocity) * h / mass;
        position += velocity * h;
      }
      scaleVelocity += (-stiffness * (scale - scaleTarget) - damping * scaleVelocity) * h / mass;
      scale += scaleVelocity * h;
    }
    if (phase === "chase" && (Math.abs(position - finger) < 8 || now - holdStarted >= 180)) {
      phase = "blending";
      blendStarted = now;
    }
    if (phase === "blending") {
      const progress = clamp((now - blendStarted) / 120, 0, 1);
      const mix = progress * progress * (3 - 2 * progress);
      visual = clamp(position * (1 - mix) + finger * mix);
      if (progress === 1) {
        phase = "follow";
        position = visual = finger;
        velocity = fingerVelocity;
      }
    } else if (phase === "follow") position = visual = finger;
    else visual = clamp(position);
    if (phase === "follow" && now - lastMove > 85) fingerVelocity = 0;
    const speed = phase === "follow" ? fingerVelocity : velocity;
    const stretchTarget = .1 * clamp((Math.abs(speed) - 45) / 550, 0, 1);
    stretch += (stretchTarget - stretch) * (1 - Math.exp(-dt / (stretchTarget > stretch ? .035 : .115)));
    direction += (Math.sign(speed) - direction) * (1 - Math.exp(-dt / .05));
    render();
    const moving = phase === "chase" || phase === "blending" ||
      (phase !== "follow" && (Math.abs(position - target) > .06 || Math.abs(velocity) > .15)) ||
      Math.abs(scale - scaleTarget) > .0005 || Math.abs(scaleVelocity) > .002 ||
      Math.abs(stretch - stretchTarget) > .0003 ||
      (phase === "follow" && Math.abs(fingerVelocity) > 1 && now - lastMove <= 85);
    if (moving) raf = requestAnimationFrame(tick);
    else {
      raf = null;
      lastFrame = 0;
      if (phase !== "follow") { position = visual = target; velocity = 0; }
      scale = scaleTarget;
      scaleVelocity = stretch = 0;
      render();
    }
  }
  function animate() {
    if (reduced) {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      position = visual = phase === "chase" || phase === "blending" || phase === "follow" ? finger : target;
      if (pointer !== null) phase = "follow";
      velocity = scaleVelocity = stretch = 0;
      scale = scaleTarget = 1;
      render();
    } else if (raf === null) { lastFrame = 0; raf = requestAnimationFrame(tick); }
  }
  function select(index: number, commit = true) {
    selected = clamp(index, 0, count - 1);
    target = selected * step();
    scaleTarget = 1;
    phase = "idle";
    animate();
    if (commit) onSelect(selected);
  }
  function down(e: PointerEvent) {
    if (!e.isPrimary || e.button !== 0 || pointer !== null) return;
    suppressClick = false;
    pointer = e.pointerId;
    phase = "chase";
    finger = fingerAt(local(e));
    fingerVelocity = 0;
    lastMove = performance.now();
    samples = [{ time: lastMove, x: finger }];
    holdStarted = lastMove;
    scaleTarget = reduced ? 1 : 1.15;
    root.setPointerCapture(pointer);
    // Start the spring from the current visual position; never teleport to the pointer.
    position = visual;
    animate();
  }
  function move(e: PointerEvent) {
    if (e.pointerId !== pointer) return;
    const now = performance.now();
    finger = fingerAt(local(e));
    samples.push({ time: now, x: finger });
    samples = samples.filter((sample) => now - sample.time <= 90);
    const first = samples[0];
    if (first && now - first.time > 8) fingerVelocity = clamp((finger - first.x) * 1000 / (now - first.time), -1800, 1800);
    lastMove = now;
    if (phase === "follow") { position = visual = finger; render(); }
    animate();
  }
  function release(e: PointerEvent, canceled = false) {
    if (pointer !== e.pointerId) return;
    const holding = phase === "chase" || phase === "blending" || phase === "follow";
    suppressClick = canceled || holding;
    if (canceled) {
      position = visual;
      select(selected, false);
    } else if (holding) {
      const speed = performance.now() - lastMove < 90 ? fingerVelocity : 0;
      const at = fingerAt(local(e));
      const nearest = clamp(Math.round(at / step()), 0, count - 1);
      const destination = Math.abs(speed) > 260
        ? clamp(clamp(Math.round(clamp(at + speed * .18) / step()), nearest - 1, nearest + 1), 0, count - 1)
        : nearest;
      position = visual;
      if (phase === "follow") velocity = clamp(speed, -1400, 1400);
      select(destination);
    } else { phase = "idle"; scaleTarget = 1; animate(); }
    const captured = pointer;
    pointer = null;
    if (root.hasPointerCapture(captured)) root.releasePointerCapture(captured);
  }
  function up(e: PointerEvent) { release(e); }
  function cancel(e: PointerEvent) { release(e, true); }
  function click(e: MouseEvent) {
    if (suppressClick && e.detail !== 0) {
      suppressClick = false; e.preventDefault(); e.stopPropagation(); return;
    }
    const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>("button[data-segment-index]") : null;
    if (button && root.contains(button)) select(Number(button.dataset.segmentIndex));
  }
  function key(e: KeyboardEvent) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next = clamp(e.key === "Home" ? 0 : e.key === "End" ? count - 1 : selected + (e.key === "ArrowRight" ? 1 : -1), 0, count - 1);
    select(next);
    buttons[next]?.focus({ preventScroll: true });
  }
  function reset() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null; lastFrame = 0;
    const captured = pointer; pointer = null;
    if (captured !== null && root.hasPointerCapture(captured)) root.releasePointerCapture(captured);
    phase = "idle";
    measure();
    position = target = visual = selected * step();
    velocity = scaleVelocity = stretch = direction = 0;
    scale = scaleTarget = 1;
    render();
  }
  // Fallback cancellation if a release reaches the window without pointer capture.
  function outsideUp(e: PointerEvent) {
    if (!(e.target instanceof Node) || !root.contains(e.target)) release(e, true);
  }
  window.addEventListener("pointerup", outsideUp);
  window.addEventListener("pointercancel", outsideUp);
  window.addEventListener("blur", reset);
  function touchMove(e: TouchEvent) {
    if (pointer !== null && e.cancelable) e.preventDefault();
  }
  root.addEventListener("touchmove", touchMove, { passive: false });
  const events = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: cancel, lostpointercapture: cancel, click, keydown: key };
  for (const [name, listener] of Object.entries(events)) root.addEventListener(name, listener as EventListener);
  const observer = new ResizeObserver(reset);
  observer.observe(root);
  reset();
  return {
    setIndex(index: number) { if (index !== selected) { reset(); select(index, false); } },
    destroy() {
      reset();
      observer.disconnect();
      root.removeEventListener("touchmove", touchMove);
      window.removeEventListener("pointerup", outsideUp);
      window.removeEventListener("pointercancel", outsideUp);
      window.removeEventListener("blur", reset);
      for (const [name, listener] of Object.entries(events)) root.removeEventListener(name, listener as EventListener);
    },
  };
}
