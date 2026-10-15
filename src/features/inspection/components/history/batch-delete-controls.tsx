import { useEffect, useRef, useState } from "react";
import { motion, useIsPresent, useTransform } from "framer-motion";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SplitConfirmationButton, useSplitConfirmationMotion } from "@/components/ui/split-confirmation-button";

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
  const lastFocusState = useRef({ open: false, selectionKey });
  const deleting = useRef(false);
  const { progress } = useSplitConfirmationMotion(open, reduceMotion, isPresent);
  // Keep the original trigger's entire 76px hit area and center for confirmation.
  const leftOffset = useTransform(progress, [0, 1], [52, 84]);
  const cancel = () => setConfirmation({ selectionKey, open: false });

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
      className={`relative ml-auto h-11 w-40 shrink-0 ${selectedRecordIds.length === 0 ? "opacity-45" : ""}`}
      role="group"
      aria-label={open ? `确认删除 ${selectedRecordIds.length} 条历史记录` : "批量删除记录"}
      inert={!isPresent}
    >
      <SplitConfirmationButton
        ref={cancelRef}
        type="button"
        variant="ghost"
        disabled={unavailable || !open}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        aria-label="取消批量删除"
        onClick={cancel}
        open={open}
        reduceMotion={reduceMotion}
        openContent="取消"
        className="absolute top-0 h-11 w-[76px] rounded-full bg-transparent p-0 text-foreground hover:bg-transparent active:scale-[.99] disabled:opacity-100"
        style={{ right: leftOffset }}
        surface={(
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full bg-neutral-control-surface"
            style={{ opacity: progress }}
            aria-hidden="true"
          />
        )}
      />
      <SplitConfirmationButton
        ref={triggerRef}
        type="button"
        variant="destructive"
        disabled={unavailable}
        aria-expanded={open}
        aria-label={open ? `确认删除 ${selectedRecordIds.length} 条历史记录` : `删除 ${selectedRecordIds.length} 条历史记录`}
        onClick={() => {
          if (unavailable) return;
          if (!open) { setConfirmation({ selectionKey, open: true }); return; }
          if (deleting.current) return;
          deleting.current = true;
          try { onDelete([...selectedRecordIds]); }
          catch (error) {
            deleting.current = false;
            toast.error(error instanceof Error ? error.message : "删除失败，请重试");
          }
        }}
        open={open}
        reduceMotion={reduceMotion}
        closedContent={<><Trash2 size={16} />删除</>}
        openContent="确认"
        className="absolute right-0 top-0 h-11 w-[76px] rounded-full p-0 transition-transform hover:bg-destructive-surface active:scale-[.99] disabled:opacity-100"
      />
    </div>
  );
}
