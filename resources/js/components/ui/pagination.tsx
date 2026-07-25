import * as React from "react"
import { ChevronRight, ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"

const paginationVariants = cva(
  "inline-flex items-center justify-center -space-x-px rounded-md shadow-sm",
  {
    variants: {
      variant: {
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type PaginationProps = React.ComponentProps<"nav"> & {
  className?: string
  "aria-label"?: string
}

export function Pagination({ className, "aria-label": ariaLabel, ...props }: PaginationProps) {
  return (
    <nav
      className={cn(paginationVariants(), className)}
      aria-label={ariaLabel ?? "Pagination"}
      {...props}
    />
  )
}

type PaginationContentProps = React.ComponentProps<"ul"> & {
  className?: string
}

export function PaginationContent({ className, ...props }: PaginationContentProps) {
  return (
    <ul
      className={cn("flex", className)}
      {...props}
    />
  )
}

type DotsProps = React.ComponentProps<"li"> & {
  className?: string
}

export function Dots({ className, ...props }: DotsProps) {
  return (
    <li
      className={cn("flex flex-col items-center gap-1 px-3 py-2", className)}
      {...props}
    >
      <div className="h-[3px] w-3 bg-muted" />
      <div className="h-[3px] w-3 bg-muted" />
    </li>
  )
}

type PageLinkProps = React.ComponentProps<"a"> & {
  className?: string;
  "aria-current"?: "page" | "step" | "location" | "date" | "time" | boolean
}

function PageLink({ className, ariaCurrent, ...props }: PageLinkProps) {
  return (
    <a
      className={cn(
        "relative flex w-full flex-row items-center justify-center px-3 py-2 rounded-md border border-input bg-background text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus:z-10 focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&>aria-current]:z-10 [&>aria-current]:bg-accent [&>aria-current]:text-accent-foreground",
        className,
        ariaCurrent && "aria-current"
      )}
      {...props}
    >
      <span className="sr-only">{ariaCurrent ? "Current page" : ""}</span>
    </a>
  )
}

type PreviousProps = React.ComponentProps<"li"> & {
  className?: string
  onClick?: React.MouseEventHandler<HTMLLIElement>
  disabled?: boolean
}

export function Previous({ className, onClick, disabled, ...props }: PreviousProps) {
  return (
    <li
      className={cn(
        "flex w-10 items-center justify-center px-3 py-2 text-sm font-medium",
        disabled
          ? "opacity-50 pointer-events-none"
          : "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
    </li>
  )
}

type NextProps = React.ComponentProps<"li"> & {
  className?: string
  onClick?: React.MouseEventHandler<HTMLLIElement>
  disabled?: boolean
}

export function Next({ className, onClick, disabled, ...props }: NextProps) {
  return (
    <li
      className={cn(
        "flex w-10 items-center justify-center px-3 py-2 text-sm font-medium",
        disabled
          ? "opacity-50 pointer-events-none"
          : "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </li>
  )
}