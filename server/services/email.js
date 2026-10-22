import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const outboxDirectory = fileURLToPath(new URL("../local-mail/outbox/", import.meta.url));
const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
}[char]));

// Keep all outgoing mail on this computer. No SMTP account or mail server is used.
export const sendVerificationEmail = async (to, subject, body) => {
  await mkdir(outboxDirectory, { recursive: true });
  const filename = `${Date.now()}-${randomUUID()}.html`;
  const document = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title><style>body{font:14px Arial,sans-serif;max-width:760px;margin:32px auto;color:#172033}header{padding:16px;background:#eef5f2;border-radius:8px;margin-bottom:24px}header p{margin:4px 0}</style></head><body><header><p><b>To:</b> ${escapeHtml(to)}</p><p><b>Subject:</b> ${escapeHtml(subject)}</p><p><b>Saved:</b> ${new Date().toLocaleString()}</p></header>${body}</body></html>`;
  await writeFile(path.join(outboxDirectory, filename), document, { flag: "wx" });
  return { filename };
};

export const sendClaimStatusEmail = sendVerificationEmail;
