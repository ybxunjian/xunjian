import type { FormEventHandler, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";

type CredentialFormProps = {
  children: ReactNode;
  disabled: boolean;
  error?: ReactNode;
  submitLabel: string;
  submitting: boolean;
  submittingLabel?: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function CredentialForm({
  children,
  disabled,
  error,
  submitLabel,
  submitting,
  submittingLabel = "请稍候…",
  onSubmit,
}: CredentialFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-2">
      {children}
      <FormError>{error}</FormError>
      <Button
        type="submit"
        className="mt-3 min-h-13 w-full rounded-full text-base"
        disabled={disabled}
      >
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
