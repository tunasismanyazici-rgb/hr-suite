import type { SupabaseClient } from "@supabase/supabase-js";

// CV metninde sık geçen kısaltmalar. Tam eşleşme bulunamazsa denenir.
const PROVINCE_ABBREVIATIONS: Record<string, string> = {
  ist: "istanbul",
  ank: "ankara",
  izm: "izmir",
  brs: "bursa",
  ant: "antalya",
  gaz: "gaziantep",
  kon: "konya",
  ada: "adana",
};

function normalizeTurkishText(input: string): string {
  return input
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .toLowerCase()
    .replace(/\./g, "")
    .trim();
}

export interface ResolvedLocation {
  provinceCode: string | null;
  districtCode: string | null;
}

async function resolveProvinceCode(
  supabase: SupabaseClient,
  provinceText: string | null
): Promise<string | null> {
  if (!provinceText) return null;
  const normalized = normalizeTurkishText(provinceText);
  if (!normalized) return null;

  const { data: provinces } = await supabase
    .from("provinces")
    .select("code, name");
  if (!provinces) return null;

  const exactMatch = provinces.find(
    (province) => normalizeTurkishText(province.name) === normalized
  );
  if (exactMatch) return exactMatch.code;

  const expanded = PROVINCE_ABBREVIATIONS[normalized];
  if (expanded) {
    const abbreviationMatch = provinces.find(
      (province) => normalizeTurkishText(province.name) === expanded
    );
    if (abbreviationMatch) return abbreviationMatch.code;
  }

  return null;
}

async function resolveDistrictCode(
  supabase: SupabaseClient,
  districtText: string | null,
  provinceCode: string | null
): Promise<string | null> {
  if (!districtText) return null;
  const normalized = normalizeTurkishText(districtText);
  if (!normalized) return null;

  let query = supabase.from("districts").select("code, name");
  if (provinceCode) {
    query = query.eq("province_code", provinceCode);
  }
  const { data: districts } = await query;
  if (!districts) return null;

  const match = districts.find(
    (district) => normalizeTurkishText(district.name) === normalized
  );
  return match?.code ?? null;
}

/**
 * İl/ilçe adlarını (metinde geçtiği hâliyle) provinces/districts tablolarındaki
 * kodlara eşler. Büyük/küçük harf ve Türkçe karakter farkını, ayrıca birkaç
 * yaygın kısaltmayı (ör. "İst.") tolere eder. Eşleşme bulunamazsa hata
 * fırlatmadan null döner.
 */
export async function resolveLocation(
  supabase: SupabaseClient,
  provinceText: string | null,
  districtText: string | null
): Promise<ResolvedLocation> {
  const provinceCode = await resolveProvinceCode(supabase, provinceText);
  const districtCode = await resolveDistrictCode(
    supabase,
    districtText,
    provinceCode
  );
  return { provinceCode, districtCode };
}
