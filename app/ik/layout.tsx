import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./sidebar";

export default async function IkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/basvuru");
  }

  const { data: hrUser } = await supabase
    .from("hr_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!hrUser) {
    redirect("/basvuru");
  }

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-zinc-50 p-6 dark:bg-black">
        {children}
      </main>
    </div>
  );
}
