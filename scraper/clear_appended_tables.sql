-- clear_appended_tables.sql (with sequence reset)
TRUNCATE
  public.room_availability2,
  public.unique_rooms2,
  public.unique_rooms_raw2
RESTART IDENTITY CASCADE;
