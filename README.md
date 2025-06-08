# Study@UNC — Classroom Availability Checker

A web app for UNC students to see free time slots in USED classrooms based on official course schedules. It scrapes UNC’s course data, parses room usage, computes available hours, and serves both an API and an interactive UI with Supabase-backed auth and storage.

You can checkout the deployed version here: [Study@UNC](https://study-unc.vercel.app/)
---

## 🚀 Features

- **Data ingestion**  
  - Python scraper built on BeautifulSoup and Selenium fetches course listings from UNC’s public source  
  - Extracts every unique room, splits into _building_ + _room number_  

- **Availability computation**  
  - SQL migrations generate a `room_availability` table  
  - Uses `generate_series()` (hourly slots between 8 AM–10 PM)  
  - Excludes occupied class times per weekday  

- **API endpoint**  
  - `GET /api/room-availability?room=<room>&weekday=<weekday>`  
  - Returns JSON list of free hourly slots  

- **Web UI**  
  - Next.js + TypeScript + TailwindCSS (+ shadcn/ui)  
  - Supabase authentication & RLS for security  
  - “View Rooms” page to pick a room & day, see open hours  

