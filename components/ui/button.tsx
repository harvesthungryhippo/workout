"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
}

export function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        {
          "bg-gray-900 text-white hover:bg-gray-700": variant === "default",
          "border border-gray-200 bg-white hover:bg-gray-50 text-gray-900": variant === "outline",
          "hover:bg-gray-100 text-gray-700": variant === "ghost",
          "bg-gray-100 text-gray-900 hover:bg-gray-200": variant === "secondary",
        },
        {
          "px-3 py-1.5 text-xs": size === "sm",
          "px-4 py-2 text-sm": size === "default",
          "px-6 py-3 text-base": size === "lg",
          "h-9 w-9": size === "icon",
        },
        className
      )}
      {...props}
    />
  );
}
