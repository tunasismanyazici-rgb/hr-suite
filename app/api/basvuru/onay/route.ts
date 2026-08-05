import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { legalDocuments, type LegalDocumentKey } from "@/lib/legal/texts";

const CONSENT_TYPE_DB: Record<LegalDocumentKey, string> = {
  aydinlatma: "aydinlatma",
  acikRiza: "acik_riza",
  adayHavuzu: "aday_havuzu",
};

interface ConsentRequest {
  aydinlatma: boolean;
  acikRiza: boolean;
  adayHavuzu: boolean;
}

function isValidRequest(body: unknown): body is ConsentRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.aydinlatma === "boolean" &&
    typeof b.acikRiza === "boolean" &&
    typeof b.adayHavuzu === "boolean"
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!isValidRequest(body)) {
    return NextResponse.json(
      { error: "İstek gövdesi geçersiz." },
      { status: 400 }
    );
  }

  if (!body.aydinlatma || !body.acikRiza) {
    return NextResponse.json(
      { error: "Zorunlu onaylar olmadan devam edilemez." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const { data: existingCandidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let candidateId: string;

  if (existingCandidate) {
    candidateId = existingCandidate.id;
  } else {
    const { data: newCandidate, error: candidateError } = await supabase
      .from("candidates")
      .insert({ auth_user_id: user.id, email: user.email, status: "draft" })
      .select("id")
      .single();

    if (candidateError || !newCandidate) {
      return NextResponse.json(
        { error: "Aday kaydı oluşturulamadı." },
        { status: 500 }
      );
    }

    candidateId = newCandidate.id;
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  const grantedAt = new Date().toISOString();
  const consentRows = (Object.keys(legalDocuments) as LegalDocumentKey[]).map(
    (key) => ({
      candidate_id: candidateId,
      consent_type: CONSENT_TYPE_DB[key],
      document_version: legalDocuments[key].version,
      granted: body[key],
      granted_at: grantedAt,
      ip_address: ipAddress,
    })
  );

  const { error: consentError } = await supabase
    .from("consents")
    .insert(consentRows);

  if (consentError) {
    return NextResponse.json(
      { error: "Onaylar kaydedilemedi." },
      { status: 500 }
    );
  }

  const adminClient = createAdminClient();
  const { error: auditError } = await adminClient.from("audit_log").insert({
    actor_id: user.id,
    actor_type: "candidate",
    action: "kvkk_onaylari_kaydedildi",
    entity_type: "candidate",
    entity_id: candidateId,
    metadata: {
      aydinlatma: body.aydinlatma,
      acik_riza: body.acikRiza,
      aday_havuzu: body.adayHavuzu,
      document_versions: {
        aydinlatma: legalDocuments.aydinlatma.version,
        acik_riza: legalDocuments.acikRiza.version,
        aday_havuzu: legalDocuments.adayHavuzu.version,
      },
    },
  });

  if (auditError) {
    console.error("audit_log kaydı başarısız:", auditError.message);
  }

  return NextResponse.json({ ok: true });
}
