import { NextResponse } from "next/server";
import { syncGoogleSheet } from "@/lib/google-sheets";
import { readSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

/** Manual repair/backfill endpoint. It upserts rows by reference, so retries do not create duplicates. */
export async function POST() {
  try {
    const [sales, expenses, employees] = await Promise.all([
      readSupabase<Record<string, unknown>>("sales"),
      readSupabase<Record<string, unknown>>("expenses"),
      readSupabase<Record<string, unknown>>("employees"),
    ]);
    const names = new Map(employees.map((employee) => [String(employee.id), String(employee.name)]));
    for (const sale of sales) await syncGoogleSheet("Sales", { ...sale, salesperson_name: names.get(String(sale.salesperson_id)) });
    for (const expense of expenses) await syncGoogleSheet("Expenses", { ...expense, reporter_name: names.get(String(expense.reporter_id)) });
    return NextResponse.json({ message: `Synced ${sales.length} sales and ${expenses.length} expenses.` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Google Sheets synchronisation failed. Check the service-account settings and sharing permission." }, { status: 500 });
  }
}
