"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, usePresence, useReducedMotion } from "framer-motion";
import { Button } from "./button";

const TIP_SIZE = 16;
const TIP_VISIBLE_HEIGHT = 10;
// Account for the rotated square's extra height and the bubble's 1px border.
const TIP_TOP = TIP_SIZE * (Math.SQRT2 - 1) / 2 - 1 - TIP_VISIBLE_HEIGHT;
const TRANSFORM_ORIGIN = `50% -${TIP_VISIBLE_HEIGHT}px`;
const OPEN_DURATION = 390;
const CLOSE_DURATION = 210;
const OPEN_EASING = "cubic-bezier(.22,.72,.20,1)";
const CLOSE_EASING = "cubic-bezier(.42,0,.72,.35)";

type BubblePose = { scale: number; opacity: number };
type BubbleFrame = BubblePose & { offset: number };

const OPEN_FRAMES: BubbleFrame[] = [
  { scale: 0.16, opacity: 0.12, offset: 0 },
  { scale: 0.27, opacity: 0.32, offset: 0.2 },
  { scale: 0.50, opacity: 0.65, offset: 0.42 },
  { scale: 0.78, opacity: 0.91, offset: 0.64 },
  { scale: 1.018, opacity: 1, offset: 0.88 },
  { scale: 1, opacity: 1, offset: 1 },
];

const CLOSE_FRAMES: BubbleFrame[] = [
  { scale: 1, opacity: 1, offset: 0 },
  { scale: 0.96, opacity: 1, offset: 0.2 },
  { scale: 0.73, opacity: 0.96, offset: 0.46 },
  { scale: 0.39, opacity: 0.68, offset: 0.72 },
  { scale: 0.16, opacity: 0, offset: 1 },
];

function bubbleKeyframes(frames: BubbleFrame[], interrupted?: BubblePose): Keyframe[] {
  const first = frames[0];
  const last = frames[frames.length - 1];
  const start = interrupted ?? first;
  return frames.map((frame) => {
    const scaleProgress = (frame.scale - first.scale) / (last.scale - first.scale);
    const opacityProgress = (frame.opacity - first.opacity) / (last.opacity - first.opacity);
    const scale = start.scale + (last.scale - start.scale) * scaleProgress;
    const opacity = start.opacity + (last.opacity - start.opacity) * opacityProgress;
    return { transform: `translateX(-50%) scale(${scale})`, opacity, offset: frame.offset };
  });
}

type ConfirmationPopoverProps = {
  id: string;
  open: boolean;
  busy: boolean;
  title: string;
  confirmLabel: string;
  busyLabel?: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
};

/** Anchored, non-modal confirmation inside the owning page or sheet. */
export function ConfirmationPopover(props: ConfirmationPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { open, busy, onClose } = props;

  useEffect(() => {
    if (!open || busy) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Handle the bubble before the parent Sheet's document capture listener.
      event.preventDefault();
      event.stopPropagation();
      onClose();
      rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", escape, true);
    };
  }, [open, busy, onClose]);

  return (
    <div ref={rootRef} className="relative mx-auto mt-2 w-fit">
      {props.children}
      <AnimatePresence>
        {props.open && <ConfirmationBubble key={props.id} {...props} />}
      </AnimatePresence>
    </div>
  );
}

function ConfirmationBubble({ id, busy, title, confirmLabel, busyLabel = "正在处理…", onClose, onConfirm }: ConfirmationPopoverProps) {
  const [isPresent, safeToRemove] = usePresence();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const safeToRemoveRef = useRef(safeToRemove);
  const interruptedPoseRef = useRef<BubblePose | undefined>(undefined);

  // Presence callbacks can change when a sibling sheet opens; keep that update
  // separate from the animation so an in-progress timeline isn't restarted.
  useLayoutEffect(() => {
    safeToRemoveRef.current = safeToRemove;
  }, [safeToRemove]);

  useLayoutEffect(() => {
    const element = bubbleRef.current;
    if (!element) return;
    element.style.transformOrigin = TRANSFORM_ORIGIN;

    const interruptedPose = interruptedPoseRef.current;
    interruptedPoseRef.current = undefined;
    let completed = false;

    const finish = () => {
      completed = true;
      element.style.transform = isPresent
        ? "translateX(-50%) scale(1)"
        : "translateX(-50%) scale(.16)";
      element.style.opacity = isPresent ? "1" : "0";
    };

    if (reduceMotion) {
      finish();
      return;
    }

    // Each bubble owns its animation; the easing applies to the full timeline.
    const animation = element.animate(bubbleKeyframes(isPresent ? OPEN_FRAMES : CLOSE_FRAMES, interruptedPose), {
      duration: isPresent ? OPEN_DURATION : CLOSE_DURATION,
      easing: isPresent ? OPEN_EASING : CLOSE_EASING,
      fill: "forwards",
    });
    animation.onfinish = () => {
      finish();
      animation.cancel();
      if (!isPresent) safeToRemoveRef.current?.();
    };
    return () => {
      animation.onfinish = null;
      if (!completed) {
        // Freeze the rendered pose before removing the animation layer. The
        // next direction uses this pose as its first frame instead of resetting.
        const style = getComputedStyle(element);
        interruptedPoseRef.current = {
          scale: new DOMMatrixReadOnly(style.transform).a,
          opacity: Number(style.opacity),
        };
        element.style.transform = style.transform;
        element.style.opacity = style.opacity;
      }
      animation.cancel();
    };
  }, [isPresent, reduceMotion]);

  useEffect(() => {
    if (reduceMotion && !isPresent) safeToRemoveRef.current?.();
  }, [isPresent, reduceMotion]);

  useEffect(() => {
    cancelRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={bubbleRef}
      id={id}
      role="dialog"
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
      aria-hidden={!isPresent || undefined}
      inert={!isPresent}
      className="absolute left-1/2 top-full z-30 mt-2 w-48 rounded-confirmation-popover border border-border bg-card p-2.5 shadow-floating"
      style={{
        transformOrigin: TRANSFORM_ORIGIN,
        transform: "translateX(-50%) scale(.16)",
        opacity: 0,
      }}
    >
      <span aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 rotate-45 border-l border-t border-border bg-card" style={{ top: TIP_TOP, width: TIP_SIZE, height: TIP_SIZE }} />
      <h3 id={`${id}-title`} className="sr-only">{title}</h3>
      <div className="relative flex flex-col gap-2">
        <Button type="button" variant="destructive" disabled={busy || !isPresent} onClick={onConfirm} className="w-full rounded-full shadow-none">
          {busy ? busyLabel : confirmLabel}
        </Button>
        <Button ref={cancelRef} type="button" variant="ghost" disabled={busy || !isPresent} onClick={onClose} className="w-full rounded-full bg-muted">
          取消
        </Button>
      </div>
    </div>
  );
}
