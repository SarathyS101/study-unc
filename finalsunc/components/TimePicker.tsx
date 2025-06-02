"use client";


interface TimePickerProps {
  time: string | undefined;
  setTime: (time: string) => void;
}

export function TimePicker({ time, setTime }: TimePickerProps) {
  return (
    <form className="max-w-[8rem] mx-auto">
      <div className="relative">
        {/* Clock icon on the right side (absolute positioning) */}
        <div className="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* The time input field */}
        <input
          type="time"
          id="time"
          name="time"
          className="bg-gray-50 border leading-none border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          min="08:00"
          max="18:00"
          value={time ?? ""}
          required
          onChange={(e) => {
            const newTime = e.target.value;
            // Only allow values between 09:00 and 18:00
            if (newTime >= "08:00" && newTime <= "18:00") {
              setTime(newTime);
            }
          }}
        />
      </div>
    </form>
  );
}
