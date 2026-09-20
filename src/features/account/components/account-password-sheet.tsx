import { useState, type FormEvent } from "react";
import { useIsPresent } from "framer-motion";
import { Sheet } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useFieldFeedback } from "@/hooks/use-field-feedback";
import { Button } from "@/components/ui/button";
import {
  CredentialForm,
  CredentialHeading,
  PasswordField,
  validatePassword,
  validatePasswordConfirmation,
} from "@/features/auth";
import type { AccountDialogProps } from "./account-dialog-types";

type PasswordFieldName = "currentPassword" | "password" | "confirmPassword";
type PasswordFieldErrors = Partial<Record<PasswordFieldName, string>>;
type ChangePasswordError = {
  field?: PasswordFieldName;
  message: string;
};

export function AccountPasswordSheet({
  onChangePassword,
  onClose,
}: Pick<AccountDialogProps, "onChangePassword"> & { onClose: () => void }) {
  const isPresent = useIsPresent();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { errors: fieldErrors, shakeKeys, report, clear } =
    useFieldFeedback<PasswordFieldName>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clearFieldError = (field: PasswordFieldName) => {
    clear(field);
    setFormError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: PasswordFieldErrors = {
      currentPassword: currentPassword ? undefined : "请输入当前密码",
      password: validatePassword(password) ?? undefined,
      confirmPassword:
        validatePasswordConfirmation(password, confirmPassword) ?? undefined,
    };
    if (!nextErrors.password && currentPassword && password === currentPassword) {
      nextErrors.password = "新密码不能与当前密码相同";
    }

    if (report(nextErrors)) return;

    setSubmitting(true);
    try {
      await onChangePassword(currentPassword, password);
      toast.success("密码已修改，其他设备已退出");
      onClose();
    } catch (caught) {
      const nextError = getChangePasswordError(caught);
      if (nextError.field) {
        const nextErrors = { [nextError.field]: nextError.message };
        report(nextErrors);
      } else {
        setFormError(nextError.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet labelledBy="password-dialog-title" onClose={onClose} nested busy={submitting} size="credential">
      <div className="relative pb-5 text-center">
        <CredentialHeading id="password-dialog-title" level="h3" title="修改密码" description="设置一个至少 8 位的新密码。" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={submitting || !isPresent}
          onClick={onClose}
          aria-label="关闭修改密码"
          className="absolute -right-2 -top-2"
        >
          <X />
        </Button>
      </div>
      <CredentialForm
        disabled={submitting || !isPresent}
        error={formError ?? undefined}
        submitLabel="保存新密码"
        submitting={submitting}
        onSubmit={submit}
      >
        <PasswordField
          id="account-current-password"
          label="当前密码"
          autoComplete="current-password"
          required
          value={currentPassword}
          disabled={submitting || !isPresent}
          error={fieldErrors.currentPassword}
          shakeKey={shakeKeys.currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value);
            clearFieldError("currentPassword");
          }}
          placeholder="输入当前密码"
        />
        <PasswordField
          id="account-new-password"
          label="新密码"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          disabled={submitting || !isPresent}
          error={fieldErrors.password}
          shakeKey={shakeKeys.password}
          onChange={(event) => {
            setPassword(event.target.value);
            clearFieldError("password");
          }}
          placeholder="至少 8 位"
        />
        <PasswordField
          id="account-confirm-password"
          label="确认新密码"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          disabled={submitting || !isPresent}
          error={fieldErrors.confirmPassword}
          shakeKey={shakeKeys.confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            clearFieldError("confirmPassword");
          }}
          placeholder="再次输入新密码"
        />
      </CredentialForm>
    </Sheet>
  );
}

function getChangePasswordError(error: unknown): ChangePasswordError {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code === "invalid_credentials" || code === "invalid_password") {
      return { field: "currentPassword" as const, message: "当前密码不正确" };
    }
    if (code === "same_password") {
      return { field: "password" as const, message: "新密码不能与当前密码相同" };
    }
  }
  return { message: "密码修改失败，请稍后重试" };
}
