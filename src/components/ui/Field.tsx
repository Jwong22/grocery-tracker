import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import { Label } from "./Label";

type FieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean }) => React.ReactNode;
};

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({ id, "aria-invalid": Boolean(error) || undefined })}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
