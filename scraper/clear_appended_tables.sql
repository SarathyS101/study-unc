-- clear_appended_tables.sql (with sequence reset)
TRUNCATE public.classroom_courses,
public.room_availability,
public.unique_rooms,
public.unique_rooms_raw RESTART IDENTITY CASCADE;