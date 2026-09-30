"use client";

import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "sonner";
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
  const confirmingRef = useRef(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const confirmAction = async () => {
    if (!confirmation || confirmingRef.current) return;
    confirmingRef.current = true;
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
      confirmingRef.current = false;
      setConfirming(false);
    }
  };

  return (
    <Sheet labelledBy="account-dialog-title" onClose={props.onClose} layoutScroll busy={confirming}
      overlays={<>
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
        onClose={() => { if (!confirmingRef.current) props.onClose(); }}
        onOpenPassword={() => { if (!confirmingRef.current) setPasswordOpen(true); }}
        onRequestAvatarRemoval={() => { if (!confirmingRef.current) setConfirmation("remove-avatar"); }}
        avatarRemovalOpen={confirmation === "remove-avatar"}
        confirmingAvatarRemoval={confirming && confirmation === "remove-avatar"}
        onCancelAvatarRemoval={() => {
          if (!confirming) setConfirmation(null);
        }}
        onConfirmAvatarRemoval={() => void confirmAction()}
        onRequestSignOut={() => { if (!confirmingRef.current) setConfirmation("sign-out"); }}
        signOutOpen={confirmation === "sign-out"}
        signingOut={confirming && confirmation === "sign-out"}
        onCancelSignOut={() => { if (!confirming) setConfirmation(null); }}
        onConfirmSignOut={() => void confirmAction()}
      />
    </Sheet>
  );
}
