"use client";

import type { ComponentProps } from "react";
import { Button } from "./ui";

/** Submit button that asks before a destructive action (thumbs are imprecise on a phone). */
export function ConfirmButton({ confirmText, onClick, ...props }: ComponentProps<typeof Button> & { confirmText: string }) {
  return (
    <Button
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
        onClick?.(e);
      }}
    />
  );
}
