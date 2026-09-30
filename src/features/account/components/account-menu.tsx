import { ActionTile } from "@/components/ui/action-tile";
import { DialogHeading } from "@/components/ui/dialog-heading";
import { useId, useRef } from "react";
import { ConfirmationPopover } from "@/components/ui/confirmation-popover";
import {
  Camera,
  CheckCircle2,
  KeyRound,
  LogOut,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AccountDialogProps } from "./account-dialog-types";
import { AvatarVisual } from "./avatar-visual";
import { NavigationOrderEditor } from "./navigation-order-editor";

type AccountMenuProps = Pick<
  AccountDialogProps,
  | "email"
  | "emailVerified"
  | "avatarUrl"
  | "avatarBusy"
  | "navigationOrder"
  | "onAvatarChange"
  | "onNavigationOrderChange"
  | "onClose"
> & {
  onOpenPassword: () => void;
  onRequestAvatarRemoval: () => void;
  avatarRemovalOpen: boolean;
  confirmingAvatarRemoval: boolean;
  onCancelAvatarRemoval: () => void;
  onConfirmAvatarRemoval: () => void;
  onRequestSignOut: () => void;
};

export function AccountMenu({
  email,
  emailVerified,
  avatarUrl,
  avatarBusy,
  navigationOrder,
  onAvatarChange,
  onNavigationOrderChange,
  onClose,
  onOpenPassword,
  onRequestAvatarRemoval,
  avatarRemovalOpen,
  confirmingAvatarRemoval,
  onCancelAvatarRemoval,
  onConfirmAvatarRemoval,
  onRequestSignOut,
}: AccountMenuProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const removalId = useId();

  const chooseAvatar = async (file: File) => {
    try {
      await onAvatarChange(file);
      toast.success("头像已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "头像更新失败");
    }
  };

  return (
    <>
      <div className="pointer-events-none sticky top-0 z-20 flex h-0 justify-end px-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="关闭账号面板"
          className="pointer-events-auto"
        >
          <X />
        </Button>
      </div>
      <DialogHeading id="account-dialog-title" title="账号" description="个人资料与使用偏好" variant="account" />

      <section className="rounded-card bg-muted p-4 text-center">
        <button
          type="button"
          disabled={avatarBusy}
          onClick={() => inputRef.current?.click()}
          className="relative mx-auto block size-20 rounded-full bg-primary text-xl font-black text-primary-foreground shadow-primary disabled:opacity-60"
          aria-label={avatarUrl ? "更换头像" : "设置头像"}
        >
          <AvatarVisual email={email} avatarUrl={avatarUrl} />
          <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-2 border-muted bg-card text-primary shadow-card">
            <Camera className="size-4" />
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void chooseAvatar(file);
            event.currentTarget.value = "";
          }}
        />
        <p className="mt-3 truncate text-card-title font-bold text-foreground">
          {email}
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-caption font-semibold text-success">
          <CheckCircle2 className="size-3.5" />
          {emailVerified ? "邮箱已验证" : "邮箱待验证"}
        </p>
        {avatarUrl && (
          <ConfirmationPopover
            id={removalId}
            open={avatarRemovalOpen}
            busy={confirmingAvatarRemoval}
            title="确认移除头像"
            confirmLabel="确认移除"
            busyLabel="正在移除…"
            onClose={onCancelAvatarRemoval}
            onConfirm={onConfirmAvatarRemoval}
          >
          <Button
            type="button"
            variant="ghost"
            disabled={avatarBusy}
            onClick={avatarRemovalOpen ? onCancelAvatarRemoval : onRequestAvatarRemoval}
            aria-haspopup="dialog"
            aria-expanded={avatarRemovalOpen}
            aria-controls={avatarRemovalOpen ? removalId : undefined}
            className="gap-1.5 px-3 text-caption font-bold text-destructive hover:bg-transparent"
          >
            <Trash2 className="size-4" />
            移除头像
          </Button>
          </ConfirmationPopover>
        )}
      </section>

      <section className="mt-4">
        <p className="mb-2 px-1 text-caption font-bold text-muted-foreground">
          账号安全
        </p>
        <ActionTile icon={<KeyRound className="size-4" />} title="修改密码" onClick={onOpenPassword} />
      </section>

      <NavigationOrderEditor
        navigationOrder={navigationOrder}
        onNavigationOrderChange={onNavigationOrderChange}
      />

      <Button
        type="button"
        variant="destructive"
        onClick={onRequestSignOut}
        className="mt-5 w-full"
      >
        <LogOut />
        退出登录
      </Button>
    </>
  );
}
