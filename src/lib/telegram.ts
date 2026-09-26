export async function sendTelegram(chatId: number | null | undefined, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return { sent: false, reason: "No Telegram recipient linked." };
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) });
  return response.ok ? { sent: true } : { sent: false, reason: "Telegram delivery failed." };
}
