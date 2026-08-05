"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 2 * 60 * 1000;

type OcrStatus = "pending" | "processing" | "completed" | "failed";

export function StatusView({
  documentId,
  initialStatus,
  initialErrorMessage,
}: {
  documentId: string;
  initialStatus: OcrStatus;
  initialErrorMessage: string | null;
}) {
  const [status, setStatus] = useState<OcrStatus>(initialStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage
  );
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status === "completed" || status === "failed") {
      return;
    }

    const supabase = createClient();

    const intervalId = setInterval(async () => {
      const { data } = await supabase
        .from("candidate_documents")
        .select("ocr_status, error_message")
        .eq("id", documentId)
        .single();

      if (!data) return;

      setStatus(data.ocr_status as OcrStatus);
      setErrorMessage(data.error_message);

      if (data.ocr_status === "completed" || data.ocr_status === "failed") {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      }
    }, POLL_INTERVAL_MS);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      setTimedOut(true);
    }, POLL_TIMEOUT_MS);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  if (timedOut) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>İşlem beklenenden uzun sürüyor</CardTitle>
          <CardDescription>Sayfayı yenileyebilirsiniz.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Sayfayı yenile
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status === "failed") {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Belge işlenemedi</CardTitle>
          <CardDescription>
            {errorMessage ?? "Belgeniz işlenirken bir hata oluştu."}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            render={<Link href="/basvuru/yukle" />}
            nativeButton={false}
            className="w-full"
          >
            Tekrar yükle
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status === "completed") {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Bilgileriniz hazır</CardTitle>
          <CardDescription>
            Belgenizden çıkarılan bilgileri doğrulama adımına geçebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            render={<Link href="/basvuru/dogrulama" />}
            nativeButton={false}
            className="w-full"
          >
            Doğrulama ekranına geç
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="items-center text-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <CardTitle>Belgeniz işleniyor, lütfen bekleyin</CardTitle>
        <CardDescription>
          Bu işlem birkaç dakika sürebilir, sayfadan ayrılmayın.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
