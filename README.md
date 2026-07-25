# RackDoc — Datacenter Cabinet Documentation

A multi-user SaaS for documenting datacenter cabinets, visualized in interactive 3D.

- **3D cabinet view** (React Three Fiber): 2-post racks and 4-post cabinets, configurable height (48U/45U/42U/36U/24U/… or custom), doors (front/rear/both/open, with an open-door toggle), vertical PDUs (front/rear, one or both sides), power feed from under a raised floor or overhead, and cable entry from the top or bottom — every option is rendered in the scene.
- **Floor plans**: design whole rooms on a 600 mm tile grid. Drag cabinets around a top-down plan (with rotation and collision checks), see the entire floor rendered in 3D with every cabinet's real contents, and double-click any cabinet to open it.
- **2D rack elevation editor**: drag devices into U-slots on the front/rear elevation; collisions and out-of-range placements are rejected. Devices have type, height (U), mounting face and depth (full / 3/4 / 1/2 / short).
- **WYSIWYG notes** (TipTap) on the cabinet and on every device.
- **Teams**: organizations with owner/admin/editor/viewer roles and email invites, enforced end-to-end by Postgres row-level security.
- **Auth**: email + password, Google OAuth, and magic links via Supabase Auth.
- **Export**: Markdown (with ASCII elevation), CSV inventory, and a PDF report with drawn front/rear elevations.

Stack: Next.js (App Router, TypeScript) · Tailwind CSS 4 · React Three Fiber · Supabase (auth + Postgres) · @react-pdf/renderer. Ships as a single Docker container.

---

## 1. Set up Supabase (cloud)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the migrations in order: [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), then [`supabase/migrations/0002_floors.sql`](supabase/migrations/0002_floors.sql). These create all tables, triggers and row-level-security policies. (If you already ran 0001 for v1, just run 0002.)
3. In **Project Settings → API**, copy the *Project URL* and *anon public* key — these are your two environment variables.

### Auth configuration

- **Authentication → URL Configuration**: set *Site URL* to your app's public URL (e.g. `https://rackdoc.example.com`) and add `https://rackdoc.example.com/auth/callback` to *Redirect URLs*. For local dev also add `http://localhost:3000/auth/callback`.
- **Email + password & magic links** work out of the box (Supabase's built-in email service is fine for testing; configure custom SMTP for production volume).
- **Google OAuth**: in [Google Cloud Console](https://console.cloud.google.com/) create an OAuth client (Web application), set the authorized redirect URI to `https://YOUR-PROJECT-ref.supabase.co/auth/v1/callback`, then paste the client ID/secret into **Authentication → Providers → Google** in Supabase.

### Invites

Invites are stored in the database. An invited teammate who already has an account sees the invite in their sidebar and can accept it; a brand-new user who signs up with the invited email joins the organization automatically. (Supabase does not email the invite for you — tell your teammate to sign up with that address.)

## 2. Run locally

```bash
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm install
npm run dev
```

Open http://localhost:3000.

## 3. Deploy on EasyPanel (VPS)

The repo contains a production `Dockerfile` (Next.js standalone output, ~150 MB image).

1. In EasyPanel, create an **App** service from this Git repository (Build type: *Dockerfile*).
2. Add the two build arguments / environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (They are needed **at build time** — EasyPanel passes environment variables as build args for Dockerfile builds; if you build the image yourself, use `docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=… --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=…`.)
3. Expose port **3000** and attach your domain (EasyPanel provisions HTTPS via Let's Encrypt).
4. Update the Supabase *Site URL* / *Redirect URLs* (step 1) to the final domain.

All application data lives in Supabase — the container is stateless, so redeploys and restarts are safe.

## Project layout

```
supabase/migrations/    SQL schema + RLS (run in Supabase)
src/middleware.ts       Session refresh + route protection
src/lib/supabase/       Browser/server/middleware Supabase clients
src/lib/types.ts        Domain types, collision rules
src/lib/export/         Markdown/plain-text converters, PDF document
src/app/                Landing, auth, dashboard, cabinet + floor pages, export API
src/components/editor/  CabinetEditor, RackElevation (2D), Rack3D, CabinetModel, panels, notes
src/components/floor/   FloorEditor, FloorPlan2D (top-down), Floor3D (room view)
```

## Roles

| Role | Capabilities |
| --- | --- |
| Owner | Everything, including deleting the organization |
| Admin | Manage members/invites, delete cabinets, all editing |
| Editor | Create/edit cabinets and devices, notes |
| Viewer | Read-only (can still export) |
