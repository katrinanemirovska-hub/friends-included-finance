import { NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  if (!url || !serviceKey) return NextResponse.json({ error: "Server connection is not configured yet." }, { status: 503 });
  const body = await request.json() as Record<string, unknown>;
  const shares = [Number(body.richardPercent), Number(body.anastasiaPercent), Number(body.jeanClaudePercent)];
  if (!body.employeeId || !String(body.reference ?? "").trim() || !String(body.customer ?? "").trim() || !String(body.description ?? "").trim() || !["A", "B"].includes(String(body.project)) || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) return NextResponse.json({ error: "Complete every field and use an amount greater than zero." }, { status: 400 });
  if (shares.some((share) => share < 0 || share > 100) || Math.abs(shares.reduce((sum, share) => sum + share, 0) - 100) > 0.001) return NextResponse.json({ error: "Commission shares must total exactly 100%." }, { status: 400 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const employeeResponse = await fetch(`${url}/rest/v1/employees?id=eq.${body.employeeId}&select=role`, { headers });
  const employees = await employeeResponse.json() as Array<{ role: string }>;
  if (!employeeResponse.ok || employees[0]?.role !== "salesperson") return NextResponse.json({ error: "Only a salesperson may submit a sale." }, { status: 403 });
  const saleResponse = await fetch(`${url}/rest/v1/sales`, { method: "POST", headers, body: JSON.stringify({ reference: String(body.reference).trim().toUpperCase(), salesperson_id: body.employeeId, customer: String(body.customer).trim(), project: body.project, description: String(body.description).trim(), amount: Number(body.amount), proposed_richard_percent: shares[0], proposed_anastasia_percent: shares[1], proposed_jean_claude_percent: shares[2] }) });
  if (saleResponse.ok) return NextResponse.json({ message: `${String(body.reference).trim().toUpperCase()} saved as Pending approval.` });
  const detail = await saleResponse.json() as { message?: string };
  if (detail.message?.includes("duplicate key")) return NextResponse.json({ error: "This reference already exists. Use a unique reference." }, { status: 409 });
  return NextResponse.json({ error: "The sale could not be saved. Please try again." }, { status: 500 });
}
