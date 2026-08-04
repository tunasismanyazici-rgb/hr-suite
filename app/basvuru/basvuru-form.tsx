"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BEKLEME_SANIYE = 60;
const SON_ISTEK_ANAHTARI = "basvuru-son-otp-istegi";

type SonIstek = { eposta: string; zaman: number };

function sonIstegiOku(): SonIstek | null {
  try {
    const ham = window.localStorage.getItem(SON_ISTEK_ANAHTARI);
    return ham ? (JSON.parse(ham) as SonIstek) : null;
  } catch {
    return null;
  }
}

function hataMesajiUret(mesaj: string): string {
  const kucukHarfli = mesaj.toLowerCase();
  if (kucukHarfli.includes("rate limit") || kucukHarfli.includes("too many")) {
    return "Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin.";
  }
  if (kucukHarfli.includes("email") && kucukHarfli.includes("invalid")) {
    return "Geçerli bir e-posta adresi girin.";
  }
  return "Bağlantı gönderilemedi. Lütfen tekrar deneyin.";
}

const SUNUCU_HATA_MESAJLARI: Record<string, string> = {
  dogrulama: "Giriş bağlantısı doğrulanamadı ya da süresi dolmuş. Lütfen tekrar deneyin.",
};

export function BasvuruForm({ baslangicHatasi }: { baslangicHatasi?: string }) {
  const [eposta, setEposta] = useState("");
  const [durum, setDurum] = useState<"bekliyor" | "gonderiliyor" | "gonderildi">(
    "bekliyor"
  );
  const [hata, setHata] = useState<string | null>(
    baslangicHatasi
      ? SUNUCU_HATA_MESAJLARI[baslangicHatasi] ?? "Bir hata oluştu. Lütfen tekrar deneyin."
      : null
  );
  const [kalanSaniye, setKalanSaniye] = useState(0);

  useEffect(() => {
    if (kalanSaniye <= 0) return;
    const zamanlayici = setInterval(() => {
      setKalanSaniye((onceki) => (onceki <= 1 ? 0 : onceki - 1));
    }, 1000);
    return () => clearInterval(zamanlayici);
  }, [kalanSaniye]);

  function epostaDegisti(deger: string) {
    setEposta(deger);
    const normalize = deger.trim().toLowerCase();
    if (!normalize) {
      setKalanSaniye(0);
      return;
    }
    const sonIstek = sonIstegiOku();
    if (sonIstek && sonIstek.eposta === normalize) {
      const gecenSaniye = Math.floor((Date.now() - sonIstek.zaman) / 1000);
      setKalanSaniye(Math.max(0, BEKLEME_SANIYE - gecenSaniye));
    } else {
      setKalanSaniye(0);
    }
  }

  async function gonder(olay: React.FormEvent) {
    olay.preventDefault();
    const normalize = eposta.trim().toLowerCase();
    if (!normalize || kalanSaniye > 0 || durum === "gonderiliyor") return;

    setHata(null);
    setDurum("gonderiliyor");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalize,
      options: {
        emailRedirectTo: `${window.location.origin}/basvuru/dogrula`,
      },
    });

    if (error) {
      setHata(hataMesajiUret(error.message));
      setDurum("bekliyor");
      return;
    }

    window.localStorage.setItem(
      SON_ISTEK_ANAHTARI,
      JSON.stringify({ eposta: normalize, zaman: Date.now() } satisfies SonIstek)
    );
    setKalanSaniye(BEKLEME_SANIYE);
    setDurum("gonderildi");
  }

  if (durum === "gonderildi") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>E-posta adresinize giriş bağlantısı gönderildi</CardTitle>
          <CardDescription>
            {eposta} adresine gönderdiğimiz bağlantıya tıklayarak başvurunuza devam
            edebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setDurum("bekliyor")}
          >
            Farklı bir e-posta adresi kullan
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Başvuruya başla</CardTitle>
        <CardDescription>
          Giriş yapmak için e-posta adresinizi girin, size bir giriş bağlantısı
          gönderelim.
        </CardDescription>
      </CardHeader>
      <form onSubmit={gonder}>
        <CardContent className="flex flex-col gap-3">
          <Input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="ornek@eposta.com"
            value={eposta}
            onChange={(olay) => epostaDegisti(olay.target.value)}
            disabled={durum === "gonderiliyor"}
          />
          {hata && <p className="text-sm text-destructive">{hata}</p>}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={durum === "gonderiliyor" || kalanSaniye > 0 || !eposta.trim()}
          >
            {durum === "gonderiliyor"
              ? "Gönderiliyor..."
              : kalanSaniye > 0
                ? `Tekrar denemek için ${kalanSaniye} sn bekleyin`
                : "Giriş bağlantısı gönder"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
