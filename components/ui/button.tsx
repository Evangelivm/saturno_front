import * as React from "react"
import { cn } from "@/lib/utils"

const variantClasses = {
  default:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/88 active:bg-primary",
  brand:
    "bg-brand text-brand-foreground shadow-sm hover:bg-brand/90 active:bg-brand",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/70 active:bg-secondary/80",
  outline:
    "border border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/70",
  ghost:
    "text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/70",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:bg-destructive",
  success:
    "bg-success text-success-foreground shadow-sm hover:bg-success/90 active:bg-success",
  warning:
    "bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 active:bg-warning",
  link: "text-brand underline-offset-4 hover:underline shadow-none",
} as const

const sizeClasses = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-6 text-base",
  icon: "h-10 w-10 shrink-0",
} as const

export type ButtonVariant = keyof typeof variantClasses
export type ButtonSize = keyof typeof sizeClasses

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none ring-offset-background cursor-pointer active:scale-[0.98]",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
