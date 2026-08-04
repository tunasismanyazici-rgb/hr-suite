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