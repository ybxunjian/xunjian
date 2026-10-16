"use client";

import { LoaderCircle } from "lucide-react";
import { AuthScreen, useAuth } from "@/features/auth";
import { InspectionAppContent } from "./inspection-app-content";

export function NightInspectionApp() {
  const auth = useAuth();
  const account = auth.user ?? auth.offlineIdentity;

  if (auth.status === "loading") {
    return (
      <main className="mx-auto flex min-h-svh max-w-md items-center justify-center bg-background text-muted-foreground">
        <LoaderCircle className="size-7 animate-spin" aria-label="正在检查登录状态" />
      </main>
    );
  }

  if (
    auth.configured &&
    (auth.status === "signed-out" || auth.status === "password-recovery")
  ) {
    return (
      <AuthScreen
        key={auth.status}
        passwordRecovery={auth.status === "password-recovery"}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        onResendSignUpConfirmation={auth.resendSignUpConfirmation}
        onRequestPasswordReset={auth.requestPasswordReset}
        onUpdatePassword={auth.updatePassword}
      />
    );
  }

  return (
    <InspectionAppContent
      key={account?.id ?? "local"}
      userId={account?.id}
      email={account?.email}
      emailVerified={Boolean(account?.email_confirmed_at)}
      onChangePassword={auth.user ? auth.changePassword : undefined}
      onSignOut={auth.user ? auth.signOut : undefined}
    />
  );
}
