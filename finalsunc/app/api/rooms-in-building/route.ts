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
    console.log("GET /api/rooms-in-building called");
    const { searchParams } = new URL(request.url);
    const building = searchParams.get("building");
    const weekday = searchParams.get("weekday");
    const checkTime = searchParams.get("checkTime");
    console.log("my building is ", building);
    if (!building || !weekday) {
      console.log("Missing params, returning 400");
      return NextResponse.json(
        { error: "Missing required query params: room, weekday" },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("room_availability")
      .select("*")
      .like("room", `%${building}%`)
      .eq("weekday", weekday)
      .lte("free_start", checkTime)
      .gte("free_end", checkTime);
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
