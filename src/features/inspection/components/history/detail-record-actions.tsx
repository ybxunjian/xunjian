import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, mix, motion, useIsPresent, useMotionValue, useTransform } from "framer-motion";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MotionButton = motion.create(Button);
// Matching calc templates let Motion interpolate every frame, including interruptions.
export const DETAIL_ACTION_WIDTHS = {
  closed: { left: "calc(100% + -56px)", right: "calc(0% + 48px)" },
  open: { left: "calc(50% + -4px)", right: "calc(50% + -4px)" },
};
const leftWidthAt = mix(DETAIL_ACTION_WIDTHS.closed.left, DETAIL_ACTION_WIDTHS.open.left);
const rightWidthAt = mix(DETAIL_ACTION_WIDTHS.closed.right, DETAIL_ACTION_WIDTHS.open.right);

export function DetailRecordActions({
  returnLabel, reduceMotion, onReturn, onDelete,
}: {
  returnLabel: string;
  reduceMotion: boolean;
  onReturn: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const isPresent = useIsPresent();
  const leftRef = useRef<HTMLButtonElement>(null);
  const rightRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const wasConfirming = useRef(false);
  const deleting = useRef(false);
  const expansion = useMotionValue(0);
  const labelWidth = useMotionValue(0);
  const softColor = useMotionValue("var(--destructive-soft)");
  const destructiveColor = useMotionValue("var(--destructive)");
  const contrastColor = useMotionValue("var(--destructive-foreground)");
  const leftWidth = useTransform(expansion, leftWidthAt);
  const rightWidth = useTransform(expansion, rightWidthAt);
  // Stage colors and text on the same reversible clock as the button widths.
  const surfaceProgress = useTransform(expansion, [0, 0.6], [0, 1]);
  const iconProgress = useTransform(expansion, [0.3, 0.45], [0, 1]);
  const revealProgress = useTransform(expansion, [0.45, 1], [0, 1]);
  const backgroundColor = useTransform(() => mix(softColor.get(), destructiveColor.get())(surfaceProgress.get()));
  const iconColor = useTransform(() => mix(destructiveColor.get(), contrastColor.get())(iconProgress.get()));
  const revealWidth = useTransform(() => revealProgress.get() * labelWidth.get());
  const transition = {
    duration: reduceMotion ? 0 : confirming ? 0.28 : 0.22,
    ease: confirming ? [0.25, 0.1, 0.25, 1] as const : [0.25, 0.1, 0.35, 1] as const,
  };

  useEffect(() => {
    const button = rightRef.current;
    if (!button) return;
    // Resolve semantic tokens once: mixing CSS variable strings would jump colors.
    const tokens = getComputedStyle(button);
    softColor.set(tokens.getPropertyValue("--destructive-soft").trim());
    destructiveColor.set(tokens.getPropertyValue("--destructive").trim());
    contrastColor.set(tokens.getPropertyValue("--destructive-foreground").trim());
  }, [softColor, destructiveColor, contrastColor]);

  useEffect(() => {
    const label = labelRef.current;
    if (!label) return;
    const measure = () => labelWidth.set(label.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(label);
    return () => observer.disconnect();
  }, [labelWidth]);

  useEffect(() => {
    if (!isPresent) return;
    const controls = animate(expansion, confirming ? 1 : 0, {
      duration: reduceMotion ? 0 : confirming ? 0.28 : 0.22,
      ease: confirming ? [0.25, 0.1, 0.25, 1] : [0.25, 0.1, 0.35, 1],
    });
    return () => controls.stop();
  }, [confirming, reduceMotion, isPresent, expansion]);

  useEffect(() => {
    if (!isPresent) return;
    if (confirming) leftRef.current?.focus({ preventScroll: true });
    else if (wasConfirming.current) rightRef.current?.focus({ preventScroll: true });
    wasConfirming.current = confirming;
  }, [confirming, isPresent]);

  useEffect(() => {
    if (!confirming || !isPresent) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setConfirming(false);
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [confirming, isPresent]);

  const labelTransition = { duration: transition.duration, ease: "easeInOut" as const };

  return (
    <div className="relative h-12 w-full" role="group" aria-label={confirming ? "确认删除当前记录" : "记录操作"}>
      <MotionButton
        ref={leftRef}
        type="button"
        disabled={!isPresent}
        onClick={() => confirming ? setConfirming(false) : onReturn()}
        variant="ghost"
        className="absolute left-0 top-0 h-12 rounded-full p-0 transition-transform hover:bg-transparent"
        style={{ width: leftWidth }}
        initial={false}
        animate={{
          backgroundColor: confirming ? "var(--card)" : "var(--primary)",
          color: confirming ? "var(--foreground)" : "var(--primary-foreground)",
        }}
        transition={transition}
        aria-label={confirming ? "取消删除" : returnLabel}
      >
        <AnimatePresence initial={false}>
          <motion.span key={confirming ? "cancel" : "return"}
            className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={labelTransition}>
            {confirming ? "取消" : returnLabel}
          </motion.span>
        </AnimatePresence>
      </MotionButton>
      <MotionButton
        ref={rightRef}
        type="button"
        disabled={!isPresent}
        onClick={() => {
          if (!confirming) { setConfirming(true); return; }
          if (deleting.current) return;
          deleting.current = true;
          try { onDelete(); }
          catch (error) {
            deleting.current = false;
            toast.error(error instanceof Error ? error.message : "删除失败，请重试");
          }
        }}
        variant="ghost"
        className="absolute right-0 top-0 h-12 rounded-full bg-destructive-soft p-0 text-destructive transition-transform hover:bg-destructive-soft"
        style={{ width: rightWidth, backgroundColor, color: iconColor }}
        initial={false}
        aria-label={confirming ? "确认删除当前记录" : "删除当前记录"}
        aria-expanded={confirming}
      >
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <Trash2 size={19} className="shrink-0" />
          <motion.span className="shrink-0 overflow-hidden" style={{ width: revealWidth }}>
            <span ref={labelRef} className="block w-max whitespace-nowrap pl-2 text-destructive-foreground">确认删除</span>
          </motion.span>
        </span>
      </MotionButton>
    </div>
  );
}
