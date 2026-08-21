# Demo form submission tracking

## Goal
Wire the existing demo form on revoo.site so it actually stores submissions, and give the owner a way to see whether any requests arrived.

## What will be built

1. Backend storage
   - Enable Lovable Cloud for the project.
   - Create a `public.demo_submissions` table with columns:
     - `id` (uuid, primary key)
     - `created_at` (timestamptz)
     - `name`, `email`, `property_name`, `country`, `property_type`, `units`, `current_system`, `notes` (text)
     - `lang` (text — `en` or `lt`)
     - `status` (text, default `new`)
   - Add GRANTs and RLS policies so anonymous site visitors can insert, and the project owner can read everything via the Cloud dashboard.

2. Server function
   - Create `src/lib/demo-submissions.functions.ts` with a `createDemoSubmission` server function.
   - Validate input with Zod, trim and cap lengths, then insert into the table.

3. Form wiring
   - Update `src/components/site/DemoForm.tsx` to call the server function on submit.
   - Show loading, error, and success states. Keep the existing success UI.

4. Viewing submissions
   - Submissions will be visible in Cloud → Database → `demo_submissions` table.
   - Optionally, add a lightweight admin page at `/admin/demo-submissions` protected by a simple secret key, so the owner can view the list inside the app without setting up full user authentication.

## Open question
- Should the owner view submissions only in the Cloud database table, or do you also want an in-app `/admin/demo-submissions` page with a secret key? The first is faster; the second is more convenient for day-to-day checks.
