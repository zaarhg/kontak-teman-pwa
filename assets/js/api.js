// === Apps Script Web App URL ===
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxWhw3CkwTu5YuD09QDhKXJ3EO8nrkzbmie6wwT5VWOR_k9-XUr_Zppt6Qz8OZOoVz8/exec";

// === TOKEN API (harus sama dengan config/api_token di Sheet) ===
const API_TOKEN = "KT_2026_02_22__z8Vq2nK9mP7aR4sT1xY6cD0fG3hJ5kL";

// helper: POST form-urlencoded (anti CORS preflight)
async function apiPost(action, payload = {}) {
  const body = new URLSearchParams();
  body.set("action", action);
  body.set("token", API_TOKEN);
  body.set("session_token", localStorage.getItem("session_token") || "");

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