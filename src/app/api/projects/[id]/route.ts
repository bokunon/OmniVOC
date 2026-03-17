import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // 紐づくフィードバックがあるか確認
  const { count } = await supabase
    .from("feedbacks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${count} feedback(s) are linked to this project`,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
