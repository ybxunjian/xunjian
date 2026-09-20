"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "sonner";
import { AccountConfirmationSheet } from "./account-confirmation-sheet";
import type {
  AccountDialogProps,
  ConfirmationAction,
} from "./account-dialog-types";
import { AccountMenu } from "./account-menu";
import { AccountPasswordSheet } from "./account-password-sheet";

export function AccountDialog(props: AccountDialogProps) {
  const [confirmation, setConfirmation] =
    useState<ConfirmationAction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const confirmAction = async () => {
    if (!confirmation) return;
    setConfirming(true);
    try {
      if (confirmation === "remove-avatar") {
        await props.onAvatarRemove();
        toast.success("头像已移除");
        setConfirmation(null);
      } else {
        await props.onSignOut();
      }
    } catch {
      toast.error(
        confirmation === "remove-avatar"
          ? "头像移除失败，请稍后重试"
          : "退出登录失败，请稍后重试",
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Sheet labelledBy="account-dialog-title" onClose={props.onClose} layoutScroll
      overlays={<>
        <AnimatePresence>
          {confirmation && (
            <AccountConfirmationSheet
              action={confirmation}
              submitting={confirming}
              onCancel={() => setConfirmation(null)}
              onConfirm={() => void confirmAction()}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {passwordOpen && (
            <AccountPasswordSheet
              onChangePassword={props.onChangePassword}
              onClose={() => setPasswordOpen(false)}
            />
          )}
        </AnimatePresence>
      </>}
    >
      <AccountMenu
        email={props.email}
        emailVerified={props.emailVerified}
        avatarUrl={props.avatarUrl}
        avatarBusy={props.avatarBusy}
        navigationOrder={props.navigationOrder}
        onAvatarChange={props.onAvatarChange}
        onNavigationOrderChange={props.onNavigationOrderChange}
        onClose={props.onClose}
        onOpenPassword={() => setPasswordOpen(true)}
        onRequestAvatarRemoval={() => setConfirmation("remove-avatar")}
        onRequestSignOut={() => setConfirmation("sign-out")}
      />
    </Sheet>
  );
}
