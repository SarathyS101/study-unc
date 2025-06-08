WITH 
  parsed AS (
    SELECT
      room,
      split_part(schedule, ' ', 1) AS day_code,
      substring(
        schedule 
        FROM '\d{1,2}:\d{2} [AP]M-\d{1,2}:\d{2} [AP]M'
      ) AS time_range
    FROM public.classroom_courses
  ),
  exploded AS (
    SELECT
      room,
      unnest(
        CASE
          WHEN day_code = 'M'      THEN ARRAY['Monday']
          WHEN day_code = 'T'      THEN ARRAY['Tuesday']
          WHEN day_code = 'W'      THEN ARRAY['Wednesday']
          WHEN day_code = 'TH'     THEN ARRAY['Thursday']
          WHEN day_code = 'F'      THEN ARRAY['Friday']

          WHEN day_code = 'MT'     THEN ARRAY['Monday','Tuesday']
          WHEN day_code = 'MW'     THEN ARRAY['Monday','Wednesday']
          WHEN day_code = 'MTH'    THEN ARRAY['Monday','Thursday']
          WHEN day_code = 'MF'     THEN ARRAY['Monday','Friday']
          WHEN day_code = 'TW'     THEN ARRAY['Tuesday','Wednesday']
          WHEN day_code = 'TTH'    THEN ARRAY['Tuesday','Thursday']
          WHEN day_code = 'TF'     THEN ARRAY['Tuesday','Friday']
          WHEN day_code = 'WTH'    THEN ARRAY['Wednesday','Thursday']
          WHEN day_code = 'WF'     THEN ARRAY['Wednesday','Friday']
          WHEN day_code = 'THF'    THEN ARRAY['Thursday','Friday']

          WHEN day_code = 'MTW'    THEN ARRAY['Monday','Tuesday','Wednesday']
          WHEN day_code = 'MTTH'   THEN ARRAY['Monday','Tuesday','Thursday']
          WHEN day_code = 'MTF'    THEN ARRAY['Monday','Tuesday','Friday']
          WHEN day_code = 'MWTH'   THEN ARRAY['Monday','Wednesday','Thursday']
          WHEN day_code = 'MWF'    THEN ARRAY['Monday','Wednesday','Friday']
          WHEN day_code = 'MTHF'   THEN ARRAY['Monday','Thursday','Friday']
          WHEN day_code = 'TWTH'   THEN ARRAY['Tuesday','Wednesday','Thursday']
          WHEN day_code = 'TWF'    THEN ARRAY['Tuesday','Wednesday','Friday']
          WHEN day_code = 'TTF'    THEN ARRAY['Tuesday','Thursday','Friday']
          WHEN day_code = 'WTHF'   THEN ARRAY['Wednesday','Thursday','Friday']

          WHEN day_code = 'MTWTH'  THEN ARRAY['Monday','Tuesday','Wednesday','Thursday']
          WHEN day_code = 'MTWF'   THEN ARRAY['Monday','Tuesday','Wednesday','Friday']
          WHEN day_code = 'MTTHF'  THEN ARRAY['Monday','Tuesday','Thursday','Friday']
          WHEN day_code = 'MWTHF'  THEN ARRAY['Monday','Wednesday','Thursday','Friday']
          WHEN day_code = 'TWTHF'  THEN ARRAY['Tuesday','Wednesday','Thursday','Friday']

          WHEN day_code = 'MTWTHF' THEN ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']
          ELSE ARRAY[]::TEXT[]
        END
      ) AS weekday,
      split_part(time_range, '-', 1) AS start_str,
      split_part(time_range, '-', 2) AS end_str
    FROM parsed
  ),
  busy_intervals AS (
    SELECT
      room,
      weekday,
      to_timestamp(start_str, 'HH12:MI AM')::time AS busy_start,
      to_timestamp(end_str,   'HH12:MI AM')::time AS busy_end
    FROM exploded
  ),
  all_rooms AS (
    SELECT DISTINCT full_room_text AS room
    FROM public.unique_rooms
  ),
  weekdays(weekday) AS (
    VALUES
      ('Monday'),
      ('Tuesday'),
      ('Wednesday'),
      ('Thursday'),
      ('Friday')
  ),
  room_week_pairs AS (
    SELECT r.room, w.weekday
    FROM all_rooms r
    CROSS JOIN weekdays w
  ),
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
  gaps AS (
    SELECT
      bs.room,
      bs.weekday,
      CASE WHEN bs.rn = 1 THEN '08:00:00'::time
           ELSE lag(bs.busy_end) OVER (PARTITION BY bs.room, bs.weekday ORDER BY bs.busy_start)
      END AS free_start,
      bs.busy_start AS free_end
    FROM busy_sorted bs
  ),
  after_last AS (
    SELECT
      bs.room,
      bs.weekday,
      bs.busy_end AS free_start,
      '22:00:00'::time AS free_end
    FROM busy_sorted bs
    WHERE bs.rn = bs.cnt
  ),
  candidate_free AS (
    SELECT room, weekday, free_start, free_end FROM gaps WHERE free_start < free_end
    UNION ALL
    SELECT room, weekday, free_start, free_end FROM after_last WHERE free_start < free_end
  ),
  missing_days AS (
    SELECT p.room, p.weekday
    FROM room_week_pairs p
    LEFT JOIN (SELECT DISTINCT room, weekday FROM busy_intervals) bi
      ON bi.room = p.room AND bi.weekday = p.weekday
    WHERE bi.room IS NULL
  ),
  free_all_day AS (
    SELECT room, weekday, '08:00:00'::time AS free_start, '22:00:00'::time AS free_end
    FROM missing_days
  )
INSERT INTO public.room_availability (room, weekday, free_start, free_end)
SELECT room, weekday, free_start, free_end FROM candidate_free
UNION ALL
SELECT room, weekday, free_start, free_end FROM free_all_day;
