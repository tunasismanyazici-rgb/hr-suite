"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function TestGirisForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password || submitting) return;

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("Giriş başarısız. E-posta veya şifre hatalı.");
      setSubmitting(false);
      return;
    }

    router.push("/basvuru/yukle");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Test Girişi</CardTitle>
        <CardDescription className="font-medium text-destructive">
          Sadece geliştirme ortamı. Bu sayfa üretimde kullanılamaz.
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
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
          />
          <Input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Şifre"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Giriş yapılıyor..." : "Giriş yap"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
