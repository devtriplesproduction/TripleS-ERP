import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown, X as XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  value?: string | Date | null
  onChange?: (date: string) => void
  placeholder?: string
  className?: string
  contentClassName?: string
  startMonth?: Date
  endMonth?: Date
  iconLeft?: boolean
  showChevron?: boolean
  popoverAlign?: "start" | "center" | "end"
  isClearable?: boolean
}

export function DatePicker({ 
  value, 
  onChange, 
  placeholder = "mm/dd/yyyy", 
  className,
  contentClassName,
  startMonth = new Date(1950, 0),
  endMonth = new Date(new Date().getFullYear() + 5, 11),
  iconLeft = false,
  showChevron = false,
  popoverAlign = "start",
  isClearable = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (!trimmed) return undefined
      if (trimmed.includes("-")) {
        const parts = trimmed.split("T")[0].split("-").map(Number)
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          return new Date(parts[0], parts[1] - 1, parts[2])
        }
      }
      const d = new Date(trimmed)
      return isNaN(d.getTime()) ? undefined : d
    }
    return undefined
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-input-bg hover:border-input-hover dark:hover:border-input-hover px-3 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
        !dateValue && "text-muted-foreground",
        className
      )}>
        {iconLeft && <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground opacity-70 shrink-0" />}
        <span className={cn("flex-1 text-left truncate", dateValue ? "text-foreground font-medium" : "text-muted-foreground")}>
          {dateValue ? format(dateValue, "MM/dd/yyyy") : placeholder}
        </span>
        {isClearable && dateValue ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onChange?.("")
            }}
            className="p-0.5 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors ml-1 shrink-0 cursor-pointer"
            title="Clear date"
          >
            <XIcon className="h-3.5 w-3.5" />
          </span>
        ) : null}
        {showChevron ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground opacity-70 shrink-0 ml-2" />
        ) : !iconLeft ? (
          <CalendarIcon className="h-4 w-4 text-muted-foreground opacity-70 shrink-0 ml-2" />
        ) : null}
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0 z-[130]", contentClassName)} align={popoverAlign}>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          selected={dateValue}
          onSelect={(date) => { 
            onChange?.(date ? format(date, "yyyy-MM-dd") : ""); 
            setOpen(false); 
          }}
        />
        {isClearable && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange?.("")
                setOpen(false)
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange?.(format(new Date(), "yyyy-MM-dd"))
                setOpen(false)
              }}
              className="text-xs text-foreground font-medium hover:underline cursor-pointer"
            >
              Today
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
