import { supabase } from "./supabase";

export async function getRole(userId) {
  const { data, error } = await supabase
    .from("roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (error) return "staff";
  return data?.role || "staff";
}
