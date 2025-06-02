"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date) => void;
}

export function DatePicker({ date, setDate }: DatePickerProps) {
  const isWeekend = (d: Date) => {
    const dayIndex = d.getDay();
    return dayIndex === 0 || dayIndex === 6;
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            if (!selectedDate) return;
            if (isWeekend(selectedDate)) {
              toast("Invalid date: weekends are not allowed.", {
                description: "Please choose a weekday (Mon–Fri).",
              });
              return;
            }
            setDate(selectedDate);
          }}
          className={cn(
            "bg-popover text-popover-foreground",
            // highlight the selected day in primary color
            "[&_td:has([aria-selected])]:bg-primary [&_td:has([aria-selected])]:text-primary-foreground",
            // hover effect on valid days
            "[&_button:not(:disabled):hover]:bg-muted/50 [&_button:not(:disabled):hover]:dark:bg-muted/70"
          )}
        />
      </PopoverContent>
    </Popover>
  );
}
