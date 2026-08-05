"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["pdf", "docx", "jpg", "jpeg", "png"];
const ACCEPT_ATTRIBUTE =
  ".pdf,.docx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Dosya boyutu 10MB'ı aşamaz.";
  }
  if (!ACCEPTED_EXTENSIONS.includes(getExtension(file.name))) {
    return "Desteklenmeyen dosya türü. Sadece PDF, DOCX, JPG veya PNG yükleyebilirsiniz.";
  }
  return null;
}

function uploadWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<{ status: number; body: { document_id?: string; error?: string } }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/basvuru/yukle");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: { document_id?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = {};
      }
      resolve({ status: xhr.status, body });
    };

    xhr.onerror = () => reject(new Error("network"));

    const formData = new FormData();
    formData.set("file", file);
    xhr.send(formData);
  });
}

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelected(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  }

  function handleRemove() {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!selectedFile || uploading) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const { status, body } = await uploadWithProgress(selectedFile, setProgress);

      if (status !== 200) {
        setError(body.error ?? "Dosya yüklenemedi. Lütfen tekrar deneyin.");
        setUploading(false);
        return;
      }

      router.push("/basvuru/durum");
    } catch {
      setError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
      setUploading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Belgenizi yükleyin</CardTitle>
        <CardDescription>
          CV veya başvuru formunuzu PDF, DOCX, JPG ya da PNG formatında, en fazla
          10MB olacak şekilde yükleyin.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!selectedFile && (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-input hover:border-primary/50"
            }`}
          >
            <p className="text-sm font-medium">
              Dosyayı buraya sürükleyin veya seçmek için tıklayın
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOCX, JPG, PNG — maksimum 10MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
          </div>
        )}

        {selectedFile && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-input px-3 py-2">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {selectedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
            {!uploading && (
              <Button variant="ghost" size="sm" onClick={handleRemove}>
                Kaldır
              </Button>
            )}
          </div>
        )}

        {uploading && (
          <div className="flex flex-col gap-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Yükleniyor... %{progress}
            </span>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!selectedFile || uploading}
          onClick={handleUpload}
        >
          {uploading ? "Yükleniyor..." : "Yükle"}
        </Button>
      </CardFooter>
    </Card>
  );
}
