import { DialogHeading } from "@/components/ui/dialog-heading";
import { useIsPresent } from "framer-motion";
import { Sheet } from "@/components/ui/sheet";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveValidation } from "../../model/types";

type SaveValidationDialogProps = {
  validation: SaveValidation;
  onSave: () => void;
  onCancel: () => void;
};

export function SaveValidationDialog({
  validation,
  onSave,
  onCancel,
}: SaveValidationDialogProps) {
  const isPresent = useIsPresent();

  return (
    <Sheet labelledBy="save-validation-title" onClose={onCancel}>
      <DialogHeading id="save-validation-title" title="记录尚未填写完整" description="请检查以下内容，是否仍要保存？" icon={<AlertTriangle size={20} />} tone="warning" className="pb-3" />
      <div className="max-h-[46svh] space-y-3 overflow-y-auto py-1">
        {validation.unselectedPumps.length > 0 && (
          <MissingGroup
            title="未选择泵号"
            items={validation.unselectedPumps}
            tone="amber"
          />
        )}
        {validation.emptyInputs.length > 0 && (
          <MissingGroup
            title="未填写数值"
            items={validation.emptyInputs}
            tone="rose"
          />
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={!isPresent}
          onClick={onSave}
          className="bg-muted text-foreground"
        >
          仍然保存
        </Button>
        <Button type="button" disabled={!isPresent} onClick={onCancel}>
          返回补充
        </Button>
      </div>
    </Sheet>
  );
}

function MissingGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "amber" | "rose";
}) {
  return (
    <section
      className={`rounded-small p-3 ${tone === "amber" ? "bg-warning-soft" : "bg-destructive-soft"}`}
    >
      <div className="flex items-center justify-between">
        <b
          className={`text-body ${tone === "amber" ? "text-warning" : "text-destructive"}`}
        >
          {title}
        </b>
        <span
          className={`rounded-full bg-card/80 px-2 py-0.5 text-caption ${tone === "amber" ? "text-warning" : "text-destructive"}`}
        >
          {items.length} 项
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            className="flex gap-2 text-caption leading-5 text-muted-foreground"
            key={item}
          >
            <span className="shrink-0 text-border">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
