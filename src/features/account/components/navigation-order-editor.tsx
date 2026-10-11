import { useRef, useState } from "react";
import { motion, Reorder, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LongPressReorderItem } from "@/components/ui/long-press-reorder-item";
import { INSPECTION_TABS } from "@/features/inspection/model/config";
import type { InspectionTab } from "@/features/inspection/model/types";
import { DEFAULT_NAVIGATION_ORDER } from "../model/user-preferences";
import type { AccountDialogProps } from "./account-dialog-types";

const TAB_LABELS = Object.fromEntries(INSPECTION_TABS) as Record<
  InspectionTab,
  string
>;

export function NavigationOrderEditor({
  navigationOrder,
  onNavigationOrderChange,
}: Pick<AccountDialogProps, "navigationOrder" | "onNavigationOrderChange">) {
  const draftOrderRef = useRef(navigationOrder);
  const [draftOrder, setDraftOrder] = useState(navigationOrder);
  const [resetRotation, setResetRotation] = useState(0);
  const reduceMotion = useReducedMotion();

  const updateOrder = (order: InspectionTab[]) => {
    draftOrderRef.current = order;
    setDraftOrder(order);
  };

  const commitOrder = async () => {
    const next = draftOrderRef.current;
    if (next.every((tab, index) => navigationOrder[index] === tab)) return;
    await onNavigationOrderChange(next);
  };

  const resetOrder = async () => {
    if (!reduceMotion) setResetRotation((rotation) => rotation - 360);
    const next = [...DEFAULT_NAVIGATION_ORDER];
    draftOrderRef.current = next;
    setDraftOrder(next);
    await onNavigationOrderChange(next);
    toast.success("已恢复默认导航顺序");
  };

  return (
    <section className="mt-4">
      <div className="mb-2 flex min-h-9 items-center justify-between px-1">
        <div>
          <p className="text-caption font-bold text-muted-foreground">
            导航顺序
          </p>
          <p className="mt-0.5 text-label text-subtle-foreground">
            长按左侧图标拖动，第一项为启动页面
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="compact"
          onClick={() => void resetOrder()}
        >
          <motion.span aria-hidden="true" className="inline-flex shrink-0"
            animate={{ rotate: resetRotation }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.25, 0.1, 0.25, 1] }}>
            <RotateCcw className="size-3.5" />
          </motion.span>
          恢复默认
        </Button>
      </div>
      <Reorder.Group
        axis="y"
        values={draftOrder}
        onReorder={updateOrder}
        className="space-y-2"
      >
        {draftOrder.map((tab, index) => (
          <LongPressReorderItem
            key={tab}
            value={tab}
            handleLabel={`长按移动${TAB_LABELS[tab]}`}
            onReorderEnd={() => void commitOrder()}
          >
            <span className="flex-1 font-bold">{TAB_LABELS[tab]}</span>
            {index === 0 && (
              <span className="rounded-full bg-secondary px-2 py-1 text-label font-bold text-secondary-foreground">
                首页
              </span>
            )}
          </LongPressReorderItem>
        ))}
      </Reorder.Group>
    </section>
  );
}
