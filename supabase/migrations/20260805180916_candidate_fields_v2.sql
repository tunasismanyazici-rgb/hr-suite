-- İl/ilçe referans tabloları
create table provinces (
  code text primary key,
  name text not null
);

create table districts (
  code text primary key,
  province_code text not null references provinces(code),
  name text not null
);

-- Adaylar: ad/soyad ayrımı, doğum tarihi, il/ilçe referansı
alter table candidates
  drop column full_name,
  drop column city,
  add column first_name text,
  add column last_name text,
  add column birth_date date,
  add column province_code text references provinces(code),
  add column district_code text references districts(code);

-- Sertifikalar
create table certifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  name text,
  expiry_date date,
  sort_order integer not null default 0
);

alter table certifications enable row level security;
alter table provinces enable row level security;
alter table districts enable row level security;

create policy certifications_own on certifications
  for all using (owns_candidate(candidate_id))
  with check (owns_candidate(candidate_id));

create policy certifications_hr_read on certifications
  for select using (is_hr_user());

-- İl/ilçe: giriş yapmış herkes okur, yazma yok (referans verisi, migration/seed ile yönetilir)
create policy provinces_read on provinces
  for select using (auth.role() = 'authenticated');

create policy districts_read on districts
  for select using (auth.role() = 'authenticated');

create index idx_districts_province on districts(province_code);
create index idx_candidates_province on candidates(province_code);
create index idx_candidates_district on candidates(district_code);
create index idx_certifications_candidate on certifications(candidate_id);
