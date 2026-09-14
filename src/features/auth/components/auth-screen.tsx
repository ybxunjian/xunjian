"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CircleCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getAuthErrorCode,
  getAuthErrorMessage,
} from "../model/auth-errors";
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  type AuthFieldErrors,
} from "../model/auth-validation";
import { AuthForm } from "./auth-form";
import type { AuthMode, AuthScreenProps } from "./auth-screen-types";
import { AccountNotice, StatusPanel } from "./auth-status-panels";

type AuthNotice = "confirmation-sent" | null;

function AuthLogo() {
  return (
    <svg
      viewBox="800 850 2400 2400"
      aria-hidden="true"
      focusable="false"
      className="mx-auto mb-5 size-14"
    >
      <defs>
        <linearGradient id="auth-logo-aqua" x1="0" y1="0" x2="0.12" y2="1">
          <stop offset="0" stopColor="#3deb9f" />
          <stop offset="0.45" stopColor="#18d8b9" />
          <stop offset="0.72" stopColor="#08c1cd" />
          <stop offset="1" stopColor="#00a0e3" />
        </linearGradient>
      </defs>
      <path
        fill="#0f1f37"
        d="M1042 1223H1300C1364 1223 1412 1249 1460 1301L2847 2832C2896 2886 2914 2939 2882 2977C2862 3002 2830 3011 2784 3011H2369C2277 3011 2202 2975 2141 2907L944 1399C891 1332 901 1272 952 1239C977 1223 1006 1223 1042 1223Z"
      />
      <path
        fill="#0f1f37"
        d="M1402 2222C1441 2183 1481 2185 1521 2224L1687 2393C1724 2431 1725 2470 1690 2511L1459 2768C1415 2818 1360 2843 1294 2843H1017C952 2843 916 2818 905 2775C895 2736 910 2695 950 2652L1402 2222Z"
      />
      <path
        fill="url(#auth-logo-aqua)"
        d="M2588 1034H3067C3128 1034 3158 1064 3158 1120C3158 1152 3141 1184 3107 1219L2307 2011C2258 2060 2209 2060 2162 2012L1990 1807C1950 1759 1950 1713 1992 1665L2502 1110C2528 1081 2557 1055 2588 1034Z"
      />
      <path
        fill="url(#auth-logo-aqua)"
        d="M3052 1507C3101 1462 3151 1481 3151 1544V2397C3151 2580 3110 2742 2965 2876L2599 2472C2689 2472 2736 2422 2736 2317V1857C2736 1802 2754 1764 2795 1726L3052 1507Z"
      />
    </svg>
  );
}

export function AuthScreen({
  passwordRecovery = false,
  onSignIn,
  onSignUp,
  onResendSignUpConfirmation,
  onRequestPasswordReset,
  onUpdatePassword,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(
    passwordRecovery ? "reset-password" : "sign-in",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<AuthNotice>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [emailShakeKey, setEmailShakeKey] = useState(0);
  const [passwordShakeKey, setPasswordShakeKey] = useState(0);
  const [confirmPasswordShakeKey, setConfirmPasswordShakeKey] = useState(0);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showResendAction, setShowResendAction] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const changeMode = (nextMode: AuthMode) => {
    if (submitting || resending) return;
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setNotice(null);
    setAlreadyRegistered(false);
    setResetEmailSent(false);
    setFieldErrors({});
    setFormError(null);
    setShowResendAction(false);
  };

  const clearFieldError = (field: keyof AuthFieldErrors) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };

  const showAlreadyRegistered = () => {
    setAlreadyRegistered(true);
    setFieldErrors((current) => ({
      ...current,
      email: "该邮箱已注册",
    }));
    setPassword("");
    setConfirmPassword("");
    setEmailShakeKey((current) => current + 1);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setShowResendAction(false);

    const nextErrors: AuthFieldErrors = {};
    if (mode !== "reset-password") {
      nextErrors.email = validateEmail(email) ?? undefined;
    }
    if (mode !== "forgot-password") {
      nextErrors.password = validatePassword(password) ?? undefined;
    }
    if (mode === "sign-up" || mode === "reset-password") {
      nextErrors.confirmPassword =
        validatePasswordConfirmation(password, confirmPassword) ?? undefined;
    }
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      if (nextErrors.email) setEmailShakeKey((current) => current + 1);
      if (nextErrors.password) setPasswordShakeKey((current) => current + 1);
      if (nextErrors.confirmPassword) {
        setConfirmPasswordShakeKey((current) => current + 1);
      }
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    setSubmitting(true);
    try {
      if (mode === "sign-in") {
        await onSignIn(normalizedEmail, password);
        toast.success("登录成功");
      } else if (mode === "sign-up") {
        const result = await onSignUp(normalizedEmail, password);
        if (result.alreadyRegistered) {
          showAlreadyRegistered();
        } else if (result.needsEmailConfirmation) {
          setNotice("confirmation-sent");
          setResendCooldown(60);
        } else {
          toast.success("注册成功");
        }
      } else if (mode === "forgot-password") {
        await onRequestPasswordReset(normalizedEmail);
        setResetEmailSent(true);
      } else {
        await onUpdatePassword(password);
        toast.success("密码已更新，其他设备已退出");
      }
    } catch (error) {
      const code = getAuthErrorCode(error);
      if (
        mode === "sign-up" &&
        (code === "user_already_exists" || code === "email_exists")
      ) {
        showAlreadyRegistered();
      } else {
        setFormError(getAuthErrorMessage(error, mode));
        setShowResendAction(
          mode === "sign-in" && code === "email_not_confirmed",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resendConfirmation = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors((current) => ({ ...current, email: emailError }));
      return;
    }
    if (resendCooldown > 0) return;

    setResending(true);
    setFormError(null);
    try {
      await onResendSignUpConfirmation(normalizeEmail(email));
      setResendCooldown(60);
      toast.success("验证邮件已重新发送");
    } catch (error) {
      setFormError(getAuthErrorMessage(error, "resend-confirmation"));
    } finally {
      setResending(false);
    }
  };

  const accountMode = mode === "sign-in" || mode === "sign-up";
  const formDisabled = submitting || resending;

  return (
    <main className="auth-shell min-h-svh bg-background pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="auth-content relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] w-full flex-col">
        <div className="mb-6 mt-8 text-center sm:mt-10">
          {mode === "reset-password" ? (
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-card bg-primary text-primary-foreground shadow-primary">
              <KeyRound className="size-7" />
            </div>
          ) : (
            <AuthLogo />
          )}
          <h1 className="text-title font-black tracking-tight text-foreground-strong">
            {mode === "reset-password" ? "设置新密码" : "夜班巡检"}
          </h1>
          <p className="mt-3 text-base tracking-wide text-muted-foreground">
            {mode === "forgot-password"
              ? "输入注册邮箱，我们会发送密码重置链接。"
              : mode === "reset-password"
                ? "设置一个至少 8 位的新密码。"
                : "让每一次巡检，清晰留在当下。"}
          </p>
        </div>

        <Card className="border-0 bg-transparent shadow-none">
          <CardContent className="p-0">
            {!accountMode && mode === "forgot-password" ? (
              <Button
                type="button"
                variant="ghost"
                disabled={formDisabled}
                onClick={() => changeMode("sign-in")}
                className="-ml-3 mb-3 px-3"
              >
                <ArrowLeft /> 返回登录
              </Button>
            ) : mode === "reset-password" ? (
              <p className="mb-4 text-center text-body text-muted-foreground">
                更新后，其他设备会自动退出登录。
              </p>
            ) : null}

            {notice ? (
              <AccountNotice
                email={normalizeEmail(email)}
                resending={resending}
                resendCooldown={resendCooldown}
                formError={formError}
                onResend={resendConfirmation}
                onSignIn={() => changeMode("sign-in")}
              />
            ) : resetEmailSent ? (
              <StatusPanel
                icon={<CircleCheck className="size-6" />}
                title="请查收重置邮件"
                description="如果该邮箱已注册，你会收到密码重置链接。没有收到时，请检查垃圾邮件或稍后重试。"
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => changeMode("sign-in")}
                  className="mt-5 w-full"
                >
                  返回登录
                </Button>
              </StatusPanel>
            ) : (
              <AuthForm
                mode={mode}
                email={email}
                password={password}
                confirmPassword={confirmPassword}
                alreadyRegistered={alreadyRegistered}
                emailShakeKey={emailShakeKey}
                passwordShakeKey={passwordShakeKey}
                confirmPasswordShakeKey={confirmPasswordShakeKey}
                fieldErrors={fieldErrors}
                formError={formError}
                showResendAction={showResendAction}
                submitting={submitting}
                resending={resending}
                resendCooldown={resendCooldown}
                disabled={formDisabled}
                onSubmit={submit}
                onEmailChange={(value) => {
                  setEmail(value);
                  setAlreadyRegistered(false);
                  clearFieldError("email");
                }}
                onPasswordChange={(value) => {
                  setPassword(value);
                  clearFieldError("password");
                }}
                onConfirmPasswordChange={(value) => {
                  setConfirmPassword(value);
                  clearFieldError("confirmPassword");
                }}
                onForgotPassword={() => changeMode("forgot-password")}
                onResendConfirmation={resendConfirmation}
              />
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex min-h-14 items-start justify-center">
          {accountMode && !notice && (
            <p className="text-center text-base text-muted-foreground">
              {mode === "sign-in" ? "还没有账号？" : "已经有账号？"}{" "}
              <button
                type="button"
                disabled={formDisabled}
                onClick={() =>
                  changeMode(mode === "sign-in" ? "sign-up" : "sign-in")
                }
                className="min-h-11 px-1 font-bold text-primary transition disabled:opacity-45"
              >
                {mode === "sign-in" ? "注册" : "登录"}
              </button>
            </p>
          )}
        </div>

      </div>
    </main>
  );
}
