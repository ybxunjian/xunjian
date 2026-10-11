import { useEffect, useRef, useState } from "react";
import { mix, useIsPresent, useTransform } from "framer-motion";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SplitConfirmationButton, useSplitConfirmationColor, useSplitConfirmationMotion } from "@/components/ui/split-confirmation-button";

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
  const wasConfirming = useRef(false);
  const deleting = useRef(false);
  const { progress: expansion } = useSplitConfirmationMotion(confirming, reduceMotion, isPresent);
  const leftWidth = useTransform(expansion, leftWidthAt);
  const rightWidth = useTransform(expansion, rightWidthAt);
  const backgroundColor = useSplitConfirmationColor(expansion, "--detail-delete-entry-surface", "--destructive-surface", rightRef, "backgroundColor", 0.6);
  const returnBackground = useSplitConfirmationColor(expansion, "--primary-surface", "--neutral-control-surface", leftRef);
  const returnColor = useSplitConfirmationColor(expansion, "--primary-foreground", "--foreground", leftRef, "color");

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

  return (
    <div className="relative h-12 w-full" role="group" aria-label={confirming ? "确认删除当前记录" : "记录操作"}>
      <SplitConfirmationButton
        ref={leftRef}
        type="button"
        disabled={!isPresent}
        onClick={() => confirming ? setConfirming(false) : onReturn()}
        variant="ghost"
        className="absolute left-0 top-0 h-12 rounded-full p-0 transition-transform hover:bg-transparent active:scale-[.99]"
        style={{ width: leftWidth, backgroundColor: returnBackground, color: returnColor }}
        open={confirming}
        reduceMotion={reduceMotion}
        closedContent={returnLabel}
        openContent="取消"
        aria-label={confirming ? "取消删除" : returnLabel}
      />
      <SplitConfirmationButton
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
        className="absolute right-0 top-0 h-12 overflow-hidden rounded-full bg-detail-delete-entry-surface p-0 text-destructive transition-transform hover:bg-detail-delete-entry-surface active:scale-[.99]"
        style={{ width: rightWidth, backgroundColor }}
        open={confirming}
        reduceMotion={reduceMotion}
        closedContent={<Trash2 size={19} className="shrink-0" />}
        openContent="确认删除"
        openContentClassName="text-destructive-foreground"
        aria-label={confirming ? "确认删除当前记录" : "删除当前记录"}
        aria-expanded={confirming}
      />
    </div>
  );
}
