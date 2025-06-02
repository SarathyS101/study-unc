// src/app/api/room-availability/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize once at module load
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
export async function GET(request: Request) {
  try {
    console.log("GET /api/room-availability called");
    // src/app/api/room-availability/route.ts
    // …rest of your code…
    // Parse query params
    const { searchParams } = new URL(request.url);
    const room = searchParams.get("room");
    const weekday = searchParams.get("weekday");
    console.log("Parsed room:", room, "weekday:", weekday);

    if (!room || !weekday) {
      console.log("Missing params, returning 400");
      return NextResponse.json(
        { error: "Missing required query params: room, weekday" },
        { status: 400 }
      );
    }

    // Perform the Supabase query
    console.log(`Querying room_availability for ${room} / ${weekday}`);
    const { data, error } = await supabase
      .from("room_availability")
      .select("room, weekday, free_start, free_end")
      .eq("room", room)
      .eq("weekday", weekday)
      .order("free_start", { ascending: true });

    if (error) {
      console.error("Supabase returned an error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Supabase returned data:", data);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Unexpected exception in GET handler:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
