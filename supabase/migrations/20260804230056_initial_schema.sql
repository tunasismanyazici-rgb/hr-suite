

-- İK kullanıcıları
create table hr_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'recruiter' check (role in ('recruiter','admin')),
  created_at timestamptz not null default now()
);

-- Adaylar
create table candidates (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text,
  phone text,
  city text,
  status text not null default 'draft'
    check (status in ('draft','processing','needs_review','verified','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retention_until date
);

-- KVKK rızaları
create table consents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  consent_type text not null check (consent_type in ('aydinlatma','acik_riza','aday_havuzu')),
  document_version text not null,
  granted boolean not null,
  granted_at timestamptz not null default now(),
  ip_address inet
);

-- Yüklenen belgeler
create table candidate_documents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes integer not null,
  source_type text not null default 'unknown'
    check (source_type in ('digital_pdf','scanned_pdf','image','docx','unknown')),
  ocr_status text not null default 'pending'
    check (ocr_status in ('pending','processing','completed','failed')),
  raw_text text,
  ocr_confidence numeric(5,2),
  error_message text,
  created_at timestamptz not null default now()
);

-- Yapılandırılmış profil
create table candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references candidates(id) on delete cascade,
  document_id uuid references candidate_documents(id) on delete set null,
  summary text,
  total_experience_years numeric(4,1),
  raw_extraction jsonb,
  field_confidence jsonb,
  extraction_model text,
  verified_by_candidate boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table experiences (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  company_name text,
  title text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  sort_order integer not null default 0
);

create table educations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  institution text,
  degree_level text check (degree_level in
    ('lise','onlisans','lisans','yuksek_lisans','doktora','diger')),
  field_of_study text,
  start_year integer,
  end_year integer
);

-- Yetkinlik taksonomisi
create table skills (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  name_tr text,
  category text,
  esco_uri text
);

create table skill_aliases (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references skills(id) on delete cascade,
  alias text not null,
  unique (alias)
);

create table candidate_skills (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  years_experience numeric(4,1),
  proficiency text check (proficiency in ('beginner','intermediate','advanced','expert')),
  evidence_snippet text,
  unique (candidate_id, skill_id)
);

create table candidate_languages (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  language_code text not null,
  cefr_level text check (cefr_level in ('A1','A2','B1','B2','C1','C2','native')),
  unique (candidate_id, language_code)
);

-- Pozisyonlar
create table positions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text,
  description text,
  city text,
  work_mode text check (work_mode in ('onsite','hybrid','remote')),
  min_experience_years numeric(4,1),
  max_experience_years numeric(4,1),
  min_degree_level text,
  is_active boolean not null default true,
  created_by uuid references hr_users(id),
  created_at timestamptz not null default now()
);

create table position_requirements (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references positions(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  is_must_have boolean not null default false,
  weight numeric(4,2) not null default 1.0,
  min_years numeric(4,1),
  unique (position_id, skill_id)
);

create table position_languages (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references positions(id) on delete cascade,
  language_code text not null,
  min_cefr_level text,
  is_must_have boolean not null default false,
  unique (position_id, language_code)
);

-- Eşleştirme skorları
create table match_scores (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  position_id uuid not null references positions(id) on delete cascade,
  total_score numeric(5,2) not null,
  breakdown jsonb not null,
  hard_filter_passed boolean not null default true,
  hard_filter_reasons text[],
  llm_adjustment numeric(4,2) default 0,
  llm_rationale text,
  engine_version text not null,
  computed_at timestamptz not null default now(),
  unique (candidate_id, position_id, engine_version)
);

-- Denetim kaydı
create table audit_log (
  id bigserial primary key,
  actor_id uuid,
  actor_type text not null default 'system',
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_candidates_status on candidates(status);
create index idx_candidates_auth_user on candidates(auth_user_id);
create index idx_documents_candidate on candidate_documents(candidate_id);
create index idx_candidate_skills_skill on candidate_skills(skill_id);
create index idx_match_scores_position on match_scores(position_id, total_score desc);
create index idx_audit_entity on audit_log(entity_type, entity_id);