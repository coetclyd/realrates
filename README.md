# RealRates

Anonymous HGV driver pay rates + take-home calculator. Next.js 16 on Vercel, Supabase for database and email logins.

## Deploy (about 20 minutes, all free tiers)

### 1. Supabase project and database
1. Go to https://supabase.com/dashboard/projects and click **New project**. Region: **London (eu-west-2)**. Save the database password somewhere safe.
2. When it's ready, open **SQL Editor** (left menu) > **New query**, paste the whole of `supabase/schema.sql`, click **Run**. You should see "Success. No rows returned".
3. Go to **Project Settings > API Keys** (or **Data API**) and copy the **Project URL** and the **publishable** key (or `anon` public key).

### 2. Put the code on GitHub
1. Go to https://github.com/new, name it `realrates`, set it **Private**, click **Create repository**.
2. On the next page click **uploading an existing file**, drag in everything inside the unzipped `realrates` folder (not the folder itself), and click **Commit changes**.

### 3. Deploy on Vercel
1. Go to https://vercel.com/new and import the `realrates` repo.
2. Before clicking Deploy, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL from step 1
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = publishable/anon key from step 1
   - `NEXT_PUBLIC_SITE_URL` = your Vercel URL for now (e.g. `https://realrates.vercel.app`), change to your domain later
   - `NEXT_PUBLIC_SITE_NAME` = `RealRates` (or your chosen name)
   - `NEXT_PUBLIC_CONTACT_EMAIL` = an email for complaints
   - `NEXT_PUBLIC_OPERATOR_NAME` = your business or trading name (shown on Privacy and Terms)
3. Click **Deploy**.

### 4. Point Supabase logins at the site
In Supabase: **Authentication > URL Configuration**
- **Site URL**: your live site URL
- **Redirect URLs**: add `https://YOUR-SITE/auth/callback` (and `http://localhost:3000/auth/callback` for local testing)

### 5. Make yourself admin
1. On your live site, go to `/admin` and sign in with your email (magic link).
2. The page shows a SQL line. Run it in Supabase **SQL Editor**, then refresh `/admin`.

### 6. Before launch
- Supabase's built-in email sender is rate-limited (a few emails per hour). Before posting in driver groups, set up custom SMTP (free with Resend: https://resend.com) under **Authentication > Emails > SMTP Settings**.
- Read Privacy and Terms (`app/privacy`, `app/terms`) and adjust to suit you. They're a sensible starting point, not legal advice.
- Each April, check figures in `lib/tax-config.js` against GOV.UK.

## How it protects drivers
- Raw reports are never readable publicly (row-level security). Pages only get aggregates via database functions.
- A company's figures appear only once it has 3+ reports; breakdown rows also need 3+.
- Only month/year worked is stored. Emails are never shown.
- Comments and new company names wait for admin approval; comments with phone numbers, emails, likely personal names or profanity are flagged.
- Limits: 5 rate reports and 3 new company names per user per day.

## Local development
```
cp .env.example .env.local   # fill in values
npm install
npm run dev                  # http://localhost:3000
npm test                     # calculator tests
```
