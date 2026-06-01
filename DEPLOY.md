# Deploying to Vercel (step-by-step, non-technical)

This puts your app on a real, shareable web address — for free. Budget ~15
minutes. You'll do everything in a web browser; no terminal needed.

> Before you start, make sure you've already done the **Supabase** setup in
> `README.md` (created the project, run the 3 migration files, and have your 3
> keys). Vercel needs those same keys.

---

## 1. Merge to your `main` branch
Your code is in a pull request waiting to be merged into `main` (the branch
Vercel will treat as "live / production").

1. Open your repo on GitHub: **github.com/tbirdmane/rapstocks**.
2. Click the **Pull requests** tab → open the PR titled *"v1 foundation"*.
3. Click **Merge pull request** → **Confirm merge**.

That's it — `main` now holds your app.

---

## 2. Import the project into Vercel
1. Go to **vercel.com** and sign in **with GitHub** (top-right → Sign Up / Log
   in → Continue with GitHub). Free "Hobby" plan is all you need.
2. On your dashboard click **Add New… → Project**.
3. Find **rapstocks** in the list and click **Import**.
   - If you don't see it, click **Adjust GitHub App Permissions** and give
     Vercel access to the repo.
4. Vercel auto-detects **Next.js** — leave all the build settings as their
   defaults. **Don't deploy yet** — first add the environment variables below.

---

## 3. Add your environment variables
On the import screen, expand **Environment Variables** and add these five
(name on the left, value on the right). Use the exact same values from your
`.env.local`:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase **service_role** secret key |
| `ADMIN_HANDLES` | your handle (e.g. `tighe`) |
| `NEXT_PUBLIC_SITE_URL` | leave blank for now — you'll fill it in step 5 |

Then click **Deploy**. Wait ~2 minutes for the build to finish. Vercel gives
you a URL like `https://rapstocks-xxxx.vercel.app`. **Copy that URL.**

---

## 4. Tell Supabase about your new web address
Logins won't work until Supabase trusts your Vercel URL.

1. In **Supabase → Authentication → URL Configuration**:
   - **Site URL**: paste your Vercel URL (e.g. `https://rapstocks-xxxx.vercel.app`).
   - **Redirect URLs**: click **Add URL** and add
     `https://rapstocks-xxxx.vercel.app/**` (the `/**` matters).
2. Click **Save**.

> Using Google sign-in? You set that up against Supabase's own callback URL, so
> nothing changes here per-deploy. Email magic links work as soon as the two
> URLs above are saved.

---

## 5. Set NEXT_PUBLIC_SITE_URL and redeploy
1. In **Vercel → your project → Settings → Environment Variables**, edit
   `NEXT_PUBLIC_SITE_URL` and set it to your Vercel URL (no trailing slash),
   e.g. `https://rapstocks-xxxx.vercel.app`.
2. Go to the **Deployments** tab → click the **…** menu on the latest
   deployment → **Redeploy**. (This makes share-card links and icons point at
   your real domain.)

---

## 6. Smoke-test the live app
Open your Vercel URL on your phone and:
- Sign in with the email magic link, pick a handle.
- Buy and sell shares in an artist — watch the price and your balance move.
- Open **Admin** (link at the bottom of Portfolio) and run a settlement.
- Tap **Get my share card** and confirm the image loads.
- In your phone browser's menu, choose **Add to Home Screen** — it installs
  like an app.

You're live. 🎉

---

## From now on: how updates work
Every time new code is merged into `main`, Vercel **automatically rebuilds and
redeploys** — you don't touch anything. Other branches get their own temporary
"preview" link so you can try changes before they go live.

## Custom domain (optional, later)
**Vercel → Settings → Domains → Add** and follow the instructions to point a
domain you own (e.g. from Namecheap/GoDaddy) at the app. Remember to update the
two Supabase URLs (step 4) and `NEXT_PUBLIC_SITE_URL` (step 5) to the new domain.

## Common gotchas
- **"Build failed" on Vercel** → almost always a missing env var. Check all
  five names are spelled exactly as above.
- **Magic link logs you into localhost / "redirect not allowed"** → the
  Supabase Site URL or Redirect URLs (step 4) don't match your Vercel URL.
- **Share card is blank when signed out** → expected; it only fills in once
  you're logged in and own shares.
