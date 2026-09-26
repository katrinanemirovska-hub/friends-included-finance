import { NextResponse } from "next/server";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export async function POST(request: Request) {
  if (!url || !serviceKey) return NextResponse.json({ error: "Server connection is not configured." }, { status: 503 });
  const body = await request.json() as Record<string, unknown>;
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const manager = await (await fetch(`${url}/rest/v1/employees?id=eq.${body.managerId}&select=role`, { headers })).json() as Array<{ role: string }>;
  if (manager[0]?.role !== "manager") return NextResponse.json({ error: "Only Svetlana can make decisions." }, { status: 403 });
  const reference = String(body.reference ?? "").trim().toUpperCase();
  if (body.type === "sale") { const shares = [Number(body.richard), Number(body.anastasia), Number(body.jeanClaude)]; if (!reference || shares.some((share) => share < 0 || share > 100) || shares.reduce((sum, share) => sum + share, 0) !== 100) return NextResponse.json({ error: "Use a reference and commission shares totalling 100%." }, { status: 400 }); const response = await fetch(`${url}/rest/v1/sales?reference=eq.${reference}&status=eq.pending_approval`, { method: "PATCH", headers, body: JSON.stringify({ status: "approved", approved_richard_percent: shares[0], approved_anastasia_percent: shares[1], approved_jean_claude_percent: shares[2], approved_at: new Date().toISOString() }) }); return response.ok ? NextResponse.json({ message: `${reference} approved.` }) : NextResponse.json({ error: "Sale was not found or is already approved." }, { status: 400 }); }
  if (body.type === "expense") { const allocation = String(body.allocation ?? ""); if (!reference || !["A", "B", "Company overhead"].includes(allocation)) return NextResponse.json({ error: "Use a reference and a valid allocation." }, { status: 400 }); const response = await fetch(`${url}/rest/v1/expenses?reference=eq.${reference}`, { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ status: "allocated", final_allocation: allocation, allocated_at: new Date().toISOString() }) }); const updated = await response.json() as unknown[]; return response.ok && updated.length ? NextResponse.json({ message: `${reference} allocated to ${allocation}.` }) : NextResponse.json({ error: "Expense reference was not found." }, { status: 400 }); }
  return NextResponse.json({ error: "Choose a decision type." }, { status: 400 });
}
