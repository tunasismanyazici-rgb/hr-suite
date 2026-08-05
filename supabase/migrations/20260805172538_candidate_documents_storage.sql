-- Aday belgeleri için depolama alanı
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-documents',
  'candidate-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- storage.objects üzerinde RLS Supabase tarafından varsayılan olarak etkin;
-- bu tabloya postgres rolünün ALTER yetkisi olmadığından burada tekrar açılmıyor.

-- Yol yapısı: {candidate_id}/{uuid}.{ext} -> ilk klasör segmenti candidate_id
create policy candidate_documents_storage_own on storage.objects
  for all using (
    bucket_id = 'candidate-documents'
    and owns_candidate((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'candidate-documents'
    and owns_candidate((storage.foldername(name))[1]::uuid)
  );

create policy candidate_documents_storage_hr_read on storage.objects
  for select using (
    bucket_id = 'candidate-documents'
    and is_hr_user()
  );
