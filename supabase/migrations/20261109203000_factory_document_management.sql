-- Factory-scoped document metadata and private Supabase Storage bucket.
create table if not exists public.factory_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  factory_id uuid not null,
  document_title text not null,
  document_category text not null default 'General',
  document_number text,
  issue_date date,
  expiry_date date,
  storage_path text not null unique,
  original_file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  notes text,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint factory_documents_factory_scope_fk
    foreign key (factory_id, organization_id)
    references public.factories (id, organization_id) on delete cascade
);

create index if not exists factory_documents_scope_expiry_idx
  on public.factory_documents (organization_id, factory_id, expiry_date);
create index if not exists factory_documents_scope_category_idx
  on public.factory_documents (organization_id, factory_id, document_category);

alter table public.factory_documents enable row level security;
create policy "Members manage factory documents"
  on public.factory_documents for all to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));
grant select, insert, update, delete on public.factory_documents to authenticated;
revoke all on public.factory_documents from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('factory-documents','factory-documents',false,20971520,array[
'application/pdf','image/jpeg','image/png','image/webp',
'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain'
])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "Factory members read factory documents" on storage.objects
for select to authenticated using (
 bucket_id='factory-documents' and exists (
  select 1 from public.factories f
  where f.id::text=(storage.foldername(name))[2]
    and f.organization_id::text=(storage.foldername(name))[1]
    and private.is_org_member(f.organization_id)
 )
);
create policy "Factory members upload factory documents" on storage.objects
for insert to authenticated with check (
 bucket_id='factory-documents' and exists (
  select 1 from public.factories f
  where f.id::text=(storage.foldername(name))[2]
    and f.organization_id::text=(storage.foldername(name))[1]
    and private.is_org_member(f.organization_id)
 )
);
create policy "Factory members update factory documents" on storage.objects
for update to authenticated using (
 bucket_id='factory-documents' and exists (
  select 1 from public.factories f
  where f.id::text=(storage.foldername(name))[2]
    and f.organization_id::text=(storage.foldername(name))[1]
    and private.is_org_member(f.organization_id)
 )
) with check (
 bucket_id='factory-documents' and exists (
  select 1 from public.factories f
  where f.id::text=(storage.foldername(name))[2]
    and f.organization_id::text=(storage.foldername(name))[1]
    and private.is_org_member(f.organization_id)
 )
);
create policy "Factory members delete factory documents" on storage.objects
for delete to authenticated using (
 bucket_id='factory-documents' and exists (
  select 1 from public.factories f
  where f.id::text=(storage.foldername(name))[2]
    and f.organization_id::text=(storage.foldername(name))[1]
    and private.is_org_member(f.organization_id)
 )
);
