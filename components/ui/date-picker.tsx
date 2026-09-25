import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"

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
  startMonth?: Date
  endMonth?: Date
  iconLeft?: boolean
  showChevron?: boolean
}

export function DatePicker({ 
  value, 
  onChange, 
  placeholder = "mm/dd/yyyy", 
  className,
  startMonth = new Date(1950, 0),
  endMonth = new Date(new Date().getFullYear() + 5, 11),
  iconLeft = false,
  showChevron = false
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
        "flex h-9 w-full items-center justify-between rounded-md border border-border bg-input/50 px-3 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
        !dateValue && "text-muted-foreground",
        className
      )}>
        {iconLeft && <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground opacity-70 shrink-0" />}
        <span className={cn("flex-1 text-left truncate", dateValue ? "text-foreground font-medium" : "text-muted-foreground")}>
          {dateValue ? format(dateValue, "MM/dd/yyyy") : placeholder}
        </span>
        {showChevron ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground opacity-70 shrink-0 ml-2" />
        ) : !iconLeft ? (
          <CalendarIcon className="h-4 w-4 text-muted-foreground opacity-70 shrink-0 ml-2" />
        ) : null}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
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
      </PopoverContent>
    </Popover>
  )
}
