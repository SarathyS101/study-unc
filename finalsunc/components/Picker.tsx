"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isWeekend as dfIsWeekend,
  parseISO,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface CustomDatePickerProps {
  date: Date | undefined;
  setDate: (date: Date) => void;
}

export function CustomDatePicker({ date, setDate }: CustomDatePickerProps) {
  // state for popover open/closed
  const [isOpen, setIsOpen] = useState(false);
  // state for which month is currently visible in the calendar
  const [currentMonth, setCurrentMonth] = useState<Date>(date || new Date());
  // ref to detect clicks outside
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Determine if a given day is weekend
  const isWeekend = (d: Date) => dfIsWeekend(d);

  // Move calendar to previous month
  const prevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  // Move calendar to next month
  const nextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  // Generate all days to display in the calendar grid for currentMonth
  const generateCalendarMatrix = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows: Date[][] = [];
    let day = startDate;
    let week: Date[] = [];

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      rows.push(week);
      week = [];
    }
    return rows;
  };

  // Handler when a date cell is clicked
  const onDateClick = (day: Date) => {
    if (isWeekend(day)) {
      toast("Invalid date: weekends are not allowed.", {
        description: "Please choose a weekday (Mon–Fri).",
      });
      return;
    }
    setDate(day);
    setIsOpen(false);
  };

  // Render
  return (
    <div className="relative inline-block text-left" ref={wrapperRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`
          flex w-[280px] items-center justify-start rounded-md border border-gray-300 
          bg-white px-3 py-2 text-sm font-normal text-gray-700 shadow-sm hover:bg-gray-50 
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
          ${!date ? "text-gray-400" : ""}
        `}
        onClick={() => setIsOpen((open) => !open)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? format(date, "PPP") : <span>Pick a date</span>}
      </button>

      {/* Popover / Calendar Panel */}
      {isOpen && (
        <div
          className="
            absolute left-0 z-10 mt-2 w-[300px] 
            rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5
          "
        >
          {/* Header: Month navigation */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-sm font-medium text-gray-700">
              {format(currentMonth, "MMMM yyyy")}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-0 px-4 pt-2 text-xs font-medium text-gray-500">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((wd) => (
              <div key={wd} className="flex h-8 items-center justify-center">
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-0 px-4 pb-4">
            {generateCalendarMatrix().map((week, wi) =>
              week.map((day, di) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = date ? isSameDay(day, date) : false;
                const disabled =
                  !isCurrentMonth || isWeekend(day);
                return (
                  <button
                    key={`${wi}-${di}`}
                    type="button"
                    onClick={() => onDateClick(day)}
                    disabled={disabled}
                    className={`
                      m-[2px] flex h-8 w-8 items-center justify-center rounded-md text-sm 
                      ${
                        !isCurrentMonth
                          ? "text-gray-300"
                          : disabled
                          ? "cursor-not-allowed text-gray-300"
                          : "hover:bg-gray-100"
                      }
                      ${isSelected ? "bg-primary text-white" : ""}
                    `}
                  >
                    {format(day, "d")}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
