-- Yardımcı: kullanıcı İK mi?
create or replace function is_hr_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from hr_users where id = auth.uid());
$$;

-- Yardımcı: bu aday kaydı bana mı ait?
create or replace function owns_candidate(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from candidates
    where id = cid and auth_user_id = auth.uid()
  );
$$;

alter table hr_users enable row level security;
alter table candidates enable row level security;
alter table consents enable row level security;
alter table candidate_documents enable row level security;
alter table candidate_profiles enable row level security;
alter table experiences enable row level security;
alter table educations enable row level security;
alter table skills enable row level security;
alter table skill_aliases enable row level security;
alter table candidate_skills enable row level security;
alter table candidate_languages enable row level security;
alter table positions enable row level security;
alter table position_requirements enable row level security;
alter table position_languages enable row level security;
alter table match_scores enable row level security;
alter table audit_log enable row level security;

create policy hr_read_self on hr_users
  for select using (id = auth.uid());

create policy candidates_own on candidates
  for all using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy candidates_hr_read on candidates
  for select using (is_hr_user());

create policy candidates_hr_update on candidates
  for update using (is_hr_user());

create policy consents_own on consents
  for all using (owns_candidate(candidate_id))
  with check (owns_candidate(candidate_id));

create policy consents_hr_read on consents
  for select using (is_hr_user());

create policy documents_own on candidate_documents
  for all using (owns_candidate(candidate_id))
  with check (owns_candidate(candidate_id));

create policy documents_hr_read on candidate_documents
  for select using (is_hr_user());

create policy profiles_own on candidate_profiles
  for all using (owns_candidate(candidate_id))
  with check (owns_candidate(candidate_id));

create policy profiles_hr_read on candidate_profiles
  for select using (is_hr_user());

create policy experiences_own on experiences
  for all using (owns_candidate(candidate_id))
  with check (owns_candidate(candidate_id));

create policy experiences_hr_read on experiences
  for select using (is_hr_user());

create policy educations_own on educations
  for all using (owns_candidate(candidate_id))
  with check (owns_candidate(candidate_id));

create policy educations_hr_read on educations
  for select using (is_hr_user());

create policy cskills_own on candidate_skills
  for all using (owns_candidate(candidate_id))
  with check (owns_candidate(candidate_id));

create policy cskills_hr_read on candidate_skills
  for select using (is_hr_user());

create policy clang_own on candidate_languages
  for all using (owns_candidate(candidate_id))
  with check (owns_candidate(candidate_id));

create policy clang_hr_read on candidate_languages
  for select using (is_hr_user());

-- Taksonomi: giriş yapmış herkes okuyabilir, sadece İK yazar
create policy skills_read on skills
  for select using (auth.role() = 'authenticated');
create policy skills_hr_write on skills
  for all using (is_hr_user()) with check (is_hr_user());

create policy aliases_read on skill_aliases
  for select using (auth.role() = 'authenticated');
create policy aliases_hr_write on skill_aliases
  for all using (is_hr_user()) with check (is_hr_user());

-- Pozisyonlar: aktif olanları herkes görür, İK yönetir
create policy positions_public_read on positions
  for select using (is_active or is_hr_user());
create policy positions_hr_write on positions
  for all using (is_hr_user()) with check (is_hr_user());

create policy posreq_read on position_requirements
  for select using (auth.role() = 'authenticated');
create policy posreq_hr_write on position_requirements
  for all using (is_hr_user()) with check (is_hr_user());

create policy poslang_read on position_languages
  for select using (auth.role() = 'authenticated');
create policy poslang_hr_write on position_languages
  for all using (is_hr_user()) with check (is_hr_user());

-- Skorlar: aday kendi skorunu görür, yazamaz
create policy scores_own_read on match_scores
  for select using (owns_candidate(candidate_id));
create policy scores_hr_read on match_scores
  for select using (is_hr_user());

-- Denetim kaydı: sadece admin okur, yazma service_role ile
create policy audit_admin_read on audit_log
  for select using (
    exists (select 1 from hr_users where id = auth.uid() and role = 'admin')
  );