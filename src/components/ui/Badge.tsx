import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        primary: "bg-primary-soft text-primary-soft-foreground",
        accent: "bg-accent-soft text-accent-soft-foreground",
        info: "bg-info-soft text-info-soft-foreground",
        violet: "bg-violet-soft text-violet-soft-foreground",
        destructive: "bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props} />
  );
}
