import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground transition-colors",
        "placeholder:text-muted-foreground/70",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        invalid
          ? "border-destructive focus:ring-destructive/40"
          : "border-border",
        className,
      )}
      {...props}
    />
  );
});
