import { NextResponse } from "next/server";
import { syncGoogleSheet } from "@/lib/google-sheets";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const botToken = process.env.TELEGRAM_BOT_TOKEN;

async function telegram(chatId: number, text: string) {
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) });
}

function headers() { return { apikey: serviceKey ?? "", Authorization: `Bearer ${serviceKey ?? ""}`, "Content-Type": "application/json" }; }

export async function GET() { return NextResponse.json({ ok: true, service: "Friends Included Telegram bot" }); }

export async function POST(request: Request) {
  const update = await request.json() as { message?: { chat?: { id?: number }; from?: { id?: number }; text?: string } };
  const chatId = update.message?.chat?.id; const userId = update.message?.from?.id; const text = update.message?.text?.trim();
  if (!chatId || !userId || !text || !url || !serviceKey || !botToken) return NextResponse.json({ ok: true });
  if (text === "/start") { await telegram(chatId, `Friends Included Finance is ready. Your Telegram user ID is ${userId}. Ask the manager to link this ID to your fictional employee before submitting a transaction.`); return NextResponse.json({ ok: true }); }
  const employeeResponse = await fetch(`${url}/rest/v1/employees?telegram_user_id=eq.${userId}&select=id,name,role`, { headers: headers() });
  const employees = await employeeResponse.json() as Array<{ id: string; name: string; role: string }>;
  const employee = employees[0];
  if (!employee) { await telegram(chatId, `Your Telegram ID ${userId} is not linked to an employee. Ask Svetlana to link it in Manager setup.`); return NextResponse.json({ ok: true }); }
  await fetch(`${url}/rest/v1/employees?id=eq.${employee.id}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ telegram_chat_id: chatId }) });
  if (text.startsWith("/sale ")) {
    if (employee.role !== "salesperson") { await telegram(chatId, "Only salespeople can submit a sale."); return NextResponse.json({ ok: true }); }
    const [reference, customer, project, description, amount, richard, anastasia, jeanClaude] = text.slice(6).split(";").map((value) => value.trim());
    const shares = [Number(richard), Number(anastasia), Number(jeanClaude)];
    if (!reference || !customer || !["A", "B"].includes(project) || !description || Number(amount) <= 0 || shares.some((share) => share < 0 || share > 100) || shares.reduce((sum, share) => sum + share, 0) !== 100) { await telegram(chatId, "Use: /sale REF;Customer;A or B;Description;Amount;Richard%;Anastasia%;Jean-Claude% — shares must total 100."); return NextResponse.json({ ok: true }); }
    const response = await fetch(`${url}/rest/v1/sales`, { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify({ reference: reference.toUpperCase(), salesperson_id: employee.id, customer, project, description, amount: Number(amount), proposed_richard_percent: shares[0], proposed_anastasia_percent: shares[1], proposed_jean_claude_percent: shares[2], telegram_chat_id: chatId, sync_status: "synced", notification_status: "sent" }) });
    if (response.ok) { const saved = (await response.json() as Record<string, unknown>[])[0]; if (saved) await syncGoogleSheet("Sales", saved); }
    await telegram(chatId, response.ok ? `${reference.toUpperCase()} recorded: €${Number(amount).toFixed(2)}, Project ${project}, Pending approval.` : "The sale was not saved. Check the reference is unique and try again."); return NextResponse.json({ ok: true });
  }
  if (text.startsWith("/expense ")) {
    if (employee.role !== "expense_reporter") { await telegram(chatId, "Only Kevin can submit an expense."); return NextResponse.json({ ok: true }); }
    const [reference, description, category, amount, allocation] = text.slice(9).split(";").map((value) => value.trim());
    if (!reference || !description || !["Materials", "Travel", "Other"].includes(category) || Number(amount) <= 0 || !["A", "B", "Company overhead"].includes(allocation)) { await telegram(chatId, "Use: /expense REF;Description;Materials, Travel or Other;Amount;A, B or Company overhead."); return NextResponse.json({ ok: true }); }
    const overhead = allocation === "Company overhead";
    const response = await fetch(`${url}/rest/v1/expenses`, { method: "POST", headers: { ...headers(), Prefer: "return=representation" }, body: JSON.stringify({ reference: reference.toUpperCase(), reporter_id: employee.id, description, category, amount: Number(amount), proposed_allocation: allocation, final_allocation: overhead ? allocation : null, status: overhead ? "allocated" : "awaiting_allocation", telegram_chat_id: chatId, sync_status: "synced", notification_status: "sent" }) });
    if (response.ok) { const saved = (await response.json() as Record<string, unknown>[])[0]; if (saved) await syncGoogleSheet("Expenses", saved); }
    await telegram(chatId, response.ok ? `${reference.toUpperCase()} recorded: €${Number(amount).toFixed(2)}, proposed allocation ${allocation}, ${overhead ? "allocated automatically" : "Awaiting allocation"}.` : "The expense was not saved. Check the reference is unique and try again."); return NextResponse.json({ ok: true });
  }
  await telegram(chatId, `Commands: /sale REF;Customer;A or B;Description;Amount;Richard%;Anastasia%;Jean-Claude% or /expense REF;Description;Materials, Travel or Other;Amount;A, B or Company overhead. Your role is currently ${employee.role}.`);
  return NextResponse.json({ ok: true });
}
