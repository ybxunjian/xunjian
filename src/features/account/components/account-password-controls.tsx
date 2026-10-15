"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion, useIsPresent, usePresence, useReducedMotion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { ActionTile } from "@/components/ui/action-tile";
import type { AccountDialogProps } from "./account-dialog-types";
import { AccountPasswordForm } from "./account-password-form";
import { useAccountHeightAnimation } from "./use-account-height-animation";

type PasswordControlsProps = Pick<AccountDialogProps, "onChangePassword"> & {
  open: boolean;
  busy: boolean;
  disabled: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCollapsed: () => void;
  onBusyChange: (busy: boolean) => void;
};

export function AccountPasswordControls(props: PasswordControlsProps) {
  const { open, busy, onClose } = props;
  const isPresent = useIsPresent();
  const triggerRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(props.open);
  useLayoutEffect(() => { openRef.current = props.open; }, [props.open]);
  useEffect(() => {
    if (!open || !isPresent) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (!busy) onClose();
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [open, busy, onClose, isPresent]);
  return (
    <div className="rounded-control bg-muted">
      <div ref={triggerRef}>
        <ActionTile icon={<KeyRound className="size-4" />} title="修改密码" pressFeedback="none"
          expanded={props.open} controls={props.open ? "account-password-form" : undefined}
          disabled={props.busy || props.disabled}
          onClick={props.open ? props.onClose : props.onOpen} />
      </div>
      <AnimatePresence initial={false} onExitComplete={() => {
        if (openRef.current || !isPresent) return;
        props.onCollapsed();
        triggerRef.current?.querySelector("button")?.focus({ preventScroll: true });
      }}>
        {props.open && <PasswordExpansion key="password" {...props} />}
      </AnimatePresence>
    </div>
  );
}

function PasswordExpansion(props: PasswordControlsProps) {
  const [isPresent, safeToRemove] = usePresence();
  const reduceMotion = useReducedMotion();
  const { containerRef, contentRef } = useAccountHeightAnimation({
    open: isPresent,
    initialOpen: false,
    onCollapsed: () => safeToRemove?.(),
  });

  return (
    <div ref={containerRef} id="account-password-form" role="region" aria-label="修改密码表单"
      inert={!isPresent} aria-hidden={!isPresent}
      className="overflow-hidden">
      <motion.div ref={contentRef}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.22,
          delay: reduceMotion || !isPresent ? 0 : 0.09, ease: "easeInOut" }}>
        <AccountPasswordForm onChangePassword={props.onChangePassword}
          onBusyChange={props.onBusyChange} onClose={props.onClose} disabled={props.disabled} />
      </motion.div>
    </div>
  );
}
