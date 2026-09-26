import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./select";

export interface DropdownOption {
  label: string;
  value: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: React.ReactNode;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
  buttonClassName?: string;
  id?: string;
  iconClassName?: string;
  align?: "left" | "right";
  isClearable?: boolean;
}

export const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "Select an option",
      label,
      error,
      disabled,
      required,
      name,
      className,
      buttonClassName,
      id,
      iconClassName,
      align,
      isClearable,
    },
    ref
  ) => {
    return (
      <div className={cn("w-full space-y-1.5", className)} ref={ref}>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <Select
          name={name}
          value={value}
          onValueChange={(val) => {
            if (onChange && val !== null) onChange(val);
          }}
          disabled={disabled}
        >
          <SelectTrigger 
            id={id}
            className={cn(
              "h-10 text-sm text-left",
              error && "border-error focus:ring-error",
              buttonClassName
            )}
          >
            {value ? options.find(o => o.value === value)?.label || value : <SelectValue placeholder={placeholder} />}
          </SelectTrigger>
          <SelectContent align={align === "right" ? "end" : "start"}>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
);
Dropdown.displayName = "Dropdown";

