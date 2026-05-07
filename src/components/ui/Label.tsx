import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, required, children, ...props },
  ref,
) {
  return (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-medium text-foreground select-none",
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-destructive" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
});
