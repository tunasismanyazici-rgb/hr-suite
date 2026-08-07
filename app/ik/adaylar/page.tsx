import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SELECT_CLASSES =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

const REVIEWABLE_STATUSES = ["needs_review", "verified", "archived"] as const;
type ReviewableStatus = (typeof REVIEWABLE_STATUSES)[number];

const STATUS_LABELS: Record<ReviewableStatus, string> = {
  needs_review: "İnceleme bekliyor",
  verified: "Doğrulandı",
  archived: "Arşivlendi",
};

function isReviewableStatus(value: string): value is ReviewableStatus {
  return (REVIEWABLE_STATUSES as readonly string[]).includes(value);
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ0-9 ]/g, "").trim();
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(
    new Date(isoDate)
  );
}

export default async function IkAdaylarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string }>;
}) {
  const { q, durum } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("candidates")
    .select("id, first_name, last_name, province_code, status, created_at")
    .order("created_at", { ascending: false });

  if (durum && isReviewableStatus(durum)) {
    query = query.eq("status", durum);
  } else {
    query = query.in("status", REVIEWABLE_STATUSES);
  }

  const term = q ? sanitizeSearchTerm(q) : "";
  if (term) {
    const { data: matchingProvinces } = await supabase
      .from("provinces")
      .select("code")
      .ilike("name", `%${term}%`);
    const provinceCodes = (matchingProvinces ?? []).map((p) => p.code);

    const orParts = [`first_name.ilike.%${term}%`, `last_name.ilike.%${term}%`];
    if (provinceCodes.length > 0) {
      orParts.push(`province_code.in.(${provinceCodes.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  const [{ data: candidates }, { data: provinces }] = await Promise.all([
    query,
    supabase.from("provinces").select("code, name"),
  ]);

  const provinceNameByCode = new Map(
    (provinces ?? []).map((province) => [province.code, province.name])
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">Adaylar</h1>

      <form className="flex flex-wrap items-center gap-2" method="GET">
        <Input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Ad, soyad veya il ara"
          className="w-64"
        />
        <select name="durum" defaultValue={durum ?? ""} className={`${SELECT_CLASSES} w-48`}>
          <option value="">Tüm durumlar</option>
          {REVIEWABLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrele
        </Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-input bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-input text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Ad Soyad</th>
              <th className="px-4 py-2 font-medium">İl</th>
              <th className="px-4 py-2 font-medium">Durum</th>
              <th className="px-4 py-2 font-medium">Yüklenme tarihi</th>
            </tr>
          </thead>
          <tbody>
            {(candidates ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Aday bulunamadı.
                </td>
              </tr>
            )}
            {(candidates ?? []).map((candidate) => {
              const fullName =
                [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") ||
                "(Ad girilmemiş)";
              const provinceName = candidate.province_code
                ? provinceNameByCode.get(candidate.province_code) ?? candidate.province_code
                : "-";
              const status = isReviewableStatus(candidate.status)
                ? STATUS_LABELS[candidate.status]
                : candidate.status;

              return (
                <tr key={candidate.id} className="border-b border-input last:border-b-0 hover:bg-muted/50">
                  <td className="p-0">
                    <Link href={`/ik/adaylar/${candidate.id}`} className="block px-4 py-2">
                      {fullName}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/ik/adaylar/${candidate.id}`} className="block px-4 py-2">
                      {provinceName}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/ik/adaylar/${candidate.id}`} className="block px-4 py-2">
                      {status}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/ik/adaylar/${candidate.id}`} className="block px-4 py-2">
                      {formatDate(candidate.created_at)}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
