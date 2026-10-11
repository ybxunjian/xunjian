"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";

interface LongPressReorderItemProps<T> {
  value: T;
  handleLabel: string;
  onReorderEnd: () => void;
  children: ReactNode;
}

export function LongPressReorderItem<T>({
  value,
  handleLabel,
  onReorderEnd,
  children,
}: LongPressReorderItemProps<T>) {
  const dragControls = useDragControls();
  const handleRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const pressStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return clearLongPress;

    const preventScrollAfterActivation = (event: TouchEvent) => {
      if (draggingRef.current) event.preventDefault();
    };

    handle.addEventListener("touchmove", preventScrollAfterActivation, {
      passive: false,
    });

    return () => {
      clearLongPress();
      handle.removeEventListener("touchmove", preventScrollAfterActivation);
    };
  }, []);

  const startLongPress = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    clearLongPress();
    pressStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      pressStart.current = null;
      draggingRef.current = true;
      setDragging(true);
      dragControls.start(event, { distanceThreshold: 0 });
      navigator.vibrate?.(8);
    }, 350);
  };

  const moveLongPress = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pressStart.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.hypot(x, y) <= 8) return;

    clearLongPress();
    pressStart.current = null;
  };

  const finishLongPress = () => {
    clearLongPress();
    pressStart.current = null;
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
  };

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={() => {
        draggingRef.current = true;
        setDragging(true);
      }}
      onDragEnd={() => {
        draggingRef.current = false;
        setDragging(false);
        onReorderEnd();
      }}
      whileDrag={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 460, damping: 34 }}
      className={`flex min-h-12 touch-pan-y select-none items-center gap-1 rounded-control px-2 pr-4 transition-colors ${
        dragging
          ? "relative z-10 bg-reorder-drag-surface shadow-floating"
          : "bg-muted shadow-card"
      }`}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={handleLabel}
        onPointerDown={startLongPress}
        onPointerMove={moveLongPress}
        onPointerUp={finishLongPress}
        onPointerCancel={finishLongPress}
        onContextMenu={(event) => event.preventDefault()}
        className={`grid size-10 shrink-0 place-items-center rounded-small text-subtle-foreground active:bg-border/60 ${
          dragging ? "touch-none" : "touch-pan-y"
        }`}
      >
        <GripVertical className="size-5" />
      </button>
      {children}
    </Reorder.Item>
  );
}
