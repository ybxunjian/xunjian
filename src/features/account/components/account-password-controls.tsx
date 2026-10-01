"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { ActionTile } from "@/components/ui/action-tile";
import type { AccountDialogProps } from "./account-dialog-types";
import { AccountPasswordForm } from "./account-password-form";

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
        <ActionTile icon={<KeyRound className="size-4" />} title="修改密码" pressFeedback="subtle"
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
  const isPresent = useIsPresent();
  const reduceMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => setHeight(content.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div id="account-password-form" role="region" aria-label="修改密码表单"
      inert={!isPresent} aria-hidden={!isPresent}
      initial={{ height: 0 }} animate={{ height }} exit={{ height: 0 }}
      transition={{ duration: reduceMotion ? 0 : isPresent ? 0.28 : 0.22,
        delay: reduceMotion || isPresent ? 0 : 0.04, ease: [0.25, 0.1, 0.25, 1] }}
      className="overflow-hidden">
      <motion.div ref={contentRef}
        initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : isPresent ? 0.18 : 0.1,
          delay: reduceMotion || !isPresent ? 0 : 0.06, ease: "easeInOut" }}>
        <AccountPasswordForm onChangePassword={props.onChangePassword}
          onBusyChange={props.onBusyChange} onClose={props.onClose} disabled={props.disabled} />
      </motion.div>
    </motion.div>
  );
}
