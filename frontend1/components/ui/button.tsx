"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm";

const variantStyles: Record<ButtonVariant, string> = {
  default: "inline-flex items-center justify-center rounded-2xl bg-[#084734] text-[#87E4A2] transition hover:bg-[#0a5a42] disabled:opacity-50",
  outline: "inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-900 transition hover:bg-slate-100 disabled:opacity-50",
  ghost: "inline-flex items-center justify-center rounded-2xl bg-transparent text-slate-900 hover:bg-slate-100 disabled:opacity-50",
  destructive: "inline-flex items-center justify-center rounded-2xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-11 px-5",
  sm: "h-10 px-4 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const classes = [variantStyles[variant], sizeStyles[size], className].filter(Boolean).join(" ");
    return <button ref={ref} className={classes} {...props} />;
  }
);

Button.displayName = "Button";
