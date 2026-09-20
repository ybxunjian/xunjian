import { DialogHeading } from "@/components/ui/dialog-heading";
import { useIsPresent } from "framer-motion";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { ConfirmationAction } from "./account-dialog-types";

export function AccountConfirmationSheet({
  action,
  submitting,
  onCancel,
  onConfirm,
}: {
  action: ConfirmationAction;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isPresent = useIsPresent();
  const isAvatarRemoval = action === "remove-avatar";

  return (
    <Sheet labelledBy="account-confirmation-title" onClose={onCancel} nested busy={submitting} size="compact" role="alertdialog">
      <DialogHeading id="account-confirmation-title" variant="compact"
        title={isAvatarRemoval ? "确认移除头像" : "确认退出登录"}
        description={isAvatarRemoval ? "移除后将恢复为默认头像。" : "退出后需要再次输入账号和密码才能使用云端同步。"}
      />
      <div className="mt-4 flex gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={submitting || !isPresent}
          onClick={onCancel}
          className="flex-1"
        >
          取消
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={submitting || !isPresent}
          onClick={onConfirm}
          className="flex-1"
        >
          {submitting
            ? "正在处理…"
            : isAvatarRemoval
              ? "移除头像"
              : "退出登录"}
        </Button>
      </div>
    </Sheet>
  );
}
