import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function MenariumInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-control border border-line-default bg-fill-2 px-4 py-3 text-text-primary shadow-inner shadow-black/10 outline-none placeholder:text-text-subtle focus:border-blue-300/55 focus:bg-fill-3 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        className,
      )}
      {...props}
    />
  );
}

export const MenariumTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function MenariumTextarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-32 w-full resize-none rounded-control border border-line-default bg-fill-2 px-4 py-3 text-text-primary shadow-inner shadow-black/10 outline-none placeholder:text-text-subtle focus:border-blue-300/55 focus:bg-fill-3 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
          className,
        )}
        {...props}
      />
    );
  },
);
