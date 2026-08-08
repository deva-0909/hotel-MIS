"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function assignAttendant(formData: FormData) {
  const { supabase } = await requireUser();
  const roomId = String(formData.get("room_id"));
  const { error } = await supabase.from("housekeeping_tasks").upsert(
    {
      room_id: roomId,
      attendant: (formData.get("attendant") as string) || null,
      priority: (formData.get("priority") as string) || null,
      status: "dirty",
    },
    { onConflict: "room_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/departments/housekeeping");
}

export async function markRoomStatus(roomId: string, status: "dirty" | "inspecting" | "clean") {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("housekeeping_tasks").upsert(
    { room_id: roomId, status },
    { onConflict: "room_id" },
  );
  if (error) throw new Error(error.message);

  if (status === "clean") {
    await supabase.from("rooms").update({ status: "available" }).eq("id", roomId);
  } else if (status === "dirty") {
    await supabase.from("rooms").update({ status: "dirty" }).eq("id", roomId);
  }
  revalidatePath("/departments/housekeeping");
  revalidatePath("/rooms");
}
