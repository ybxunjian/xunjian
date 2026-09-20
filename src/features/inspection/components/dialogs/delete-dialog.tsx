import { DialogHeading } from "@/components/ui/dialog-heading";
import { useIsPresent } from "framer-motion";
import { Sheet } from "@/components/ui/sheet";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeleteRequest } from "../../model/types";

type DeleteDialogProps = {
  request: DeleteRequest;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteDialog({
  request,
  onConfirm,
  onCancel,
}: DeleteDialogProps) {
  const isPresent = useIsPresent();

  return (
    <Sheet labelledBy="delete-title" onClose={onCancel}>
      <DialogHeading id="delete-title" title="确认删除？" description={request.label} variant="centered" />
      <Button
        type="button"
        variant="destructive"
        disabled={!isPresent}
        onClick={onConfirm}
        className="w-full"
      >
        <Trash2 size={17} />
        确认删除
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={!isPresent}
        onClick={onCancel}
        className="mt-2 w-full"
      >
        取消
      </Button>
    </Sheet>
  );
}
