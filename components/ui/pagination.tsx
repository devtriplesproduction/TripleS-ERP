'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dropdown } from '@/components/ui/Dropdown'

export interface EmployeePaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage?: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  itemLabel?: string
  className?: string
  showPageSizeSelector?: boolean
}

export function EmployeePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemLabel = 'results',
  className,
  showPageSizeSelector = false,
}: EmployeePaginationProps) {
  if (totalPages <= 0 && totalItems <= 0) return null

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Build visible page numbers (smart window with ellipsis if > 7 pages)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = []
    pages.push(1)

    if (currentPage > 3) {
      pages.push('ellipsis-start')
    }

    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis-end')
    }

    pages.push(totalPages)
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-border bg-card',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
        <p>
          Showing <span className="font-medium text-foreground">{startItem}</span> to{' '}
          <span className="font-medium text-foreground">{endItem}</span> of{' '}
          <span className="font-medium text-foreground">{totalItems}</span> {itemLabel}
        </p>

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-border pl-2 sm:pl-3">
            <span className="text-[11px] text-muted-foreground shrink-0">Per page:</span>
            <Dropdown
              value={String(itemsPerPage)}
              onChange={(val) => onPageSizeChange(Number(val))}
              options={pageSizeOptions.map((opt) => ({ value: String(opt), label: String(opt) }))}
              className="w-auto space-y-0 shrink-0"
              buttonClassName="!h-7 !min-h-[28px] !max-h-[28px] !text-[11px] px-2 rounded-lg border-border bg-card font-medium shadow-2xs"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-transparent border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNumbers.map((p, idx) => {
          if (p === 'ellipsis-start' || p === 'ellipsis-end') {
            return (
              <span
                key={`${p}-${idx}`}
                className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            )
          }

          const page = p as number
          return (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'h-8 w-8 text-xs',
                currentPage !== page &&
                  'bg-transparent border-border text-muted-foreground hover:bg-muted'
              )}
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </Button>
          )
        })}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-transparent border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export const Pagination = EmployeePagination

