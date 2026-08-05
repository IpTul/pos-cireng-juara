import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const tableVariants = cva(
  "w-full text-sm",
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

type TableProps = React.ComponentProps<"table"> & {
  className?: string
}

export function Table({ className, ...props }: TableProps) {
  return (
    <table
      className={cn(tableVariants(), className)}
      {...props}
    />
  )
}

type TableHeaderProps = React.ComponentProps<"thead"> & {
  className?: string
}

export function TableHeader({ className, ...props }: TableHeaderProps) {
  return (
    <thead
      className={cn(className)}
      {...props}
    />
  )
}

type TableBodyProps = React.ComponentProps<"tbody"> & {
  className?: string
}

export function TableBody({ className, ...props }: TableBodyProps) {
  return (
    <tbody
      className={cn(className)}
      {...props}
    />
  )
}

type TableRowProps = React.ComponentProps<"tr"> & {
  className?: string
}

export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(className)}
      {...props}
    />
  )
}

type TableCellProps = React.ComponentProps<"td"> & {
  className?: string
}

export function TableCell({ className, ...props }: TableCellProps) {
  return (
    <td
      className={cn(className)}
      {...props}
    />
  )
}

type TableHeadProps = React.ComponentProps<"th"> & {
  className?: string
}

export function TableHead({ className, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(className)}
      {...props}
    />
  )
}