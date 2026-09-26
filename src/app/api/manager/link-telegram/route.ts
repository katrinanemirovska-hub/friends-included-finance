import { NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  if (!url || !serviceKey) return NextResponse.json({ error: "Server connection is not configured." }, { status: 503 });
  const body = await request.json() as { managerId?: string; employeeId?: string; telegramUserId?: string };
  if (!body.managerId || !body.employeeId || !/^\d+$/.test(body.telegramUserId ?? "")) return NextResponse.json({ error: "Choose an employee and enter a numeric Telegram user ID." }, { status: 400 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const managerResponse = await fetch(`${url}/rest/v1/employees?id=eq.${body.managerId}&select=role`, { headers });
  const managers = await managerResponse.json() as Array<{ role: string }>;
  if (managers[0]?.role !== "manager") return NextResponse.json({ error: "Only Svetlana can link Telegram accounts." }, { status: 403 });
  const response = await fetch(`${url}/rest/v1/employees?id=eq.${body.employeeId}`, { method: "PATCH", headers, body: JSON.stringify({ telegram_user_id: Number(body.telegramUserId) }) });
  if (!response.ok) return NextResponse.json({ error: "Could not save this link. This Telegram ID may already be assigned." }, { status: 400 });
  return NextResponse.json({ message: "Telegram user ID linked successfully." });
}
