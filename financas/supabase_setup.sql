-- Execute no Supabase > SQL Editor

-- 1. Criar tabela de dados do usuário
create table public.user_data (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  data        jsonb default '{}'::jsonb,
  updated_at  timestamptz default now()
);

-- 2. Ativar Row Level Security (cada usuário só vê os próprios dados)
alter table public.user_data enable row level security;

create policy "Usuário acessa apenas seus próprios dados"
  on public.user_data for all
  using (auth.uid() = user_id);

-- 3. Permitir confirmação de e-mail (opcional — desativa se quiser acesso imediato)
-- No Supabase > Authentication > Settings > desative "Enable email confirmations"
