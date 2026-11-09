# Connect TexFlow to Supabase

## Existing project
The TexFlow Supabase project is already created and connected:
- Project: `Texflow`
- Project ref: `mqujkkdiopiakffnyenu`
- Region: Sydney (`ap-southeast-2`)
- Database: PostgreSQL 17

Do not create a second project for this repository.

## Database
The schema and migrations are stored in `supabase/schema.sql` and `supabase/migrations/`. They create organization, profile, membership, factory, customer, job-order, production, dispatch, and expense tables. Row Level Security is enabled on every business table. Authorization helpers are in a non-exposed `private` schema.

The initial schema has already been applied to the connected TexFlow Supabase project. Do not run the initial migration again manually.

## Browser credentials
In Supabase, open **Project Settings → API Keys** (or **Project Settings → API**).
Copy:
- Project URL: `https://mqujkkdiopiakffnyenu.supabase.co`
- Publishable key (recommended; starts with `sb_publishable_`)

Only the publishable key belongs in the browser app. A legacy anon key is also supported. **Never put a service_role/secret key or database password in Vite variables, GitHub, or frontend code.**

## Local development
1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` to the project URL above.
3. Set `VITE_SUPABASE_PUBLISHABLE_KEY` to the publishable key from Supabase.
4. Restart the Vite development server.

## Deployment
Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as environment variables in the hosting provider, then redeploy. Never commit `.env.local`.

## Application implementation status
- Supabase typed client and project configuration: implemented.
- Email/password sign-up and sign-in: implemented.
- Password-reset email request: implemented.
- Profile upsert after sign-in: implemented.
- Company/organization onboarding: implemented.
- First factory registration: implemented.
- Company and factory selection: implemented.
- Dashboard reads today's job-order, production, completed-order, and expense totals from Supabase.
- Production, customer, job-order, dispatch, and expense entry screens are still planned next steps. The dashboard shows live database totals, which will remain zero until actual records are entered.

The GitHub Actions production build passed after the authentication and onboarding changes. The app still needs the two Vite environment variables in the local or hosting environment before it can connect at runtime.
