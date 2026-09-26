const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Supabase connection settings are missing.");
}

export async function readSupabase<T>(table: string): Promise<T[]> {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase connection settings are missing.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: serverKey ?? supabasePublishableKey,
      Authorization: `Bearer ${serverKey ?? supabasePublishableKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  return response.json() as Promise<T[]>;
}
