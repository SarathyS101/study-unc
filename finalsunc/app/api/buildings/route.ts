import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from("unique_buildings")
      .select("building")
      .order("building", { ascending: true });
    if(error) {
      console.error("Supabase returned an error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const buildingNames = data.map((row) => ({
      value: row.building,
      label: row.building,
    }));
    console.log("Returning building names:", buildingNames);
    return NextResponse.json(buildingNames);
  } catch (err: any) {
    console.error("Unexpected exception in GET handler:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
