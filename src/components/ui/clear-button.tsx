import type { ComponentProps } from "react";
import { Button } from "./button";

export function ClearButton(props: Pick<ComponentProps<typeof Button>, "onClick" | "disabled">) {
  return <Button type="button" variant="ghost" className="-mr-2 min-w-11 shrink-0 px-2 text-xs font-normal text-subtle-foreground" {...props}>清空</Button>;
}
