function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Ortam değişkeni eksik: ${name}. Lütfen .env.local dosyasını kontrol edin.`
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

export function getSupabasePublishableKey(): string {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function getSupabaseSecretKey(): string {
  return requireEnv("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
}
