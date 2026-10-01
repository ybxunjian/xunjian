"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "framer-motion";
import type { AnimationPlaybackControls } from "framer-motion";
import {
  calendarMonthDistance, clampCalendarDrag, getCalendarTarget, getCalendarSpringVelocity,
  CALENDAR_SPRING_STIFFNESS, CALENDAR_SPRING_DAMPING,
} from "../model/calendar-paging";
import { shiftHistoryMonth } from "../model/history-filter";

type Sample = { time: number; position: number };
type Drag = {
  pointer: number; x: number; y: number; width: number;
  active: boolean; start: number; base: number; samples: Sample[];
};
type WheelDrag = { start: number; base: number; samples: Sample[] };
type PagerState = "idle" | "dragging" | "settling";

function sampleVelocity(samples: Sample[], position: number, time: number) {
  samples.push({ position, time });
  while (samples.length > 2 && samples[1].time < time - 80) samples.shift();
  const first = samples[0];
  return time > first.time ? (position - first.position) * 1000 / (time - first.time) : 0;
}

export function useCalendarPager(month: string, earliestMonth: string | undefined, onMonthChange: (month: string) => void) {
  const [anchor] = useState(month);
  const minimum = calendarMonthDistance(anchor, earliestMonth ?? anchor);
  const [visibleMonth, setVisibleMonth] = useState(month);
  const [state, setState] = useState<PagerState>("idle");
  const position = useMotionValue(0);
  const x = useTransform(position, (value) => `${-value * 100}%`);
  const reduceMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationPlaybackControls | null>(null);
  const generationRef = useRef(0);
  const dragRef = useRef<Drag | null>(null);
  const wheelRef = useRef<WheelDrag | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const externalMonthRef = useRef(month);
  const committedMonthRef = useRef(month);
  const configRef = useRef({ minimum, reduceMotion, onMonthChange });

  useMotionValueEvent(position, "change", (value) => {
    setVisibleMonth(shiftHistoryMonth(anchor, Math.round(value)));
  });

  const stopAnimation = () => {
    generationRef.current += 1;
    animationRef.current?.stop();
    animationRef.current = null;
  };
  const clearWheel = () => {
    if (wheelTimerRef.current !== null) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = null;
    wheelRef.current = null;
  };
  const commit = (target: number) => {
    const next = shiftHistoryMonth(anchor, target);
    setVisibleMonth(next);
    if (next === committedMonthRef.current) return;
    committedMonthRef.current = next;
    configRef.current.onMonthChange(next);
  };
  const settle = (target: number, velocity = 0) => {
    stopAnimation();
    const generation = generationRef.current;
    const finish = () => {
      if (generation !== generationRef.current) return;
      animationRef.current = null;
      position.set(target);
      setState("idle");
      commit(target);
    };
    if (configRef.current.reduceMotion || Math.abs(target - position.get()) < 0.001) {
      finish();
      return;
    }
    setState("settling");
    animationRef.current = animate(position, target, {
      type: "spring", stiffness: CALENDAR_SPRING_STIFFNESS, damping: CALENDAR_SPRING_DAMPING,
      velocity: getCalendarSpringVelocity(position.get(), target, velocity),
      restDelta: 0.002, restSpeed: 0.015, onComplete: finish,
    });
  };
  const navigateTo = (next: string) => {
    stopAnimation();
    clearWheel();
    dragRef.current = null;
    const target = Math.max(configRef.current.minimum, calendarMonthDistance(anchor, next));
    position.set(target);
    setState("idle");
    commit(target);
  };

  useLayoutEffect(() => {
    configRef.current = { minimum, reduceMotion, onMonthChange };
    if (externalMonthRef.current !== month) {
      externalMonthRef.current = month;
      if (committedMonthRef.current !== month) navigateTo(month);
    }
    // Sync an external boundary with the motion value before the browser paints.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (position.get() < minimum) navigateTo(shiftHistoryMonth(anchor, minimum));
    if (reduceMotion && animationRef.current) {
      settle(Math.max(minimum, Math.round(position.get())));
    }
  });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || dragRef.current) return;
    if (wheelRef.current) {
      clearWheel();
      settle(Math.max(configRef.current.minimum, Math.round(position.get())));
    }
    suppressClickRef.current = false;
    dragRef.current = {
      pointer: event.pointerId, x: event.clientX, y: event.clientY,
      width: event.currentTarget.clientWidth, active: false,
      start: position.get(), base: Math.round(position.get()), samples: [],
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointer !== event.pointerId || !drag.width) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dy) >= 8 && Math.abs(dy) >= Math.abs(dx)) {
        dragRef.current = null; // Native vertical page scrolling owns this gesture.
        return;
      }
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
      stopAnimation();
      drag.active = true;
      drag.width = event.currentTarget.clientWidth;
      drag.start = position.get();
      drag.base = Math.round(drag.start);
      drag.x = event.clientX;
      drag.samples = [{ position: drag.start, time: event.timeStamp }];
      suppressClickRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setState("dragging");
      return;
    }
    const next = clampCalendarDrag(
      drag.start - (event.clientX - drag.x) / drag.width, drag.base, configRef.current.minimum,
    );
    position.set(next);
    sampleVelocity(drag.samples, next, event.timeStamp);
  };
  const endPointer = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.active) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const velocity = cancelled ? 0 : sampleVelocity(drag.samples, position.get(), event.timeStamp);
    const target = cancelled
      ? Math.max(configRef.current.minimum, Math.round(position.get()))
      : getCalendarTarget(position.get(), drag.start, drag.base, velocity, configRef.current.minimum);
    settle(target, velocity);
  };
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current || event.detail === 0) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const consumeHorizontalTouch = (event: TouchEvent) => {
      // Consume the recognized horizontal gesture as well as moving its pixels.
      // Otherwise Chromium can keep a native fling that swallows the next tap.
      if (dragRef.current?.active && event.cancelable) event.preventDefault();
    };
    viewport.addEventListener("touchmove", consumeHorizontalTouch, { passive: false });
    return () => viewport.removeEventListener("touchmove", consumeHorizontalTouch);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const wheel = (event: WheelEvent) => {
      if (dragRef.current || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (!wheelRef.current) {
        stopAnimation();
        const start = position.get();
        wheelRef.current = { start, base: Math.round(start), samples: [{ position: start, time: event.timeStamp }] };
        setState("dragging");
      }
      const drag = wheelRef.current;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1;
      const next = clampCalendarDrag(position.get() + event.deltaX * unit / viewport.clientWidth, drag.base, configRef.current.minimum);
      position.set(next);
      const velocity = sampleVelocity(drag.samples, next, event.timeStamp);
      if (wheelTimerRef.current !== null) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        if (wheelRef.current !== drag) return;
        wheelRef.current = null;
        wheelTimerRef.current = null;
        settle(getCalendarTarget(position.get(), drag.start, drag.base, velocity, configRef.current.minimum), velocity);
      }, 100);
    };
    viewport.addEventListener("wheel", wheel, { passive: false });
    return () => viewport.removeEventListener("wheel", wheel);
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let width = viewport.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width === viewport.clientWidth) return;
      width = viewport.clientWidth;
      const drag = dragRef.current;
      if (!drag?.active) return;
      dragRef.current = null;
      suppressClickRef.current = true;
      settle(Math.max(configRef.current.minimum, Math.round(position.get())));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
    // Position is normalized to pages; only an active pixel-based drag needs ending.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    generationRef.current += 1;
    animationRef.current?.stop();
    if (wheelTimerRef.current !== null) clearTimeout(wheelTimerRef.current);
  }, []);

  return {
    anchor, visibleMonth, viewportRef, x, state, navigateTo,
    pointerHandlers: {
      onPointerDown, onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLDivElement>) => endPointer(event, false),
      onPointerCancel: (event: PointerEvent<HTMLDivElement>) => endPointer(event, true),
      onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => {
        // Taking capture from a touched date bubbles its own lost-capture event.
        // Only losing the viewport's capture ends the horizontal gesture.
        if (event.target === event.currentTarget) endPointer(event, true);
      },
      onClickCapture,
    },
  };
}
