import * as React from "react"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { Link, router } from "@inertiajs/react"

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

/**
 * Class Tailwind untuk tampilan tombol nomor halaman.
 * Dipakai baik oleh <PageLink> (versi standalone <a>) maupun
 * langsung ditempel ke Inertia <Link> di SimplePagination
 * (supaya tidak ada <a> bersarang di dalam <a>).
 */
export function pageLinkClassName(isActive?: boolean, className?: string) {
  return cn(
    "relative flex w-10 flex-row items-center justify-center px-3 py-2 rounded-md border border-input bg-background text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus:z-10 focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    isActive && "z-10 bg-accent text-accent-foreground",
    className
  )
}

type PageLinkProps = React.ComponentProps<"a"> & {
  className?: string
  isActive?: boolean
}

/**
 * Versi standalone: render <a> biasa. JANGAN dibungkus lagi
 * dengan Inertia <Link> atau tag <a> lain, karena akan
 * menghasilkan <a> bersarang (invalid HTML / hydration error).
 * Untuk navigasi Inertia, gunakan SimplePagination yang sudah
 * menempelkan pageLinkClassName() langsung ke <Link>.
 */
export function PageLink({ className, isActive, ...props }: PageLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      className={pageLinkClassName(isActive, className)}
      {...props}
    />
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

/**
 * Komponen siap pakai yang merangkai primitive di atas.
 * Menerima currentPage, totalPages, baseUrl dan otomatis
 * merender daftar nomor halaman + tombol next/prev,
 * lengkap dengan navigasi Inertia (tanpa reload penuh).
 */
type SimplePaginationProps = {
  currentPage: number
  totalPages: number
  baseUrl: string | { url: string }
  className?: string
  /** Jumlah nomor halaman yang ditampilkan di sekitar halaman aktif */
  siblingCount?: number
}

function resolveBaseUrl(baseUrl: string | { url: string }) {
  return typeof baseUrl === "string" ? baseUrl : baseUrl.url
}

function buildHref(baseUrl: string, page: number) {
  const url = new URL(baseUrl, window.location.origin)
  if (page > 1) {
    url.searchParams.set("page", String(page))
  } else {
    url.searchParams.delete("page")
  }
  return url.pathname + url.search
}

function getPageRange(current: number, total: number, siblingCount: number) {
  const totalNumbers = siblingCount * 2 + 5 // first, last, current, 2 dots
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const leftSibling = Math.max(current - siblingCount, 1)
  const rightSibling = Math.min(current + siblingCount, total)

  const showLeftDots = leftSibling > 2
  const showRightDots = rightSibling < total - 1

  const range: (number | "dots")[] = []

  range.push(1)
  if (showLeftDots) range.push("dots")

  for (let i = Math.max(leftSibling, 2); i <= Math.min(rightSibling, total - 1); i++) {
    range.push(i)
  }

  if (showRightDots) range.push("dots")
  if (total > 1) range.push(total)

  return range
}

export function SimplePagination({
  currentPage,
  totalPages,
  baseUrl,
  className,
  siblingCount = 1,
}: SimplePaginationProps) {
  if (totalPages <= 1) return null

  const resolvedBaseUrl = resolveBaseUrl(baseUrl)
  const pages = getPageRange(currentPage, totalPages, siblingCount)

  return (
    <Pagination className={className}>
      <PaginationContent>
        <Previous
          disabled={currentPage <= 1}
          onClick={() => {
            if (currentPage > 1) {
              router.get(
                buildHref(resolvedBaseUrl, currentPage - 1),
                {},
                { preserveScroll: true }
              )
            }
          }}
        />

        {pages.map((page, idx) =>
          page === "dots" ? (
            <Dots key={`dots-${idx}`} />
          ) : (
            <li key={page}>
              <Link
                href={buildHref(resolvedBaseUrl, page)}
                preserveScroll
                aria-current={page === currentPage ? "page" : undefined}
                className={pageLinkClassName(page === currentPage)}
              >
                {page}
              </Link>
            </li>
          )
        )}

        <Next
          disabled={currentPage >= totalPages}
          onClick={() => {
            if (currentPage < totalPages) {
              router.get(
                buildHref(resolvedBaseUrl, currentPage + 1),
                {},
                { preserveScroll: true }
              )
            }
          }}
        />
      </PaginationContent>
    </Pagination>
  )
}