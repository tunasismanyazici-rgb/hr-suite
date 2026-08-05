import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusView } from "./status-view";

export default async function BasvuruDurumPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/basvuru");
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!candidate) {
    redirect("/basvuru/yukle");
  }

  const { data: document } = await supabase
    .from("candidate_documents")
    .select("id, ocr_status, error_message")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!document) {
    redirect("/basvuru/yukle");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <StatusView
        documentId={document.id}
        initialStatus={document.ocr_status}
        initialErrorMessage={document.error_message}
      />
    </div>
  );
}
