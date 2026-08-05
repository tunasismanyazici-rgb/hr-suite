import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const REQUIRED_CONSENT_TYPES = ["aydinlatma", "acik_riza"] as const;

interface DetectedFileType {
  extension: string;
  mimeType: string;
  sourceType: "unknown" | "image" | "docx";
}

function readHex(bytes: Uint8Array, start: number, length: number): string {
  return Array.from(bytes.slice(start, start + length))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function detectFileType(bytes: Uint8Array): DetectedFileType | null {
  if (readHex(bytes, 0, 4) === "25504446") {
    return { extension: "pdf", mimeType: "application/pdf", sourceType: "unknown" };
  }
  if (readHex(bytes, 0, 4) === "89504e47") {
    return { extension: "png", mimeType: "image/png", sourceType: "image" };
  }
  if (readHex(bytes, 0, 3) === "ffd8ff") {
    return { extension: "jpg", mimeType: "image/jpeg", sourceType: "image" };
  }
  if (readHex(bytes, 0, 4) === "504b0304") {
    return {
      extension: "docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sourceType: "docx",
    };
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!candidate) {
    return NextResponse.json(
      { error: "Önce KVKK onaylarını tamamlamanız gerekiyor." },
      { status: 403 }
    );
  }

  const { data: consents } = await supabase
    .from("consents")
    .select("consent_type")
    .eq("candidate_id", candidate.id)
    .eq("granted", true)
    .in("consent_type", REQUIRED_CONSENT_TYPES);

  const grantedTypes = new Set((consents ?? []).map((row) => row.consent_type));
  const hasRequiredConsents = REQUIRED_CONSENT_TYPES.every((type) =>
    grantedTypes.has(type)
  );

  if (!hasRequiredConsents) {
    return NextResponse.json(
      { error: "Önce KVKK onaylarını tamamlamanız gerekiyor." },
      { status: 403 }
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Lütfen bir dosya seçin." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Dosya boyutu 10MB'ı aşamaz." },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes.byteLength > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Dosya boyutu 10MB'ı aşamaz." },
      { status: 400 }
    );
  }

  const detected = detectFileType(bytes);
  if (!detected) {
    return NextResponse.json(
      {
        error:
          "Desteklenmeyen dosya türü. Sadece PDF, DOCX, JPG veya PNG yükleyebilirsiniz.",
      },
      { status: 400 }
    );
  }

  const storagePath = `${candidate.id}/${randomUUID()}.${detected.extension}`;

  const { error: uploadError } = await supabase.storage
    .from("candidate-documents")
    .upload(storagePath, bytes, {
      contentType: detected.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Dosya yüklenemedi. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }

  const { data: document, error: documentError } = await supabase
    .from("candidate_documents")
    .insert({
      candidate_id: candidate.id,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: detected.mimeType,
      file_size_bytes: bytes.byteLength,
      source_type: detected.sourceType,
      ocr_status: "pending",
    })
    .select("id")
    .single();

  if (documentError || !document) {
    await supabase.storage.from("candidate-documents").remove([storagePath]);
    return NextResponse.json(
      { error: "Belge kaydedilemedi. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }

  await supabase
    .from("candidates")
    .update({ status: "processing" })
    .eq("id", candidate.id);

  const adminClient = createAdminClient();
  const { error: auditError } = await adminClient.from("audit_log").insert({
    actor_id: user.id,
    actor_type: "candidate",
    action: "belge_yuklendi",
    entity_type: "candidate_document",
    entity_id: document.id,
    metadata: {
      document_id: document.id,
      file_size_bytes: bytes.byteLength,
    },
  });

  if (auditError) {
    console.error("audit_log kaydı başarısız:", auditError.message);
  }

  return NextResponse.json({ document_id: document.id });
}
