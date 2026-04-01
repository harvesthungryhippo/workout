import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-900",
        className
      )}
      {...props}
    />
  );
}
