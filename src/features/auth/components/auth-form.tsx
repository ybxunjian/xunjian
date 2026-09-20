import type { FormEventHandler } from "react";
import { Mail } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import type { AuthFieldErrors } from "../model/auth-validation";
import { CredentialForm } from "./credential-form";
import { PasswordField } from "./password-field";
import type { AuthMode } from "./auth-screen-types";

type AuthFormProps = {
  mode: AuthMode;
  email: string;
  password: string;
  confirmPassword: string;
  alreadyRegistered: boolean;
  emailShakeKey: number;
  passwordShakeKey: number;
  confirmPasswordShakeKey: number;
  fieldErrors: AuthFieldErrors;
  formError: string | null;
  showResendAction: boolean;
  submitting: boolean;
  resending: boolean;
  resendCooldown: number;
  disabled: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onForgotPassword: () => void;
  onResendConfirmation: () => void;
};

export function AuthForm({
  mode,
  email,
  password,
  confirmPassword,
  alreadyRegistered,
  emailShakeKey,
  passwordShakeKey,
  confirmPasswordShakeKey,
  fieldErrors,
  formError,
  showResendAction,
  submitting,
  resending,
  resendCooldown,
  disabled,
  onSubmit,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onForgotPassword,
  onResendConfirmation,
}: AuthFormProps) {
  const submitLabel =
    mode === "sign-in"
      ? "登录"
      : mode === "sign-up"
        ? "创建账号"
        : mode === "forgot-password"
          ? "发送重置邮件"
          : "保存新密码";

  return (
    <CredentialForm
      disabled={disabled}
      error={
        formError ? (
          <>
            <p>{formError}</p>
            {showResendAction && (
              <button
                type="button"
                disabled={resending || resendCooldown > 0}
                onClick={onResendConfirmation}
                className="mt-1 min-h-11 text-primary disabled:text-muted-foreground"
              >
                {resending
                  ? "正在发送…"
                  : resendCooldown > 0
                    ? `${resendCooldown} 秒后可重发`
                    : "重新发送验证邮件"}
              </button>
            )}
          </>
        ) : undefined
      }
      submitLabel={submitLabel}
      submitting={submitting}
      onSubmit={onSubmit}
    >
      {mode !== "reset-password" && (
        <EmailField
          value={email}
          error={fieldErrors.email}
          shakeKey={emailShakeKey}
          showForgotPassword={mode === "sign-up" && alreadyRegistered}
          disabled={disabled}
          onChange={onEmailChange}
          onForgotPassword={onForgotPassword}
        />
      )}

      {mode !== "forgot-password" && (
        <PasswordField
          key={`auth-password-${mode}`}
          id="auth-password"
          label={mode === "reset-password" ? "新密码" : "密码"}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          required
          minLength={8}
          value={password}
          disabled={disabled}
          error={fieldErrors.password}
          shakeKey={passwordShakeKey}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="至少 8 位"
          belowAction={
            mode === "sign-in" ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onForgotPassword}
                className="-mr-2 flex min-h-11 items-start px-2 pt-3 text-caption font-bold text-primary disabled:opacity-45"
              >
                忘记密码？
              </button>
            ) : undefined
          }
        />
      )}

      {(mode === "sign-up" || mode === "reset-password") && (
        <PasswordField
          id="auth-confirm-password"
          label={mode === "reset-password" ? "确认新密码" : "确认密码"}
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          disabled={disabled}
          error={fieldErrors.confirmPassword}
          shakeKey={confirmPasswordShakeKey}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
          placeholder={
            mode === "reset-password" ? "再次输入新密码" : "再次输入密码"
          }
        />
      )}
    </CredentialForm>
  );
}

function EmailField({
  value,
  error,
  shakeKey,
  showForgotPassword,
  disabled,
  onChange,
  onForgotPassword,
}: {
  value: string;
  error?: string;
  shakeKey: number;
  showForgotPassword: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onForgotPassword: () => void;
}) {
  return (
    <TextField
      id="auth-email" label="邮箱" icon={<Mail className="size-5" />}
      type="email" inputMode="email" autoCapitalize="none" autoComplete="email"
      spellCheck={false} required value={value} disabled={disabled}
      error={error} shakeKey={shakeKey}
      onChange={(event) => onChange(event.target.value)} placeholder="邮箱"
      belowAction={error && showForgotPassword ? (
        <button type="button" disabled={disabled} onClick={onForgotPassword}
          className="flex min-h-11 shrink-0 items-center text-caption font-bold text-primary disabled:opacity-45">
          忘记密码？
        </button>
      ) : undefined}
    />
  );
}
