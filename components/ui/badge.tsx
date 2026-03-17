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
          "bg-gray-900 dark:bg-white text-white dark:text-gray-900": variant === "default",
          "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300": variant === "secondary",
          "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
