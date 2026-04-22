# 💰 Finanças Pessoais

App de controle financeiro pessoal com autenticação e sync via Supabase.

## Setup rápido

### 1. Supabase
- Acesse seu projeto em supabase.com
- Vá em **SQL Editor** e execute o conteúdo de `supabase_setup.sql`
- Em **Authentication > Settings**, desative **"Enable email confirmations"** (opcional, para facilitar o cadastro)

### 2. Rodar localmente
```bash
npm install
npm run dev
```

### 3. Deploy no Vercel
1. Suba esta pasta para um repositório GitHub
2. Acesse vercel.com > New Project > importe o repositório
3. Clique em **Deploy** — pronto!

## Tecnologias
- React + Vite
- Recharts (gráficos)
- Supabase (auth + banco de dados)
- Vercel (hospedagem)
