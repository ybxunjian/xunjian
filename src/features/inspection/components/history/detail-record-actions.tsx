import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MotionButton = motion.create(Button);
// Matching calc templates let Motion interpolate every frame, including interruptions.
export const DETAIL_ACTION_WIDTHS = {
  closed: { left: "calc(100% + -56px)", right: "calc(0% + 48px)" },
  open: { left: "calc(50% + -4px)", right: "calc(50% + -4px)" },
};

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
  const wasConfirming = useRef(false);
  const deleting = useRef(false);
  const transition = {
    duration: reduceMotion ? 0 : confirming ? 0.28 : 0.22,
    ease: confirming ? [0.25, 0.1, 0.25, 1] as const : [0.25, 0.1, 0.35, 1] as const,
  };

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
        className="absolute left-0 top-0 h-12 rounded-full p-0 hover:bg-transparent"
        initial={false}
        animate={{
          width: confirming ? DETAIL_ACTION_WIDTHS.open.left : DETAIL_ACTION_WIDTHS.closed.left,
          backgroundColor: confirming ? "var(--muted)" : "var(--primary)",
          color: confirming ? "var(--muted-foreground)" : "var(--primary-foreground)",
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
        className="absolute right-0 top-0 h-12 rounded-full p-0 hover:bg-transparent"
        initial={false}
        animate={{
          width: confirming ? DETAIL_ACTION_WIDTHS.open.right : DETAIL_ACTION_WIDTHS.closed.right,
          backgroundColor: confirming ? "var(--destructive)" : "var(--destructive-soft)",
          color: confirming ? "var(--destructive-foreground)" : "var(--destructive)",
        }}
        transition={transition}
        aria-label={confirming ? "确认删除当前记录" : "删除当前记录"}
        aria-expanded={confirming}
      >
        <AnimatePresence initial={false}>
          <motion.span key={confirming ? "confirm" : "delete"}
            className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={labelTransition}>
            {confirming ? "确认删除" : <Trash2 size={19} />}
          </motion.span>
        </AnimatePresence>
      </MotionButton>
    </div>
  );
}
