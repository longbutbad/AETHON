import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookiesToSet = { name: string; value: string; options: CookieOptions }[];

/**
 * Server-side Supabase client for Server Components, Route Handlers and Server
 * Actions. Bound to the request's cookies so it can read the signed-in user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component. This can be
            // ignored if middleware is refreshing user sessions (it is — see
            // src/middleware.ts).
          }
        },
      },
    },
  );
}
