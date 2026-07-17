import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function MenariumInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.055] px-4 py-3 text-white shadow-inner shadow-black/10 outline-none placeholder:text-white/35 focus:border-blue-300/55 focus:bg-white/[0.075] focus-visible:ring-2 focus-visible:ring-blue-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a10]",
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
        "min-h-32 w-full resize-none rounded-[14px] border border-white/10 bg-white/[0.055] px-4 py-3 text-white shadow-inner shadow-black/10 outline-none placeholder:text-white/35 focus:border-blue-300/55 focus:bg-white/[0.075] focus-visible:ring-2 focus-visible:ring-blue-300/50",
        className,
      )}
      {...props}
    />
  );
}
