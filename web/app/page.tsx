/**
 * Root route — handled entirely server-side.
 *
 * The proxy (proxy.ts) already redirects `/` to either `/login` or
 * `/dashboard` before this component ever runs. This server component is a
 * safety-net fallback so that even without proxy route handling (e.g. direct SSR hit)
 * the user is redirected instantly without any client-side spinner.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();

  // Reads session from the request cookie — no network call, instant.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  }

  redirect('/login');
}
