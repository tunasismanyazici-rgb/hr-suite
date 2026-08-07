import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SIGNED_URL_TTL_SECONDS = 300;

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  processing: "İşleniyor",
  needs_review: "İnceleme bekliyor",
  verified: "Doğrulandı",
  archived: "Arşivlendi",
};

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "-";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(
    new Date(isoDate)
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "-"}</span>
    </div>
  );
}

export default async function IkAdayDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: candidate } = await supabase
    .from("candidates")
    .select(
      "id, first_name, last_name, email, phone, birth_date, province_code, district_code, status, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!candidate) {
    redirect("/ik/adaylar");
  }

  const [
    { data: province },
    { data: district },
    { data: profile },
    { data: experiences },
    { data: educations },
    { data: certifications },
    { data: document },
  ] = await Promise.all([
    candidate.province_code
      ? supabase.from("provinces").select("name").eq("code", candidate.province_code).maybeSingle()
      : Promise.resolve({ data: null }),
    candidate.district_code
      ? supabase.from("districts").select("name").eq("code", candidate.district_code).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("candidate_profiles")
      .select("summary, total_experience_years")
      .eq("candidate_id", candidate.id)
      .maybeSingle(),
    supabase
      .from("experiences")
      .select("company_name, title, start_date, end_date, is_current")
      .eq("candidate_id", candidate.id)
      .order("sort_order"),
    supabase
      .from("educations")
      .select("institution, field_of_study, end_year")
      .eq("candidate_id", candidate.id),
    supabase
      .from("certifications")
      .select("name, expiry_date")
      .eq("candidate_id", candidate.id)
      .order("sort_order"),
    supabase
      .from("candidate_documents")
      .select("storage_path, mime_type")
      .eq("candidate_id", candidate.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let signedUrl: string | null = null;
  if (document) {
    const { data: signedUrlData } = await supabase.storage
      .from("candidate-documents")
      .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS);
    signedUrl = signedUrlData?.signedUrl ?? null;
  }

  const fullName =
    [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") ||
    "(Ad girilmemiş)";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-medium">{fullName}</h1>
        <p className="text-sm text-muted-foreground">
          {STATUS_LABELS[candidate.status] ?? candidate.status}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Field label="E-posta" value={candidate.email} />
              <Field label="Telefon" value={candidate.phone ?? ""} />
              <Field label="Doğum tarihi" value={formatDate(candidate.birth_date)} />
              <Field label="İl" value={province?.name ?? ""} />
              <Field label="İlçe" value={district?.name ?? ""} />
              <Field
                label="Toplam deneyim"
                value={
                  profile?.total_experience_years
                    ? `${profile.total_experience_years} yıl`
                    : ""
                }
              />
              <Field label="Yüklenme tarihi" value={formatDate(candidate.created_at)} />
              {profile?.summary && (
                <div className="pt-2 text-sm">
                  <p className="mb-1 text-muted-foreground">Özet</p>
                  <p>{profile.summary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deneyimler</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {(experiences ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Kayıt yok.</p>
              )}
              {(experiences ?? []).map((exp, index) => (
                <div key={index} className="rounded-lg border border-input p-3 text-sm">
                  <p className="font-medium">
                    {exp.title ?? "-"} {exp.company_name ? `· ${exp.company_name}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDate(exp.start_date)} —{" "}
                    {exp.is_current ? "Halen çalışıyor" : formatDate(exp.end_date)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eğitimler</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {(educations ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Kayıt yok.</p>
              )}
              {(educations ?? []).map((edu, index) => (
                <div key={index} className="rounded-lg border border-input p-3 text-sm">
                  <p className="font-medium">{edu.institution ?? "-"}</p>
                  <p className="text-muted-foreground">
                    {edu.field_of_study ?? "-"}
                    {edu.end_year ? ` · ${edu.end_year}` : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sertifikalar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {(certifications ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Kayıt yok.</p>
              )}
              {(certifications ?? []).map((cert, index) => (
                <div key={index} className="rounded-lg border border-input p-3 text-sm">
                  <p className="font-medium">{cert.name ?? "-"}</p>
                  <p className="text-muted-foreground">
                    Geçerlilik: {formatDate(cert.expiry_date)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Yüklenen belge</CardTitle>
          </CardHeader>
          <CardContent>
            {!document || !signedUrl ? (
              <p className="text-sm text-muted-foreground">
                Belge önizlemesi şu anda görüntülenemiyor.
              </p>
            ) : document.mime_type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signedUrl}
                alt="Yüklenen belge"
                className="w-full rounded-lg border border-input"
              />
            ) : document.mime_type === "application/pdf" ? (
              <iframe
                src={signedUrl}
                title="Yüklenen belge"
                className="h-[70vh] w-full rounded-lg border border-input"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Bu belge türü önizlenemiyor.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
