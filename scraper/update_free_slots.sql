
WITH
  parsed AS (
    SELECT
      room,
      substring(schedule FROM '^([A-Z]+)')            AS days_raw,
      substring(schedule FROM '(\d{1,2}:\d{2}\s+(?:AM|PM))')  AS start_time_txt,
      substring(schedule FROM '-(\d{1,2}:\d{2}\s+(?:AM|PM))') AS end_time_txt
    FROM public.classroom_courses
  ),
  day_map AS (
    SELECT * FROM (VALUES
      ('M',  'Monday'),
      ('T',  'Tuesday'),
      ('W',  'Wednesday'),
      ('TH', 'Thursday'),
      ('F',  'Friday')
    ) AS dm(code, weekday_name)
  ),
  exploded AS (
    SELECT
      p.room,
      dm.weekday_name             AS weekday,
      (p.start_time_txt::time)    AS start_time,
      (p.end_time_txt::time)      AS end_time
    FROM parsed AS p
    JOIN day_map AS dm
      ON p.days_raw LIKE ('%' || dm.code || '%')
  ),
  numbered AS (
    SELECT
      room,
      weekday,
      start_time,
      end_time,
      LAG(end_time) OVER (
        PARTITION BY room, weekday
        ORDER BY start_time
      ) AS prev_end
    FROM exploded
  ),
  gaps_between AS (
    SELECT
      room,
      weekday,
      COALESCE(prev_end, '08:00'::time) AS free_start,
      start_time                       AS free_end
    FROM numbered
    WHERE COALESCE(prev_end, '08:00'::time) < start_time
  ),
  last_end_of_day AS (
    SELECT
      room,
      weekday,
      MAX(end_time) AS last_busy_end
    FROM exploded
    GROUP BY room, weekday
  ),
  gap_after_last AS (
    SELECT
      room,
      weekday,
      last_busy_end  AS free_start,
      '21:00'::time  AS free_end
    FROM last_end_of_day
    WHERE last_busy_end < '21:00'::time
  )
SELECT
  room,
  weekday,
  free_start,
  free_end
FROM gaps_between
UNION ALL
SELECT
  room,
  weekday,
  free_start,
  free_end
FROM gap_after_last
ORDER BY
  room,
  weekday,
  free_start;
