import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BackgroundImageTextureProps = {
  opacity?: number;
  className?: string;
  children?: ReactNode;
};

export function BackgroundImageTexture({
  opacity = 0.5,
  className,
  children,
}: BackgroundImageTextureProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden="true"
        data-texture="groovepaper"
        className="pointer-events-none absolute inset-0 bg-[url('/textures/groovepaper.png')] bg-repeat"
        style={{ opacity }}
      />
      {children && <div className="relative">{children}</div>}
    </div>
  );
}
