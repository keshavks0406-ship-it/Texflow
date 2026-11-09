# Connect TexFlow to Supabase

## Existing project
The TexFlow Supabase project is already created and connected:
- Project: `Texflow`
- Region: Sydney (`ap-southeast-2`)
- Database: PostgreSQL 17

Do not create a second project for this repository.

## Database
The initial schema and migrations are stored in `supabase/schema.sql` and `supabase/migrations/`. They create the organization, profile, membership, factory, customer, job-order, production, dispatch, and expense tables. Row Level Security is enabled on every business table. The authorization helpers are in a non-exposed `private` schema.

The migration has already been applied to the connected TexFlow Supabase project. Do not run the initial migration again manually.

## Browser credentials
In Supabase, open **Project Settings → API** (or **Data API / API Keys**).
Copy:
- Project URL
- Publishable key (recommended; starts with `sb_publishable_`)

Only the publishable key belongs in the browser app. A legacy anon key is also supported. **Never put the service_role/secret key or database password in Vite variables, GitHub, or frontend code.**

## Local development
1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` to the TexFlow project URL.
3. Set `VITE_SUPABASE_PUBLISHABLE_KEY` to the project's publishable key.
4. Restart the Vite development server.

## Deployment
Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as environment variables in the hosting provider, then redeploy. Never commit `.env.local` or any secret key.

## Implementation status
The database and typed Supabase client are scaffolded. Authentication UI, organization onboarding, and live factory/customer/job/production/dispatch/expense workflows are the next application-development stages. The dashboard's sample figures remain demo data until those workflows are implemented.
