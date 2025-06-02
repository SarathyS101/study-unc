import os
from dotenv import load_dotenv
from supabase import create_client, Client
from postgrest.exceptions import APIError

# ─── LOAD ENVIRONMENT VARIABLES ───────────────────────────────────────────────
# Make sure your .env contains:
#   SUPABASE_URL=https://<your-project>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
# ────────────────────────────────────────────────────────────────────────────────

# ─── TABLE CONFIGURATION ───────────────────────────────────────────────────────
SOURCE_TABLE = "unique_rooms_raw"   # Should already exist, with a UNIQUE(room) constraint
DEST_TABLE   = "unique_rooms_split" # We created this above via SQL
ROOM_COLUMN  = "room"               # Column in SOURCE_TABLE holding raw strings
# ────────────────────────────────────────────────────────────────────────────────

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment (or in .env)."
    )

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_all_unique_raw_rooms() -> list[str]:
    """
    Pull every row from unique_rooms_raw, selecting only the `room` column.
    Returns a list of raw room strings (each unique in SOURCE_TABLE).
    """
    try:
        resp = supabase.table(SOURCE_TABLE).select(ROOM_COLUMN).execute()
    except APIError as e:
        raise RuntimeError(f"Failed to fetch from '{SOURCE_TABLE}': {e}")

    rows = resp.data or []
    return [r.get(ROOM_COLUMN, "").strip() for r in rows if r.get(ROOM_COLUMN, "").strip()]


def split_room_string(raw: str) -> tuple[str, str] | None:
    """
    Given a single raw string (e.g. "Abernethy Hall-Rm 0102"), split by the *last* hyphen:
      • Building = everything before the last "-"
      • RmPart   = everything after the last "-"
    Then:
      • building = building.strip()
      • room_number = RmPart.strip().lstrip("Rm ").strip()
    If there is no "-" at all, or if the final piece is empty, return None.
    """
    # Find index of the last hyphen
    idx = raw.rfind("-")
    if idx == -1:
        # No hyphen found → can’t split reliably. Skip this row.
        return None

    building_part = raw[:idx].strip()
    rm_part = raw[idx + 1 :].strip()  # e.g. "Rm 0102"

    if not building_part or not rm_part:
        # Either side is empty → skip
        return None

    # If rm_part starts with "Rm" (case-insensitive), remove it
    if rm_part.lower().startswith("rm"):
        # E.g. "Rm 0102" → strip "Rm" and any whitespace → "0102"
        room_number = rm_part[2:].strip()
    else:
        # If it doesn’t literally start with "Rm", just store rm_part as-is
        room_number = rm_part

    # If after stripping "Rm" we have an empty string, skip
    if not room_number:
        return None

    return (building_part, room_number)


def fetch_existing_splits() -> set[tuple[str, str]]:
    """
    Pull every row from unique_rooms_split, selecting `building, room_number`.
    Returns a set of tuples so we don’t try to insert duplicates.
    """
    try:
        resp = supabase.table(DEST_TABLE).select("building,room_number").execute()
    except APIError as e:
        raise RuntimeError(f"Failed to fetch existing splits from '{DEST_TABLE}': {e}")

    existing = resp.data or []
    return {
        (r.get("building", "").strip(), r.get("room_number", "").strip())
        for r in existing
        if r.get("building", "").strip() and r.get("room_number", "").strip()
    }


def insert_new_splits(new_pairs: set[tuple[str, str]]):
    """
    Insert each (building, room_number) pair into unique_rooms_split via plain INSERT.
    We pre‐filter duplicates, so there should be no conflict.
    """
    if not new_pairs:
        print("No new (building, room_number) pairs to insert.")
        return

    rows_to_insert = [
        {"building": b, "room_number": r} for (b, r) in sorted(new_pairs)
    ]
    try:
        resp = supabase.table(DEST_TABLE).insert(rows_to_insert).execute()
    except APIError as e:
        raise RuntimeError(f"Failed to insert into '{DEST_TABLE}': {e}")

    inserted = len(resp.data or [])
    print(f"Inserted {inserted} new rows into '{DEST_TABLE}'.")


def main():
    # 1) Fetch every unique raw room‐string from SOURCE_TABLE
    raw_list = fetch_all_unique_raw_rooms()
    print(f"Fetched {len(raw_list)} unique raw room strings from '{SOURCE_TABLE}'.")

    # 2) Split each into (building, room_number) using the last hyphen
    parsed_pairs: set[tuple[str, str]] = set()
    for raw in raw_list:
        result = split_room_string(raw)
        if result is not None:
            parsed_pairs.add(result)

    print(f"Parsed {len(parsed_pairs)} (building, room_number) pairs from raw data.")

    # 3) Fetch existing splits from DEST_TABLE to avoid re‐inserting duplicates
    existing_pairs = fetch_existing_splits()
    print(f"Found {len(existing_pairs)} already in '{DEST_TABLE}'.")

    # 4) Compute which pairs are genuinely new
    to_insert = parsed_pairs - existing_pairs
    print(f"{len(to_insert)} new pairs remain to be inserted.")

    # 5) Insert the new pairs
    insert_new_splits(to_insert)


if __name__ == "__main__":
    main()
