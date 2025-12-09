import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Explicitly define all available button variants
const variants = {
  default:
    "bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-glow hover:scale-[1.02]",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline:
    "border-2 border-primary text-primary bg-transparent hover:bg-primary/10",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent/10 hover:text-accent",
  link: "text-primary underline-offset-4 hover:underline",
  success: "bg-success text-success-foreground hover:bg-success/90",
  breadcrumb: "text-muted-foreground hover:text-foreground",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
} as const

const sizes = {
  default: "h-11 px-6 py-2",
  sm: "h-9 rounded-lg px-4",
  lg: "h-12 rounded-lg px-8 text-base",
  icon: "h-11 w-11",
} as const

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: variants,
      size: sizes,
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonVariant = keyof typeof variants

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
