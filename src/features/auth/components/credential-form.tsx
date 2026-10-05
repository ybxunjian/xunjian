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
  onCancel?: () => void;
};

export function CredentialForm({
  children,
  disabled,
  error,
  submitLabel,
  submitting,
  submittingLabel = "请稍候…",
  onSubmit,
  onCancel,
}: CredentialFormProps) {
  const submitButton = (
    <Button type="submit"
      className={onCancel ? "w-full rounded-full active:scale-[.99]" : "mt-[var(--space-credential-submit)] min-h-12 w-full rounded-full text-base"}
      disabled={disabled}>
      {submitting ? submittingLabel : submitLabel}
    </Button>
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-[var(--space-credential-fields)]">
      {children}
      <FormError>{error}</FormError>
      {onCancel ? (
        <div className="mt-[var(--space-credential-actions)] grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={disabled} onClick={onCancel}
            className="w-full rounded-full border-0 active:scale-[.99]">取消</Button>
          {submitButton}
        </div>
      ) : submitButton}
    </form>
  );
}
