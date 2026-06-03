import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function MenariumInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "glass-card w-full rounded-2xl px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-teal-400/60",
        className,
      )}
      {...props}
    />
  );
}

export function MenariumTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "glass-card min-h-32 w-full resize-none rounded-2xl px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-teal-400/60",
        className,
      )}
      {...props}
    />
  );
}
