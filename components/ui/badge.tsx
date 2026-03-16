import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        {
          "bg-gray-900 text-white": variant === "default",
          "bg-gray-100 text-gray-700": variant === "secondary",
          "border border-gray-200 text-gray-700": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
