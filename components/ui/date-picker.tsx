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
  fromYear?: number
  toYear?: number
  iconLeft?: boolean
  showChevron?: boolean
}

export function DatePicker({ 
  value, 
  onChange, 
  placeholder = "mm/dd/yyyy", 
  className,
  fromYear = 1950,
  toYear = new Date().getFullYear() + 5,
  iconLeft = false,
  showChevron = false
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const dateValue = value ? new Date(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-border bg-input/50 px-3 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
        !value && "text-muted-foreground",
        className
      )}>
        {iconLeft && <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground opacity-70 shrink-0" />}
        <span className="flex-1 text-left truncate">{value ? format(dateValue as Date, "MM/dd/yyyy") : placeholder}</span>
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
          fromYear={fromYear}
          toYear={toYear}
          selected={dateValue}
          onSelect={(date) => { 
            onChange?.(date ? format(date, "yyyy-MM-dd") : ""); 
            setOpen(false); 
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
