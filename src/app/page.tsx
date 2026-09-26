import { DemoDashboard } from "@/components/demo-dashboard";
import { readSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export type Employee = { id: string; name: string; role: "manager" | "salesperson" | "expense_reporter"; };
type Sale = { project: "A" | "B"; amount: number; status: string; approved_richard_percent: number | null; approved_anastasia_percent: number | null; approved_jean_claude_percent: number | null; };
type Expense = { amount: number; status: string; final_allocation: string | null; };

export default async function Home() {
  let staff: Employee[] = [];
  let sales: Sale[] = []; let expenses: Expense[] = [];
  try { [staff, sales, expenses] = await Promise.all([readSupabase<Employee>("employees"), readSupabase<Sale>("sales"), readSupabase<Expense>("expenses")]); } catch { /* configured later if needed */ }
  const approved = sales.filter((sale) => sale.status === "approved");
  const income = (project?: "A" | "B") => approved.filter((sale) => !project || sale.project === project).reduce((sum, sale) => sum + Number(sale.amount), 0);
  const commission = (project?: "A" | "B") => approved.filter((sale) => !project || sale.project === project).reduce((sum, sale) => sum + Number(sale.amount) * 0.1, 0);
  const expense = (allocation: string) => expenses.filter((item) => item.final_allocation === allocation).reduce((sum, item) => sum + Number(item.amount), 0);
  return <DemoDashboard staff={staff} stats={{ projectA: income("A") - commission("A") - expense("A"), projectB: income("B") - commission("B") - expense("B"), company: income() - commission() - expenses.reduce((sum, item) => sum + Number(item.amount), 0) }} />;
}
