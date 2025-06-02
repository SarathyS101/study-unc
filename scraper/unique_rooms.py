import os
import re
from dotenv import load_dotenv
from supabase import create_client, Client
from postgrest.exceptions import APIError

# ─── LOAD .env ───────────────────────────────────────────────────────────────
# Make sure your .env file (in the same folder as this script) contains:
#   SUPABASE_URL=https://<your-project>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
# ────────────────────────────────────────────────────────────────────────────────

# ─── TABLE CONFIGURATION ───────────────────────────────────────────────────────
SOURCE_TABLE = "classroom_courses"   # ← your source table name
ROOM_COLUMN  = "room"

DEST_TABLE    = "unique_rooms_raw"   # ← your destination table name
# (Make sure you have created this in Supabase with: 
#   CREATE TABLE public.unique_rooms_raw (
#     id   SERIAL PRIMARY KEY,
#     room TEXT NOT NULL,
#     UNIQUE(room)
#   );
# )
# ────────────────────────────────────────────────────────────────────────────────

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment (or in .env)."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_all_raw_rooms(batch_size: int = 1000) -> list[str]:
    """
    Fetches EVERY row from SOURCE_TABLE, selecting only ROOM_COLUMN, by paging in batches.
    Returns a list of raw `room` strings (duplicates included).
    """
    all_rooms: list[str] = []
    offset = 0

    while True:
        # Use .range(start, end) to fetch batch_size rows at a time:
        start = offset
        end = offset + batch_size - 1

        try:
            resp = (
                supabase
                .table(SOURCE_TABLE)
                .select(ROOM_COLUMN)
                .range(start, end)
                .execute()
            )
        except APIError as e:
            raise RuntimeError(f"Failed to fetch from '{SOURCE_TABLE}' at offset {offset}: {e}")

        chunk = resp.data or []
        if not chunk:
            # No more rows
            break

        # Extract the ROOM_COLUMN, strip whitespace, ignore empty/"none"
        for row in chunk:
            raw_val = row.get(ROOM_COLUMN, "").strip()
            if raw_val and raw_val.lower() != "none":
                all_rooms.append(raw_val)

        # If we got fewer than batch_size rows, that was the last page:
        if len(chunk) < batch_size:
            break

        offset += batch_size

    return all_rooms


def collect_unique_rooms(raw_rooms: list[str]) -> set[str]:
    """
    Deduplicate the raw list of room strings into a Python set.
    """
    return set(raw_rooms)


def fetch_existing_rooms() -> set[str]:
    """
    Fetch all already‐inserted `room` strings from DEST_TABLE.
    Returns a set of those strings.
    """
    try:
        resp = supabase.table(DEST_TABLE).select("room").execute()
    except APIError as e:
        raise RuntimeError(f"Failed to fetch existing rooms from '{DEST_TABLE}': {e}")

    existing_rows = resp.data or []
    return {r.get("room", "").strip() for r in existing_rows if r.get("room", "").strip()}


def insert_new_rooms(new_rooms: set[str]):
    """
    Insert each room string in new_rooms into DEST_TABLE via a plain .insert() call.
    We already filtered out duplicates, so every INSERT will succeed.
    """
    if not new_rooms:
        print("No new room‐strings to insert.")
        return

    rows_to_insert = [{"room": r} for r in sorted(new_rooms)]
    try:
        resp = supabase.table(DEST_TABLE).insert(rows_to_insert).execute()
    except APIError as e:
        raise RuntimeError(f"Failed to insert into '{DEST_TABLE}': {e}")

    inserted = len(resp.data or [])
    print(f"Inserted {inserted} new room rows into '{DEST_TABLE}'.")


def main():
    # 1) Fetch every raw `room` string from classroom_courses (paged in batches)
    raw_list = fetch_all_raw_rooms(batch_size=1000)
    print(f"Fetched {len(raw_list)} total (non‐empty, non‐'none') rows from '{SOURCE_TABLE}'.")

    # 2) Deduplicate in Python
    unique_rooms = collect_unique_rooms(raw_list)
    print(f"Found {len(unique_rooms)} unique room‐strings in source data.")

    # 3) Fetch what’s already in unique_rooms_raw
    existing = fetch_existing_rooms()
    print(f"Found {len(existing)} room‐strings already in '{DEST_TABLE}'.")

    # 4) Compute which room‐strings are genuinely new
    to_insert = unique_rooms - existing
    print(f"{len(to_insert)} remain to be inserted.")

    # 5) Insert only the new ones
    insert_new_rooms(to_insert)


if __name__ == "__main__":
    main()
