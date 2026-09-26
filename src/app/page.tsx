import { DemoDashboard } from "@/components/demo-dashboard";
import { readSupabase } from "@/lib/supabase";

export type Employee = { id: string; name: string; role: "manager" | "salesperson" | "expense_reporter"; };

export default async function Home() {
  let staff: Employee[] = [];
  try { staff = await readSupabase<Employee>("employees"); } catch { /* configured later if needed */ }
  return <DemoDashboard staff={staff} />;
}
