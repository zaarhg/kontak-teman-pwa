// === Apps Script Web App URL ===
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz_9zsZUNdsyXzm5db3yc1_LOjQ-b7BNquVUkzv7dfhiXVsqIGsLTjBiEFkwFp4MbEa/exec";

// === TOKEN API (harus sama dengan config/api_token di Sheet) ===
const API_TOKEN = "KT_2026_02_22__z8Vq2nK9mP7aR4sT1xY6cD0fG3hJ5kL";

// helper: POST form-urlencoded (anti CORS preflight)
async function apiPost(action, payload = {}) {
  const body = new URLSearchParams();
  body.set("action", action);
  body.set("token", API_TOKEN);

  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    body.set(k, String(v));
  });

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body,
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { data = { ok:false, error:"INVALID_JSON", raw:text }; }

  // Optional: auto-throw on unauthorized
  if (res.status === 401 || data.error === "UNAUTHORIZED") {
    return { ok:false, error:"UNAUTHORIZED", message:"Token salah / belum di-set di config." };
  }
  return data;
}

async function apiGetPing() {
  // ping tanpa token boleh (doGet), tapi tidak wajib
  const res = await fetch(SCRIPT_URL);
  return res.json();
}