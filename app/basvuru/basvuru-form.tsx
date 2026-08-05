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

const COOLDOWN_SECONDS = 60;
const LAST_REQUEST_KEY = "basvuru-son-otp-istegi";

type LastRequest = { email: string; timestamp: number };

function readLastRequest(): LastRequest | null {
  try {
    const raw = window.localStorage.getItem(LAST_REQUEST_KEY);
    return raw ? (JSON.parse(raw) as LastRequest) : null;
  } catch {
    return null;
  }
}

function buildErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin.";
  }
  if (lower.includes("email") && lower.includes("invalid")) {
    return "Geçerli bir e-posta adresi girin.";
  }
  return "Bağlantı gönderilemedi. Lütfen tekrar deneyin.";
}

const SERVER_ERROR_MESSAGES: Record<string, string> = {
  verification: "Giriş bağlantısı doğrulanamadı ya da süresi dolmuş. Lütfen tekrar deneyin.",
};

export function BasvuruForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(
    initialError
      ? SERVER_ERROR_MESSAGES[initialError] ?? "Bir hata oluştu. Lütfen tekrar deneyin."
      : null
  );
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  function handleEmailChange(value: string) {
    setEmail(value);
    const normalizedEmail = value.trim().toLowerCase();
    if (!normalizedEmail) {
      setCooldownSeconds(0);
      return;
    }
    const lastRequest = readLastRequest();
    if (lastRequest && lastRequest.email === normalizedEmail) {
      const elapsedSeconds = Math.floor((Date.now() - lastRequest.timestamp) / 1000);
      setCooldownSeconds(Math.max(0, COOLDOWN_SECONDS - elapsedSeconds));
    } else {
      setCooldownSeconds(0);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || cooldownSeconds > 0 || status === "sending") return;

    setError(null);
    setStatus("sending");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/basvuru/dogrula`,
      },
    });

    if (signInError) {
      setError(buildErrorMessage(signInError.message));
      setStatus("idle");
      return;
    }

    window.localStorage.setItem(
      LAST_REQUEST_KEY,
      JSON.stringify({ email: normalizedEmail, timestamp: Date.now() } satisfies LastRequest)
    );
    setCooldownSeconds(COOLDOWN_SECONDS);
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>E-posta adresinize giriş bağlantısı gönderildi</CardTitle>
          <CardDescription>
            {email} adresine gönderdiğimiz bağlantıya tıklayarak başvurunuza devam
            edebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setStatus("idle")}
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
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-3">
          <Input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="ornek@eposta.com"
            value={email}
            onChange={(event) => handleEmailChange(event.target.value)}
            disabled={status === "sending"}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={status === "sending" || cooldownSeconds > 0 || !email.trim()}
          >
            {status === "sending"
              ? "Gönderiliyor..."
              : cooldownSeconds > 0
                ? `Tekrar denemek için ${cooldownSeconds} sn bekleyin`
                : "Giriş bağlantısı gönder"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
