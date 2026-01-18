import * as React from "react"

export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { orientation?: "horizontal" | "vertical", decorative?: boolean }) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      data-orientation={orientation}
      className={
        "shrink-0 bg-border " +
        (orientation === "horizontal" ? "h-px w-full" : "h-full w-px") +
        (className ? " " + className : "")
      }
      {...props}
    />
  )
}
