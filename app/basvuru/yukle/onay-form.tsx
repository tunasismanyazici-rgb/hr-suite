"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { legalDocuments, type LegalDocumentKey } from "@/lib/legal/texts";
import { UploadForm } from "./upload-form";

function ConsentRow({
  id,
  checked,
  onCheckedChange,
  label,
  required,
  onOpenText,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  required: boolean;
  onOpenText: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id} className="font-normal">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <button
          type="button"
          onClick={onOpenText}
          className="w-fit text-left text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Metni oku
        </button>
      </div>
    </div>
  );
}

export function OnayForm() {
  const [aydinlatmaAccepted, setAydinlatmaAccepted] = useState(false);
  const [acikRizaAccepted, setAcikRizaAccepted] = useState(false);
  const [adayHavuzuAccepted, setAdayHavuzuAccepted] = useState(false);
  const [openDialog, setOpenDialog] = useState<LegalDocumentKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canContinue = aydinlatmaAccepted && acikRizaAccepted && !submitting;

  async function handleContinue() {
    if (!canContinue) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/basvuru/onay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aydinlatma: aydinlatmaAccepted,
          acikRiza: acikRizaAccepted,
          adayHavuzu: adayHavuzuAccepted,
        }),
      });

      if (!response.ok) {
        setError("Onaylar kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return <UploadForm />;
  }

  return (
    <>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>KVKK Onayları</CardTitle>
          <CardDescription>
            Devam etmeden önce aşağıdaki metinleri okuyup onaylamanız gerekiyor.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ConsentRow
            id="aydinlatma-onay"
            checked={aydinlatmaAccepted}
            onCheckedChange={setAydinlatmaAccepted}
            required
            label="Aydınlatma metnini okudum ve anladım."
            onOpenText={() => setOpenDialog("aydinlatma")}
          />
          <ConsentRow
            id="acik-riza-onay"
            checked={acikRizaAccepted}
            onCheckedChange={setAcikRizaAccepted}
            required
            label="Kişisel verilerimin işlenmesine açık rıza veriyorum."
            onOpenText={() => setOpenDialog("acikRiza")}
          />
          <ConsentRow
            id="aday-havuzu-onay"
            checked={adayHavuzuAccepted}
            onCheckedChange={setAdayHavuzuAccepted}
            required={false}
            label="Aday havuzunda 2 yıl saklanmasını kabul ediyorum."
            onOpenText={() => setOpenDialog("adayHavuzu")}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button className="w-full" disabled={!canContinue} onClick={handleContinue}>
            {submitting ? "Kaydediliyor..." : "Devam Et"}
          </Button>
        </CardFooter>
      </Card>

      <Dialog
        open={openDialog !== null}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <DialogContent>
          {openDialog && (
            <>
              <DialogHeader>
                <DialogTitle>{legalDocuments[openDialog].title}</DialogTitle>
                <DialogDescription>
                  Sürüm {legalDocuments[openDialog].version}
                </DialogDescription>
              </DialogHeader>
              <p className="max-h-80 overflow-y-auto text-sm leading-relaxed">
                {legalDocuments[openDialog].body}
              </p>
              <DialogFooter showCloseButton />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
