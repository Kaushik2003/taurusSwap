"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive" | "positive" | "warning" | "negative";
type ButtonSize = "default" | "sm";

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-dark-green text-green border-2 border-dark-green " +
    "hover:ring-2 hover:ring-dark-green hover:ring-offset-2 " +
    "focus-visible:ring-2 focus-visible:ring-dark-green focus-visible:ring-offset-2",
  outline:
    "bg-transparent text-dark-green border-2 border-dark-green " +
    "hover:bg-dark-green hover:text-green " +
    "focus-visible:ring-2 focus-visible:ring-dark-green focus-visible:ring-offset-2",
  ghost:
    "bg-transparent text-foreground border-2 border-transparent " +
    "hover:bg-foreground/10 " +
    "focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
  destructive:
    "bg-destructive text-white border-2 border-destructive " +
    "hover:ring-2 hover:ring-destructive hover:ring-offset-2 " +
    "focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2",
  // Sentiment Positive — #2F5711 bg, lime text
  positive:
    "bg-[#2F5711] text-[#9FE870] border-2 border-[#2F5711] " +
    "hover:ring-2 hover:ring-[#2F5711] hover:ring-offset-2 " +
    "focus-visible:ring-2 focus-visible:ring-[#2F5711] focus-visible:ring-offset-2",
  // Sentiment Warning — #EDC843 bg, dark text
  warning:
    "bg-[#EDC843] text-[#163300] border-2 border-[#EDC843] " +
    "hover:ring-2 hover:ring-[#EDC843] hover:ring-offset-2 " +
    "focus-visible:ring-2 focus-visible:ring-[#EDC843] focus-visible:ring-offset-2",
  // Sentiment Negative — #A8200D bg, white text
  negative:
    "bg-[#A8200D] text-white border-2 border-[#A8200D] " +
    "hover:ring-2 hover:ring-[#A8200D] hover:ring-offset-2 " +
    "focus-visible:ring-2 focus-visible:ring-[#A8200D] focus-visible:ring-offset-2",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-11 px-5 text-sm",
  sm: "h-9 px-4 text-xs",
};

const base =
  "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const classes = [base, variantStyles[variant], sizeStyles[size], className]
      .filter(Boolean)
      .join(" ");
    return <button ref={ref} className={classes} {...props} />;
  }
);

Button.displayName = "Button";
