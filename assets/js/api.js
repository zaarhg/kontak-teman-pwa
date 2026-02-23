const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxWhw3CkwTu5YuD09QDhKXJ3EO8nrkzbmie6wwT5VWOR_k9-XUr_Zppt6Qz8OZOoVz8/exec";
const API_TOKEN = "KT_2026_02_22__z8Vq2nK9mP7aR4sT1xY6cD0fG3hJ5kL";
const API_TIMEOUT_MS = 30000;

function getScriptUrl() {
  const custom = (localStorage.getItem("script_url") || "").trim();
  return custom || SCRIPT_URL;
}

function getApiToken() {
  const custom = (localStorage.getItem("api_token") || "").trim();
  return custom || API_TOKEN;
}

function normalizeApiResponse(data, meta = {}) {
  if (data && typeof data === "object" && "ok" in data) {
    if (data.ok === false && !data.message && typeof data.error === "string") {
      data.message = data.error;
    }
    return data;
  }

  return {
    ok: false,
    error: "INVALID_RESPONSE",
    message: "Format respons server tidak dikenali.",
    data,
    meta
  };
}

function parseJsonSafe(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
}

function looksLikeHtml(text) {
  const s = String(text || "").trim().toLowerCase();
  return s.startsWith("<!doctype html") || s.startsWith("<html") || s.includes("<body");
}

function cutText(text, max = 300) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "..." : s;
}

function timeoutSignal(ms = API_TIMEOUT_MS) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  return null;
}

async function apiPost(action, payload = {}) {
  const body = new URLSearchParams();
  body.set("action", action);
  body.set("token", getApiToken());
  body.set("session_token", localStorage.getItem("session_token") || "");

  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    body.set(k, String(v));
  });

  let res;
  let text = "";

  try {
    const signal = timeoutSignal(API_TIMEOUT_MS);
    res = await fetch(getScriptUrl(), {
      method: "POST",
      body,
      cache: "no-store",
      signal: signal || undefined
    });
    text = await res.text();
  } catch (e) {
    const msg = String(e?.message || e || "Network error");
    if (/aborted|timeout/i.test(msg)) {
      return {
        ok: false,
        error: "TIMEOUT",
        message: "Request timeout. Coba lagi."
      };
    }
    return {
      ok: false,
      error: "NETWORK_ERROR",
      message: "Tidak bisa terhubung ke server.",
      detail: msg
    };
  }

  const parsed = parseJsonSafe(text);

  if (!parsed.ok) {
    if (res.status === 401) {
      return {
        ok: false,
        error: "UNAUTHORIZED",
        message: "Unauthorized."
      };
    }

    if (looksLikeHtml(text)) {
      return {
        ok: false,
        error: "INVALID_JSON",
        message: "Server mengembalikan HTML, bukan JSON.",
        status: res.status,
        raw_preview: cutText(text)
      };
    }

    return {
      ok: false,
      error: "INVALID_JSON",
      message: "Respons server bukan JSON yang valid.",
      status: res.status,
      raw_preview: cutText(text)
    };
  }

  const data = normalizeApiResponse(parsed.value, { status: res.status });

  if (res.status === 401 || data.error === "UNAUTHORIZED") {
    return {
      ok: false,
      error: "UNAUTHORIZED",
      message: data.message || "Sesi habis / token salah."
    };
  }

  if (!res.ok && data.ok !== true) {
    return {
      ...data,
      ok: false,
      status: res.status,
      message: data.message || `HTTP ${res.status}`
    };
  }

  return data;
}

async function apiGetPing() {
  let res;
  let text = "";

  try {
    const signal = timeoutSignal(15000);
    res = await fetch(getScriptUrl(), {
      method: "GET",
      cache: "no-store",
      signal: signal || undefined
    });
    text = await res.text();
  } catch (e) {
    return {
      ok: false,
      error: "NETWORK_ERROR",
      message: String(e?.message || e || "Network error")
    };
  }

  const parsed = parseJsonSafe(text);
  if (!parsed.ok) {
    return {
      ok: false,
      error: "INVALID_JSON",
      status: res.status,
      raw_preview: cutText(text)
    };
  }

  return normalizeApiResponse(parsed.value, { status: res.status });
}