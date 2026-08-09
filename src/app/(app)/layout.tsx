import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: properties }] = await Promise.all([
    supabase.from("profiles").select("full_name, role, active, property_id").eq("id", user.id).maybeSingle(),
    supabase.from("properties").select("id, name").eq("is_active", true).order("name"),
  ]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Your account is signed in but has no staff profile yet. Ask an admin to set one up, or contact
          support.
        </div>
      </div>
    );
  }

  if (!profile.property_id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Your account isn&apos;t assigned to a property yet. Ask an admin to set one, or pick one from Staff
          Accounts.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        fullName={profile.full_name}
        role={profile.role}
        propertyId={profile.property_id}
        properties={properties ?? []}
      />
      <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
    </div>
  );
}
