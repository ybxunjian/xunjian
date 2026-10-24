import type { ReactNode } from "react";

type SectionHeadingProps = {
  title: string;
  actions?: ReactNode;
};

export function SectionHeading({ title, actions }: SectionHeadingProps) {
  return (
    <div className="mb-4 flex min-h-11 items-center justify-between px-1">
      <h2 className="text-title font-black tracking-tight">{title}</h2>
      {actions ? <div className="-mr-2 flex items-center">{actions}</div> : null}
    </div>
  );
}
