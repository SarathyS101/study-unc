"use client";
import { useState, useEffect } from "react";
import * as React from "react";
import { parse, format } from "date-fns";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import ComboBox from "@/components/ComboBox";

interface Building {
  value: string;
  label: string;
}
interface AvailabilityRow {
  id: number;
  room: string;
  weekday: string;
  free_start: string; // e.g. "11:00:00"
  free_end: string;   // e.g. "11:15:00"
  last_updated: string;
}

export default function Home() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | undefined>(undefined);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ⬇️ Change the “HH:mm” ⇒ “HH:mm:ss” so parse can handle "11:00:00" correctly
  function toAmPmWithDateFns(time24: string): string {
    // parse "HH:mm:ss" (because your DB returns "11:00:00", "09:45:00", etc.)
    const parsed = parse(time24, "HH:mm:ss", new Date());
    return format(parsed, "h:mm a"); // e.g. “11:00 AM”
  }

  function getWeekday(date: Date) {
    return format(date, "EEEE"); // e.g. "Monday", "Tuesday", etc.
  }

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const response = await fetch("/api/buildings");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setBuildings(data);
      } catch (error) {
        console.error("Failed to fetch buildings:", error);
      }
    };
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (value !== "" && date !== undefined && time !== undefined) {
      const weekday = getWeekday(date);
      const building = value;
      const checkTime = time;

      const url = `/api/rooms-in-building?building=${encodeURIComponent(
        building
      )}&weekday=${encodeURIComponent(weekday)}&checkTime=${encodeURIComponent(
        checkTime
      )}`;

      fetch(url)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json() as Promise<AvailabilityRow[]>;
        })
        .then((data) => {
          setAvailability(data);
        })
        .catch((err) => {
          console.error("Fetch error:", err);
          setError(err.message);
        });
    }
  }, [value, date, time]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* ─── CONTROL BAR ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-white rounded-lg shadow p-4">
        <div className="w-full">
          <ComboBox
            open={open}
            setOpen={setOpen}
            value={value}
            setValue={setValue}
            buildings={buildings}
          />
        </div>
        <div className="w-full">
          <DatePicker date={date} setDate={setDate} />
        </div>
        <div className="w-full">
          <TimePicker time={time} setTime={setTime} />
        </div>
      </div>

      {/* ─── AVAILABILITY LIST ────────────────────────────────────────────────── */}
      {error && (
        <p className="mb-4 text-red-600">
          Error fetching availability: {error}
        </p>
      )}

      {availability.length > 0 ? (
        <div className="bg-white rounded-lg shadow divide-y">
          {availability.map((row) => (
            <div key={row.id} className="p-4">
              <h3 className="text-lg font-semibold">{row.room}</h3>
              <p className="mt-1">
                {toAmPmWithDateFns(row.free_start)} –{" "}
                {toAmPmWithDateFns(row.free_end)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Last updated:{" "}
                {new Date(row.last_updated).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No classrooms available.</p>
      )}
    </div>
  );
}
