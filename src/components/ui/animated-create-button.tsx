import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const AnimatedCreateButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "relative inline-block overflow-hidden rounded-lg p-px font-sans outline-none transition-transform focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <span
      aria-hidden="true"
      data-gradient="spin-slow"
      className="absolute inset-[-1000%] m-auto block animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,var(--sidebar-foreground)_0%,var(--sidebar-primary)_50%,var(--sidebar-foreground)_100%)] motion-reduce:animate-none"
    />
    <span className="relative flex h-9 items-center justify-center rounded-[calc(var(--radius-lg)-1px)] bg-sidebar px-6 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
      {children}
    </span>
  </button>
));

AnimatedCreateButton.displayName = "AnimatedCreateButton";
