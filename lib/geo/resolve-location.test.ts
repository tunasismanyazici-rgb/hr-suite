import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveLocation } from "./resolve-location";

const PROVINCES = [
  { code: "34", name: "İstanbul" },
  { code: "06", name: "Ankara" },
];

const DISTRICTS = [
  { code: "34-kadikoy", name: "Kadıköy", province_code: "34" },
  { code: "34-besiktas", name: "Beşiktaş", province_code: "34" },
  { code: "06-cankaya", name: "Çankaya", province_code: "06" },
];

function districtsQuery(rows: typeof DISTRICTS) {
  const promise = Promise.resolve({ data: rows });
  return Object.assign(promise, {
    eq: vi.fn((column: string, value: string) =>
      districtsQuery(rows.filter((row) => (row as never)[column] === value))
    ),
  });
}

function createFakeSupabase() {
  return {
    from: vi.fn((table: string) => {
      if (table === "provinces") {
        return { select: vi.fn().mockResolvedValue({ data: PROVINCES }) };
      }
      if (table === "districts") {
        return { select: vi.fn(() => districtsQuery(DISTRICTS)) };
      }
      throw new Error(`beklenmeyen tablo: ${table}`);
    }),
  } as unknown as SupabaseClient;
}

describe("resolveLocation", () => {
  it("il ve ilçeyi tam eşleşmeyle bulur (büyük/küçük harf, Türkçe karakter farkı tolere edilir)", async () => {
    const supabase = createFakeSupabase();

    const result = await resolveLocation(supabase, "istanbul", "kadıköy");

    expect(result.provinceCode).toBe("34");
    expect(result.districtCode).toBe("34-kadikoy");
  });

  it("kısaltmayı ('İst.') tanır", async () => {
    const supabase = createFakeSupabase();

    const result = await resolveLocation(supabase, "İst.", null);

    expect(result.provinceCode).toBe("34");
  });

  it("ilçeyi doğru ile göre filtreler (aynı ilçe adı başka ilde varsa karışmaz)", async () => {
    const supabase = createFakeSupabase();

    const result = await resolveLocation(supabase, "Ankara", "Kadıköy");

    expect(result.provinceCode).toBe("06");
    expect(result.districtCode).toBeNull();
  });

  it("eşleşme yoksa null döner, hata fırlatmaz", async () => {
    const supabase = createFakeSupabase();

    const result = await resolveLocation(supabase, "Marslılar Diyarı", "Bilinmeyen");

    expect(result.provinceCode).toBeNull();
    expect(result.districtCode).toBeNull();
  });

  it("province/district metni null ise null döner", async () => {
    const supabase = createFakeSupabase();

    const result = await resolveLocation(supabase, null, null);

    expect(result.provinceCode).toBeNull();
    expect(result.districtCode).toBeNull();
  });
});
