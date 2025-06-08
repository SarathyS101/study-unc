WITH 
  -- 1) only keep real rooms & schedules
  parsed AS (
    SELECT
      room,
      split_part(schedule, ' ', 1)                AS day_code,
      substring(
        schedule 
        FROM '\d{1,2}:\d{2} [AP]M-\d{1,2}:\d{2} [AP]M'
      )                                           AS time_range
    FROM public.classroom_courses
    WHERE 
      room                        IS NOT NULL
      AND trim(room)              <> ''
      AND lower(trim(room))       <> 'none'
      AND schedule                 IS NOT NULL
      AND trim(schedule)          <> ''
      AND split_part(schedule, ' ', 1) NOT IN ('None','')
      AND substring(
            schedule 
            FROM '\d{1,2}:\d{2} [AP]M-\d{1,2}:\d{2} [AP]M'
          ) IS NOT NULL
  ),

  -- 2) extract each TH|M|T|W|F token as its own row
  exploded_tokens AS (
    SELECT
      p.room,
      m[1]                               AS code_token,
      split_part(p.time_range, '-', 1)   AS start_str,
      split_part(p.time_range, '-', 2)   AS end_str
    FROM parsed p
    CROSS JOIN LATERAL
      regexp_matches(
        p.day_code,
        '(TH|M|T|W|F)',
        'g'
      ) AS m
  ),

  -- 3) map tokens to weekdays
  weekday_map AS (
    SELECT
      room,
      CASE code_token
        WHEN 'M'  THEN 'Monday'
        WHEN 'T'  THEN 'Tuesday'
        WHEN 'W'  THEN 'Wednesday'
        WHEN 'TH' THEN 'Thursday'
        WHEN 'F'  THEN 'Friday'
      END                             AS weekday,
      start_str,
      end_str
    FROM exploded_tokens
  ),

  -- 4) turn into proper time intervals
  busy_intervals AS (
    SELECT
      room,
      weekday,
      to_timestamp(start_str, 'HH12:MI AM')::time AS busy_start,
      to_timestamp(end_str,   'HH12:MI AM')::time AS busy_end
    FROM weekday_map
  ),

  -- 5) build your room list from the very same source
  all_rooms AS (
    SELECT DISTINCT room
    FROM parsed
  ),

  -- 6) weekday domain
  weekdays(weekday) AS (
    VALUES ('Monday'),('Tuesday'),('Wednesday'),('Thursday'),('Friday')
  ),

  -- 7) every room×weekday combo
  room_week_pairs AS (
    SELECT r.room, w.weekday
    FROM all_rooms r
    CROSS JOIN weekdays w
  ),

  -- 8) sort busy slots to find gaps
  busy_sorted AS (
    SELECT
      bi.room,
      bi.weekday,
      bi.busy_start,
      bi.busy_end,
      ROW_NUMBER() OVER (PARTITION BY bi.room, bi.weekday ORDER BY bi.busy_start) AS rn,
      COUNT(*)      OVER (PARTITION BY bi.room, bi.weekday) AS cnt
    FROM busy_intervals bi
  ),

  -- 9) gap _before_ each busy block (or from 08:00 if it’s the first)
  gaps AS (
    SELECT
      room,
      weekday,
      CASE WHEN rn = 1 THEN '08:00:00'::time
           ELSE lag(busy_end) OVER (PARTITION BY room, weekday ORDER BY busy_start)
      END              AS free_start,
      busy_start       AS free_end
    FROM busy_sorted
  ),

  -- 10) gap _after_ the last busy block (till 22:00)
  after_last AS (
    SELECT
      room,
      weekday,
      busy_end        AS free_start,
      '22:00:00'::time  AS free_end
    FROM busy_sorted
    WHERE rn = cnt
  ),

  -- 11) all “partial‐day” frees
  candidate_free AS (
    SELECT room, weekday, free_start, free_end FROM gaps       WHERE free_start < free_end
    UNION ALL
    SELECT room, weekday, free_start, free_end FROM after_last WHERE free_start < free_end
  ),

  -- 12) find room×weekday combos with no busy slots at all
  missing_days AS (
    SELECT p.room, p.weekday
    FROM room_week_pairs p
    LEFT JOIN (SELECT DISTINCT room, weekday FROM busy_intervals) bi
      ON bi.room = p.room AND bi.weekday = p.weekday
    WHERE bi.room IS NULL
  ),

  -- 13) give those days a full‐day slot
  free_all_day AS (
    SELECT room, weekday, '08:00:00'::time AS free_start, '22:00:00'::time AS free_end
    FROM missing_days
  )

-- 14) write everything into your availability2 table
INSERT INTO public.room_availability (room, weekday, free_start, free_end)
SELECT * FROM candidate_free
UNION ALL
SELECT * FROM free_all_day;
