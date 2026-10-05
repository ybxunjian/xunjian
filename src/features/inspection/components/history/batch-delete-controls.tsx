import { useEffect, useRef, useState } from "react";
import { animate, mix, motion, useIsPresent, useMotionValue, useTransform } from "framer-motion";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MotionButton = motion.create(Button);
const RADIUS = 22;

export function BatchDeleteControls({
  selectedRecordIds, reduceMotion, onDelete,
}: {
  selectedRecordIds: string[];
  reduceMotion: boolean;
  onDelete: (ids: string[]) => void;
}) {
  const selectionKey = JSON.stringify(selectedRecordIds);
  const [confirmation, setConfirmation] = useState({ selectionKey, open: false });
  // Reset before committing changed selections, including swaps with the same count.
  if (confirmation.selectionKey !== selectionKey) {
    setConfirmation({ selectionKey, open: false });
  }
  const open = confirmation.selectionKey === selectionKey && confirmation.open;
  const isPresent = useIsPresent();
  const unavailable = !isPresent || selectedRecordIds.length === 0;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLSpanElement>(null);
  const lastFocusState = useRef({ open: false, selectionKey });
  const deleting = useRef(false);
  const progress = useMotionValue(0);
  const destructiveColor = useMotionValue("var(--destructive)");
  const mutedColor = useMotionValue("var(--muted)");
  // Preserve the existing 76px capsule and 12px padding on the right of 删除.
  // Its final 52px capsule stays fixed; only the left piece and seam change.
  const leftWidth = useTransform(progress, [0, 1], [24, 52]);
  const leftOffset = useTransform(progress, [0, 1], [52, 60]);
  const innerRadius = useTransform(progress, [0, 1], [0, RADIUS]);
  const iconOpacity = useTransform(progress, [0, 1], [1, 0]);
  const cancelColor = useTransform(() => mix(destructiveColor.get(), mutedColor.get())(progress.get()));
  const cancel = () => setConfirmation({ selectionKey, open: false });

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const tokens = getComputedStyle(surface);
    destructiveColor.set(tokens.getPropertyValue("--destructive").trim());
    mutedColor.set(tokens.getPropertyValue("--muted").trim());
  }, [destructiveColor, mutedColor]);

  useEffect(() => {
    if (!isPresent) return;
    const controls = animate(progress, open ? 1 : 0, {
      duration: reduceMotion ? 0 : open ? 0.28 : 0.22,
      ease: open ? [0.25, 0.1, 0.25, 1] : [0.25, 0.1, 0.35, 1],
    });
    return () => controls.stop();
  }, [open, reduceMotion, isPresent, progress]);

  useEffect(() => {
    if (!isPresent) return;
    if (open) cancelRef.current?.focus({ preventScroll: true });
    else if (lastFocusState.current.open && lastFocusState.current.selectionKey === selectionKey) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    lastFocusState.current = { open, selectionKey };
  }, [open, selectionKey, isPresent]);

  useEffect(() => {
    if (!open || !isPresent) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setConfirmation({ selectionKey, open: false });
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, selectionKey, isPresent]);

  return (
    <div
      className={`relative ml-auto h-11 w-[112px] shrink-0 ${selectedRecordIds.length === 0 ? "opacity-45" : ""}`}
      role="group"
      aria-label={open ? `确认删除 ${selectedRecordIds.length} 条历史记录` : "批量删除记录"}
      inert={!isPresent}
    >
      <MotionButton
        ref={cancelRef}
        type="button"
        variant="ghost"
        disabled={unavailable || !open}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        aria-label="取消批量删除"
        onClick={cancel}
        className="absolute top-0 h-11 w-[52px] rounded-full bg-transparent p-0 hover:bg-transparent active:scale-[.99] disabled:opacity-100"
        style={{ right: leftOffset }}
      >
        <motion.span
          ref={surfaceRef}
          className="pointer-events-none absolute right-0 top-0 h-11"
          style={{ width: leftWidth, backgroundColor: cancelColor, borderTopLeftRadius: RADIUS, borderBottomLeftRadius: RADIUS, borderTopRightRadius: innerRadius, borderBottomRightRadius: innerRadius }}
          aria-hidden="true"
        />
        <motion.span
          className="pointer-events-none absolute right-0 top-0 flex h-11 items-center justify-center overflow-hidden whitespace-nowrap"
          style={{ width: leftWidth, opacity: progress }}
          aria-hidden="true"
        >取消</motion.span>
      </MotionButton>
      <MotionButton
        type="button"
        variant="destructive"
        disabled={unavailable || !open}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        aria-label={`确认删除 ${selectedRecordIds.length} 条历史记录`}
        onClick={() => {
          if (unavailable || !open || deleting.current) return;
          deleting.current = true;
          try { onDelete([...selectedRecordIds]); }
          catch (error) {
            deleting.current = false;
            toast.error(error instanceof Error ? error.message : "删除失败，请重试");
          }
        }}
        className="absolute right-0 top-0 h-11 w-[52px] p-0 transition-transform hover:bg-destructive disabled:opacity-100"
        style={{ borderTopRightRadius: RADIUS, borderBottomRightRadius: RADIUS, borderTopLeftRadius: innerRadius, borderBottomLeftRadius: innerRadius }}
      >
        <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap" aria-hidden="true">删除</span>
      </MotionButton>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        disabled={unavailable || open}
        tabIndex={open ? -1 : 0}
        aria-hidden={open}
        aria-expanded={open}
        aria-label={`删除 ${selectedRecordIds.length} 条历史记录`}
        onClick={() => setConfirmation({ selectionKey, open: true })}
        className="absolute right-0 top-0 h-11 w-[76px] rounded-full bg-transparent p-0 text-destructive-foreground hover:bg-transparent disabled:opacity-100"
      >
        <motion.span className="absolute right-12 top-0 flex h-11 w-4 items-center justify-center" style={{ opacity: iconOpacity }} aria-hidden="true">
          <Trash2 size={16} />
        </motion.span>
      </Button>
    </div>
  );
}
