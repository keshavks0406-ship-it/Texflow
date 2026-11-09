# Connect TexFlow to Supabase

## 1. Create the Supabase project
1. Open https://supabase.com/dashboard and sign in.
2. Select **New project** and create a project named **TexFlow**.
3. Choose a strong database password and save it securely.
4. Select a region close to your users, such as Mumbai (if available).
5. Wait for the project to finish provisioning.

## 2. Create the database tables
1. Open the TexFlow project in Supabase.
2. Go to **SQL Editor** and create a new query.
3. Copy the complete contents of `supabase/schema.sql` from this repository.
4. Run the SQL.
5. Confirm that the tables appear under **Table Editor**.

The schema enables Row Level Security and scopes factory, customer, job, production, dispatch, and expense records to organization membership. Do not disable RLS.

## 3. Get the browser credentials
In Supabase, open **Project Settings → API** (or **Data API / API Keys**, depending on the dashboard version).
Copy:
- Project URL
- Publishable key (or legacy anon key)

Only the publishable/anon key belongs in the browser app. **Never put the service_role key or database password in Vite variables, GitHub, or frontend code.**

## 4. Configure local development
1. Copy `.env.example` to `.env.local`.
2. Replace the placeholders with your Project URL and publishable/anon key.
3. Restart the Vite dev server.

## 5. Configure deployment
Add these two environment variables to your hosting provider:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then redeploy.

## Current implementation status
The repository currently contains the Supabase client scaffold, TypeScript data interfaces, and initial secure database schema. The dashboard is still a demo; authentication screens and live CRUD workflows are the next implementation step after the project credentials are configured and the schema is run.
