function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Ortam değişkeni eksik: ${name}. Lütfen .env.local dosyasını kontrol edin.`
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabasePublishableKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

export function getSupabaseSecretKey(): string {
  return requireEnv("SUPABASE_SECRET_KEY");
}
