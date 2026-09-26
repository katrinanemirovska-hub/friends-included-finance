import { createSign } from "node:crypto";

type SheetKind = "Sales" | "Expenses";
type RecordValue = Record<string, unknown>;

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const encodedServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function serviceAccount() {
  if (!encodedServiceAccount) return null;
  try {
    return JSON.parse(Buffer.from(encodedServiceAccount, "base64").toString("utf8")) as { client_email: string; private_key: string };
  } catch {
    throw new Error("Google Sheets service account setting is not valid Base64 JSON.");
  }
}

async function accessToken() {
  const account = serviceAccount();
  if (!account) return null;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(account.private_key, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  if (!response.ok) throw new Error(`Google authorization failed (${response.status}).`);
  return (await response.json() as { access_token: string }).access_token;
}

const salesHeaders = ["reference", "salesperson_id", "customer", "project", "description", "amount", "proposed_richard_percent", "proposed_anastasia_percent", "proposed_jean_claude_percent", "status", "approved_richard_percent", "approved_anastasia_percent", "approved_jean_claude_percent", "submitted_at", "approved_at"];
const expenseHeaders = ["reference", "reporter_id", "description", "category", "amount", "proposed_allocation", "final_allocation", "status", "submitted_at", "allocated_at"];

function valuesFor(row: RecordValue, headers: string[]) {
  return headers.map((header) => row[header] == null ? "" : String(row[header]));
}

/** Upserts a single business record by its reference. It never deletes Sheets rows. */
export async function syncGoogleSheet(kind: SheetKind, row: RecordValue) {
  if (!spreadsheetId || !encodedServiceAccount) return false;
  const token = await accessToken();
  if (!token) return false;
  const headers = kind === "Sales" ? salesHeaders : expenseHeaders;
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values`;
  const encodedSheet = encodeURIComponent(`${kind}!A:O`);
  const current = await fetch(`${base}/${encodedSheet}`, { headers: auth });
  if (!current.ok) throw new Error(`Google Sheets could not be read (${current.status}).`);
  const rows = (await current.json() as { values?: string[][] }).values ?? [];
  const expectedHeader = headers;
  let table = rows;
  if (!table.length) {
    const initialise = await fetch(`${base}/${encodeURIComponent(`${kind}!A1`)}?valueInputOption=RAW`, { method: "PUT", headers: auth, body: JSON.stringify({ values: [expectedHeader] }) });
    if (!initialise.ok) throw new Error(`Google Sheets headers could not be created (${initialise.status}).`);
    table = [expectedHeader];
  }
  const rowNumber = table.findIndex((item, index) => index > 0 && item[0] === String(row.reference));
  const values = [valuesFor(row, headers)];
  if (rowNumber > 0) {
    const update = await fetch(`${base}/${encodeURIComponent(`${kind}!A${rowNumber + 1}`)}?valueInputOption=RAW`, { method: "PUT", headers: auth, body: JSON.stringify({ values }) });
    if (!update.ok) throw new Error(`Google Sheets row could not be updated (${update.status}).`);
  } else {
    const append = await fetch(`${base}/${encodeURIComponent(`${kind}!A:O`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", headers: auth, body: JSON.stringify({ values }) });
    if (!append.ok) throw new Error(`Google Sheets row could not be added (${append.status}).`);
  }
  return true;
}
