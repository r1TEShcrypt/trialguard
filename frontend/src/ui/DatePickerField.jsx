import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
export default function DatePickerField({ label, ...props }) {
  const [open, setOpen] = useState(false),
    selected = props.value ? new Date(props.value + "T12:00:00") : undefined;
  return (
    <div className="date-picker-field">
      <Input
        {...props}
        aria-label={label.charAt(0).toUpperCase() + label.slice(1)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="icon-button"
            aria-label={`Choose ${label} from calendar`}
          >
            <CalendarDays size={17} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          aria-label={`Choose ${label}`}
          className="date-picker-popover"
          align="end"
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            autoFocus
            disabled={
              props.max
                ? { after: new Date(props.max + "T23:59:59") }
                : undefined
            }
            onSelect={(date) => {
              if (!date) return;
              const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              props.onChange({ target: { value } });
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
