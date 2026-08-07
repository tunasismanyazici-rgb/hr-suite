"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LOW_CONFIDENCE_THRESHOLD = 0.7;

const SELECT_CLASSES =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30";

interface CandidateInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  province_code: string | null;
  district_code: string | null;
}

interface ExperienceRow {
  id: string;
  company_name: string | null;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

interface EducationRow {
  id: string;
  institution: string | null;
  field_of_study: string | null;
  end_year: number | null;
}

interface CertificationRow {
  id: string;
  name: string | null;
  expiry_date: string | null;
}

interface FieldConfidence {
  first_name: number;
  last_name: number;
  birth_date: number;
  province: number;
  district: number;
  experiences: number;
  educations: number;
  certifications: number;
  [key: string]: number;
}

interface VerificationFormProps {
  candidate: CandidateInfo;
  document: { mimeType: string; signedUrl: string | null };
  fieldConfidence: FieldConfidence;
  experiences: ExperienceRow[];
  educations: EducationRow[];
  certifications: CertificationRow[];
  provinces: { code: string; name: string }[];
  districts: { code: string; name: string; province_code: string }[];
}

function isLowConfidence(score: number): boolean {
  return score < LOW_CONFIDENCE_THRESHOLD;
}

function isEmptyValue(value: string | number | null): boolean {
  return value === null || value === "";
}

function FieldHint({ low, empty }: { low: boolean; empty: boolean }) {
  if (!low && !empty) return null;
  return (
    <div className="mt-1 flex flex-col gap-0.5">
      {empty && (
        <p className="text-xs text-muted-foreground">CV&apos;de bulunamadı</p>
      )}
      {low && (
        <p className="text-xs text-yellow-700 dark:text-yellow-500">
          Bu alanı kontrol edin
        </p>
      )}
    </div>
  );
}

function FieldWrap({
  low,
  children,
}: {
  low: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(low && "border-l-2 border-yellow-500 pl-2")}>
      {children}
    </div>
  );
}

export function VerificationForm({
  candidate,
  document,
  fieldConfidence,
  experiences,
  educations,
  certifications,
  provinces,
  districts,
}: VerificationFormProps) {
  const [mobileView, setMobileView] = useState<"preview" | "form">("preview");
  const [firstName, setFirstName] = useState(candidate.first_name ?? "");
  const [lastName, setLastName] = useState(candidate.last_name ?? "");
  const [birthDate, setBirthDate] = useState(candidate.birth_date ?? "");
  const [provinceCode, setProvinceCode] = useState(candidate.province_code ?? "");
  const [districtCode, setDistrictCode] = useState(candidate.district_code ?? "");
  const [experienceRows, setExperienceRows] = useState<ExperienceRow[]>(experiences);
  const [educationRows, setEducationRows] = useState<EducationRow[]>(educations);
  const [certificationRows, setCertificationRows] =
    useState<CertificationRow[]>(certifications);

  const [dirty, setDirty] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  function markDirty() {
    setDirty(true);
  }

  function addExperience() {
    setExperienceRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        company_name: null,
        title: null,
        start_date: null,
        end_date: null,
        is_current: false,
      },
    ]);
    markDirty();
  }

  function updateExperience(index: number, patch: Partial<ExperienceRow>) {
    setExperienceRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
    markDirty();
  }

  function removeExperience(index: number) {
    setExperienceRows((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  }

  function moveExperience(index: number, direction: -1 | 1) {
    setExperienceRows((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    markDirty();
  }

  function addEducation() {
    setEducationRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), institution: null, field_of_study: null, end_year: null },
    ]);
    markDirty();
  }

  function updateEducation(index: number, patch: Partial<EducationRow>) {
    setEducationRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
    markDirty();
  }

  function removeEducation(index: number) {
    setEducationRows((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  }

  function addCertification() {
    setCertificationRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: null, expiry_date: null },
    ]);
    markDirty();
  }

  function updateCertification(index: number, patch: Partial<CertificationRow>) {
    setCertificationRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
    markDirty();
  }

  function removeCertification(index: number) {
    setCertificationRows((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  }

  async function handleSave() {
    setSubmitted(true);
    setError(null);

    if (firstName.trim() === "" || lastName.trim() === "") {
      setError("Ad ve soyad zorunludur.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/basvuru/dogrulama", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          birth_date: birthDate || null,
          province_code: provinceCode || null,
          district_code: districtCode || null,
          experiences: experienceRows.map((row) => ({
            company_name: row.company_name,
            title: row.title,
            start_date: row.start_date,
            end_date: row.is_current ? null : row.end_date,
            is_current: row.is_current,
          })),
          educations: educationRows.map((row) => ({
            institution: row.institution,
            field_of_study: row.field_of_study,
            end_year: row.end_year,
          })),
          certifications: certificationRows.map((row) => ({
            name: row.name,
            expiry_date: row.expiry_date,
          })),
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Kaydedilemedi. Lütfen tekrar deneyin.");
        setSaving(false);
        return;
      }

      setDirty(false);
      setSaved(true);
    } catch {
      setError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader>
          <CardTitle>Bilgileriniz kaydedildi</CardTitle>
          <CardDescription>
            Başvurunuz İK ekibimize iletildi. Değerlendirme sonucu size bildirilecektir.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            render={<Link href="/basvuru" />}
            nativeButton={false}
            variant="outline"
            className="w-full"
          >
            Ana sayfaya dön
          </Button>
          <Button render={<Link href="/basvuru/durum" />} nativeButton={false} className="w-full">
            Durumu görüntüle
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const filteredDistricts = districts.filter(
    (district) => district.province_code === provinceCode
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 lg:hidden">
        <Button
          type="button"
          variant={mobileView === "preview" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => setMobileView("preview")}
        >
          Önizleme
        </Button>
        <Button
          type="button"
          variant={mobileView === "form" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => setMobileView("form")}
        >
          Form
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(mobileView === "preview" ? "block" : "hidden", "lg:block")}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Yüklenen belge</CardTitle>
            </CardHeader>
            <CardContent>
              {!document.signedUrl ? (
                <p className="text-sm text-muted-foreground">
                  Belge önizlemesi şu anda görüntülenemiyor.
                </p>
              ) : document.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={document.signedUrl}
                  alt="Yüklenen belge"
                  className="w-full rounded-lg border border-input"
                />
              ) : document.mimeType === "application/pdf" ? (
                <iframe
                  src={document.signedUrl}
                  title="Yüklenen belge"
                  className="h-[70vh] w-full rounded-lg border border-input"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Bu belge türü önizlenemiyor, bilgilerinizi yandaki formdan
                  düzenleyebilirsiniz.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className={cn(mobileView === "form" ? "block" : "hidden", "lg:block")}>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Kişisel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first_name">Ad</Label>
                  <FieldWrap low={isLowConfidence(fieldConfidence.first_name)}>
                    <Input
                      id="first_name"
                      value={firstName}
                      onChange={(event) => {
                        setFirstName(event.target.value);
                        markDirty();
                      }}
                      aria-invalid={submitted && firstName.trim() === ""}
                    />
                  </FieldWrap>
                  <FieldHint
                    low={isLowConfidence(fieldConfidence.first_name)}
                    empty={isEmptyValue(firstName)}
                  />
                </div>

                <div>
                  <Label htmlFor="last_name">Soyad</Label>
                  <FieldWrap low={isLowConfidence(fieldConfidence.last_name)}>
                    <Input
                      id="last_name"
                      value={lastName}
                      onChange={(event) => {
                        setLastName(event.target.value);
                        markDirty();
                      }}
                      aria-invalid={submitted && lastName.trim() === ""}
                    />
                  </FieldWrap>
                  <FieldHint
                    low={isLowConfidence(fieldConfidence.last_name)}
                    empty={isEmptyValue(lastName)}
                  />
                </div>

                <div>
                  <Label htmlFor="birth_date">Doğum tarihi</Label>
                  <FieldWrap low={isLowConfidence(fieldConfidence.birth_date)}>
                    <Input
                      id="birth_date"
                      type="date"
                      value={birthDate}
                      onChange={(event) => {
                        setBirthDate(event.target.value);
                        markDirty();
                      }}
                    />
                  </FieldWrap>
                  <FieldHint
                    low={isLowConfidence(fieldConfidence.birth_date)}
                    empty={isEmptyValue(birthDate)}
                  />
                </div>

                <div>
                  <Label htmlFor="province">İl</Label>
                  <FieldWrap low={isLowConfidence(fieldConfidence.province)}>
                    <select
                      id="province"
                      className={SELECT_CLASSES}
                      value={provinceCode}
                      onChange={(event) => {
                        setProvinceCode(event.target.value);
                        setDistrictCode("");
                        markDirty();
                      }}
                    >
                      <option value="">Seçiniz</option>
                      {provinces.map((province) => (
                        <option key={province.code} value={province.code}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </FieldWrap>
                  <FieldHint
                    low={isLowConfidence(fieldConfidence.province)}
                    empty={isEmptyValue(provinceCode)}
                  />
                </div>

                <div>
                  <Label htmlFor="district">İlçe</Label>
                  <FieldWrap low={isLowConfidence(fieldConfidence.district)}>
                    <select
                      id="district"
                      className={SELECT_CLASSES}
                      value={districtCode}
                      disabled={!provinceCode}
                      onChange={(event) => {
                        setDistrictCode(event.target.value);
                        markDirty();
                      }}
                    >
                      <option value="">Seçiniz</option>
                      {filteredDistricts.map((district) => (
                        <option key={district.code} value={district.code}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </FieldWrap>
                  <FieldHint
                    low={isLowConfidence(fieldConfidence.district)}
                    empty={isEmptyValue(districtCode)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deneyimler</CardTitle>
                {isLowConfidence(fieldConfidence.experiences) && (
                  <CardDescription className="text-yellow-700 dark:text-yellow-500">
                    Bu bölümü kontrol edin
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {experienceRows.length === 0 && (
                  <p className="text-xs text-muted-foreground">CV&apos;de bulunamadı</p>
                )}
                {experienceRows.map((row, index) => (
                  <div
                    key={row.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border border-input p-3",
                      isLowConfidence(fieldConfidence.experiences) &&
                        "border-l-2 border-l-yellow-500"
                    )}
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Şirket adı"
                        value={row.company_name ?? ""}
                        onChange={(event) =>
                          updateExperience(index, { company_name: event.target.value })
                        }
                      />
                      <Input
                        placeholder="Rol"
                        value={row.title ?? ""}
                        onChange={(event) =>
                          updateExperience(index, { title: event.target.value })
                        }
                      />
                      <div>
                        <Label className="mb-1 text-xs text-muted-foreground">
                          Başlangıç
                        </Label>
                        <Input
                          type="date"
                          value={row.start_date ?? ""}
                          onChange={(event) =>
                            updateExperience(index, { start_date: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="mb-1 text-xs text-muted-foreground">Bitiş</Label>
                        <Input
                          type="date"
                          value={row.end_date ?? ""}
                          disabled={row.is_current}
                          onChange={(event) =>
                            updateExperience(index, { end_date: event.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`is_current_${row.id}`}
                          checked={row.is_current}
                          onCheckedChange={(checked) =>
                            updateExperience(index, {
                              is_current: checked,
                              end_date: checked ? null : row.end_date,
                            })
                          }
                        />
                        <Label htmlFor={`is_current_${row.id}`} className="text-sm">
                          Halen çalışıyorum
                        </Label>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0}
                          onClick={() => moveExperience(index, -1)}
                        >
                          <ChevronUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === experienceRows.length - 1}
                          onClick={() => moveExperience(index, 1)}
                        >
                          <ChevronDown />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeExperience(index)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addExperience}>
                  Deneyim ekle
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eğitimler</CardTitle>
                {isLowConfidence(fieldConfidence.educations) && (
                  <CardDescription className="text-yellow-700 dark:text-yellow-500">
                    Bu bölümü kontrol edin
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {educationRows.length === 0 && (
                  <p className="text-xs text-muted-foreground">CV&apos;de bulunamadı</p>
                )}
                {educationRows.map((row, index) => (
                  <div
                    key={row.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border border-input p-3 sm:flex-row sm:items-end",
                      isLowConfidence(fieldConfidence.educations) &&
                        "border-l-2 border-l-yellow-500"
                    )}
                  >
                    <div className="grid flex-1 gap-2 sm:grid-cols-3">
                      <Input
                        placeholder="Okul"
                        value={row.institution ?? ""}
                        onChange={(event) =>
                          updateEducation(index, { institution: event.target.value })
                        }
                      />
                      <Input
                        placeholder="Bölüm"
                        value={row.field_of_study ?? ""}
                        onChange={(event) =>
                          updateEducation(index, { field_of_study: event.target.value })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Mezuniyet yılı"
                        value={row.end_year ?? ""}
                        onChange={(event) =>
                          updateEducation(index, {
                            end_year:
                              event.target.value === "" ? null : Number(event.target.value),
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeEducation(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addEducation}>
                  Eğitim ekle
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sertifikalar</CardTitle>
                {isLowConfidence(fieldConfidence.certifications) && (
                  <CardDescription className="text-yellow-700 dark:text-yellow-500">
                    Bu bölümü kontrol edin
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {certificationRows.length === 0 && (
                  <p className="text-xs text-muted-foreground">CV&apos;de bulunamadı</p>
                )}
                {certificationRows.map((row, index) => (
                  <div
                    key={row.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border border-input p-3 sm:flex-row sm:items-end",
                      isLowConfidence(fieldConfidence.certifications) &&
                        "border-l-2 border-l-yellow-500"
                    )}
                  >
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Sertifika adı"
                        value={row.name ?? ""}
                        onChange={(event) =>
                          updateCertification(index, { name: event.target.value })
                        }
                      />
                      <Input
                        type="date"
                        value={row.expiry_date ?? ""}
                        onChange={(event) =>
                          updateCertification(index, { expiry_date: event.target.value })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeCertification(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addCertification}>
                  Sertifika ekle
                </Button>
              </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
