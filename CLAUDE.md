# HR Suite — Aday Başvuru ve Eşleştirme Modülü

## Proje amacı
Adaylar CV veya basılı başvuru formu yükler. Sistem OCR + LLM ile
alanları çıkarır, aday doğrular, açık pozisyonlara uygunluk skoru üretilir.

## Stack
- Next.js 16 (App Router, Turbopack), TypeScript, Tailwind, shadcn/ui
- Supabase (PostgreSQL + Auth + Storage), Frankfurt bölgesi
- Vercel (fra1), Google Cloud Vision (OCR), Anthropic API (extraction)

## Klasör yapısı
app/basvuru       → aday tarafı sayfaları
app/ik            → İK paneli
app/api           → API route'ları
lib               → yardımcı fonksiyonlar, tip tanımları
supabase/migrations → veritabanı şeması
NOT: src/ klasörü yok, app/ doğrudan kökte.

## Kurallar
- Arayüz metinleri Türkçe, kod ve değişken isimleri İngilizce
- Veritabanı değişiklikleri sadece migration dosyasıyla yapılır;
  Supabase dashboard'undan elle şema değiştirilmez
- Her tabloda RLS politikası zorunlu, istisnasız
- Kişisel veri (ad, telefon, e-posta, TCKN) hiçbir log'a yazılmaz
- Sırlar .env.local'de tutulur, koda gömülmez
- Skorlama girdisinden ad, cinsiyet, yaş, fotoğraf, uyruk, medeni hal çıkarılır
- Eşleştirme skoru LLM tarafından sıfırdan üretilmez; deterministik hesaplanır,
  LLM yalnızca sınırlı düzeltme ve gerekçe üretir
- Yeni paket kurulmadan önce gerekçesi belirtilir

## Çalışma biçimi
- Her faz ayrı branch'te ilerler
- Tek seferde büyük değişiklik yapılmaz, küçük dilimler hâlinde ilerlenir

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
