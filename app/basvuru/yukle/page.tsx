import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnayForm } from "./onay-form";

export default async function BasvuruYuklePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/basvuru");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <OnayForm />
    </div>
  );
}
