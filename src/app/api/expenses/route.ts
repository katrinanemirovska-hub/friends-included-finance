import { NextResponse } from "next/server";
import { syncGoogleSheet } from "@/lib/google-sheets";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  if (!url || !serviceKey) return NextResponse.json({ error: "Server connection is not configured." }, { status: 503 });
  const body = await request.json() as Record<string, unknown>;
  const allocation = String(body.allocation ?? "");
  if (!body.employeeId || !String(body.reference ?? "").trim() || !String(body.description ?? "").trim() || !["Materials", "Travel", "Other"].includes(String(body.category)) || !["A", "B", "Company overhead"].includes(allocation) || Number(body.amount) <= 0) return NextResponse.json({ error: "Complete every field and use an amount greater than zero." }, { status: 400 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const employees = await (await fetch(`${url}/rest/v1/employees?id=eq.${body.employeeId}&select=role`, { headers })).json() as Array<{ role: string }>;
  if (employees[0]?.role !== "expense_reporter") return NextResponse.json({ error: "Only Kevin can submit an expense." }, { status: 403 });
  const overhead = allocation === "Company overhead";
  const response = await fetch(`${url}/rest/v1/expenses`, { method: "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ reference: String(body.reference).trim().toUpperCase(), reporter_id: body.employeeId, description: String(body.description).trim(), category: body.category, amount: Number(body.amount), proposed_allocation: allocation, final_allocation: overhead ? allocation : null, status: overhead ? "allocated" : "awaiting_allocation" }) });
  if (response.ok) { const saved = (await response.json() as Record<string, unknown>[])[0]; if (saved) await syncGoogleSheet("Expenses", saved); return NextResponse.json({ message: `${String(body.reference).trim().toUpperCase()} saved successfully.` }); }
  return NextResponse.json({ error: "The expense was not saved. The reference may already exist." }, { status: 400 });
}
