document.addEventListener("DOMContentLoaded", () => {
  injectUxShell_();
  guardLogin_();

  const page = document.body.dataset.page || "";
  if (page === "tambah") initTambah();
  if (page === "daftar") initDaftar();
  if (page === "edit") initEdit();
  if (page === "kop") initKop();
  if (page === "status") initStatus();
  if (page === "login") initLogin();
});

// =========================
// UX SHELL: Toast + Loading
// =========================
function injectUxShell_() {
  // Toast container
  if (!document.querySelector(".toast-wrap")) {
    const wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }

  // Loading overlay
  if (!document.querySelector(".loading-overlay")) {
    const ov = document.createElement("div");
    ov.className = "loading-overlay";
    ov.innerHTML = `
      <div class="loading-box">
        <div class="spinner"></div>
        <div class="loading-text" style="font-size:13px;color:#333;">Memproses...</div>
      </div>
    `;
    document.body.appendChild(ov);
  }
}

function setLoading(isOn, text = "Memproses...") {
  const ov = document.querySelector(".loading-overlay");
  if (!ov) return;
  const t = ov.querySelector(".loading-text");
  if (t) t.textContent = text;

  ov.style.display = isOn ? "flex" : "none";
}

function toast(type, title, msg, ttlMs = 2500) {
  const wrap = document.querySelector(".toast-wrap");
  if (!wrap) return;

  const el = document.createElement("div");
  el.className = `toast ${type || "info"}`;
  el.innerHTML = `
    <div class="badge"></div>
    <div class="msg">
      ${title ? `<div class="title">${esc(title)}</div>` : ""}
      <div>${esc(msg || "")}</div>
    </div>
    <button class="x" aria-label="Close">✕</button>
  `;

  el.querySelector(".x").addEventListener("click", () => el.remove());
  wrap.appendChild(el);

  const timer = setTimeout(() => {
    if (el && el.parentNode) el.remove();
  }, ttlMs);

  // stop auto remove on hover
  el.addEventListener("mouseenter", () => clearTimeout(timer));
}

function info(msg, title = "Info") { toast("info", title, msg); }
function ok(msg, title = "Berhasil") { toast("success", title, msg); }
function warn(msg, title = "Perhatian") { toast("warn", title, msg, 3200); }
function err(msg, title = "Gagal") { toast("error", title, msg, 3800); }

// Wrapper for API calls with UX
async function api(action, payload, loadingText = "Memproses...") {
  try {
    setLoading(true, loadingText);
    const r = await apiPost(action, payload || {});
    setLoading(false);

    if (!r || !r.ok) {
      if (r && r.error === "UNAUTHORIZED") {
        err("Token salah / belum sesuai config. Cek API_TOKEN di api.js", "UNAUTHORIZED");
      } else {
        err((r && (r.error || r.message)) ? String(r.error || r.message) : "Terjadi kesalahan.");
      }
    }
    return r;
  } catch (e) {
    setLoading(false);
    err(String(e?.message || e || "Error"));
    return { ok: false, error: "CLIENT_ERROR", message: String(e?.message || e) };
  }
}

// ---------- UTIL ----------
function $(sel) { return document.querySelector(sel); }

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function getQueryParam(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Resize image before upload to reduce payload
async function resizeImageToDataURL(file, maxSide = 900, quality = 0.75) {
  const imgURL = await readFileAsDataURL(file);

  const img = new Image();
  img.src = imgURL;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let { width, height } = img;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(img, 0, 0, width, height);

  // always output jpeg to reduce size
  return canvas.toDataURL("image/jpeg", quality);
}

// ==================
// PAGE: TAMBAH
// ==================
function initTambah() {
  const form = $("#formTambah");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nama_lengkap = $("#nama_lengkap")?.value.trim() || "";
    const alamat = $("#alamat")?.value.trim() || "";
    const no_hp = $("#no_hp")?.value.trim() || "";
    const email = $("#email")?.value.trim() || "";
    const catatan = $("#catatan")?.value.trim() || "";
    const nama_alias = $("#nama_alias")?.value.trim() || "";
    const instansi_organisasi = $("#instansi_organisasi")?.value.trim() || "";
    const jabatan = $("#jabatan")?.value.trim() || "";
    const tanggal_lahir = $("#tanggal_lahir")?.value || "";
    const domisili = $("#domisili")?.value.trim() || "";
    const nik = $("#nik")?.value.trim() || "";

    if (!nama_lengkap) return warn("Nama lengkap wajib diisi.");
    if (!alamat) return warn("Alamat wajib diisi.");

    let foto_data_url = "";
    const f = $("#foto")?.files?.[0];
    if (f) {
      if (f.size > 6 * 1024 * 1024) return warn("Foto terlalu besar (maks 6MB).");
      foto_data_url = await resizeImageToDataURL(f, 900, 0.75);
    }

    const btn = $("#btnSubmit");
    if (btn) { btn.disabled = true; btn.textContent = "Menyimpan..."; }

    const r = await api("contacts.add", {
      nama_lengkap,
      alamat,
      no_hp,
      email,
      catatan, // label UI = Lain-lain (backend tetap pakai key catatan)
      nama_alias,
      instansi_organisasi,
      jabatan,
      tanggal_lahir,
      domisili,
      nik,
      foto_data_url
    }, "Menyimpan data...");

    if (btn) { btn.disabled = false; btn.textContent = "Simpan"; }

    if (!r.ok) return;

    ok("Kontak berhasil ditambahkan.");
    setTimeout(() => location.href = "daftar.html", 350);
  });
}

// ==================
// PAGE: DAFTAR
// ==================
function initDaftar() {
  const elList = $("#list");
  const elQ = $("#q");
  if (!elList) return;

  // Defaults loaded from config.get
  let defaultShareFields = ["nama_lengkap", "foto", "no_hp"];
  let defaultKopId = "";

  async function loadList(q = "") {
    elList.innerHTML = "Loading...";
    const r = await api("contacts.list", { q }, "Mengambil daftar...");
    if (!r.ok) {
      elList.innerHTML = `<div class="empty">Gagal memuat data.</div>`;
      return;
    }

    if (!r.data || !r.data.length) {
      elList.innerHTML = `<div class="empty">Belum ada data kontak.</div>`;
      return;
    }

    elList.innerHTML = r.data.map((c) => `
      <div class="row">
        <div class="name">${esc(c.nama_lengkap)}</div>
        <div class="actions">
          <button data-act="edit" data-id="${esc(c.id)}">Edit</button>
          <button data-act="del" data-id="${esc(c.id)}">Hapus</button>
          <button data-act="share" data-id="${esc(c.id)}">Bagikan</button>
        </div>
      </div>
    `).join("");
  }

  // Search
  if (elQ) {
    let t = null;
    elQ.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => loadList(elQ.value.trim()), 250);
    });
  }

  // Action buttons
  elList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const act = btn.dataset.act;

    if (act === "edit") {
      location.href = `edit.html?id=${encodeURIComponent(id)}`;
      return;
    }

    if (act === "del") {
      if (!confirm("Yakin hapus? (soft delete)")) return;
      const r = await api("contacts.delete", { id }, "Menghapus...");
      if (!r.ok) return;
      ok("Kontak dihapus.");
      await loadList(elQ ? elQ.value.trim() : "");
      return;
    }

    if (act === "share") {
      openShareModal(id);
      return;
    }
  });

  // ---- Share modal elements ----
  const shareModal = $("#shareModal");
  const shareClose = $("#shareClose");
  const shareRun = $("#shareRun");
  const withKop = $("#withKop");
  const kopSelect = $("#kopSelect");
  const shareExtraNote = $("#shareExtraNote");

  if (shareClose) shareClose.addEventListener("click", closeShareModal);
  if (shareRun) shareRun.addEventListener("click", runShare);

  // Load config + kop list once
  (async () => {
    // 1) load config defaults
    const cfg = await api("config.get", {}, "Membaca konfigurasi...");
    if (cfg.ok && cfg.data) {
      defaultKopId = cfg.data.default_kop_id || "";
      const f = (cfg.data.default_share_fields || "").trim();
      if (f) defaultShareFields = f.split(",").map((x) => x.trim()).filter(Boolean);
    }

    // 2) load kop list for dropdown
    if (kopSelect) {
      kopSelect.innerHTML = `<option value="">(Pilih kop)</option>`;
      const r = await api("kop.list", {}, "Mengambil daftar kop...");
      if (r.ok && r.data) {
        r.data.forEach((k) => {
          const opt = document.createElement("option");
          opt.value = k.id;
          opt.textContent = `${k.nama_instansi}`;
          kopSelect.appendChild(opt);
        });
      }

      // apply default kop selection
      if (defaultKopId) {
        if (withKop) withKop.checked = true;
        kopSelect.value = defaultKopId;
      } else {
        if (withKop) withKop.checked = false;
        kopSelect.value = "";
      }
    }
  })();

  function applyDefaultFieldsToModal() {
    const boxes = Array.from(document.querySelectorAll('input[name="fields"]'));
    boxes.forEach((b) => { b.checked = defaultShareFields.includes(b.value); });
  }

  let currentShareId = "";

  function openShareModal(id) {
    currentShareId = id;

    // Apply defaults each time modal opens
    applyDefaultFieldsToModal();

    if (defaultKopId && kopSelect && withKop) {
      withKop.checked = true;
      kopSelect.value = defaultKopId;
    } else if (kopSelect && withKop) {
      withKop.checked = false;
      kopSelect.value = "";
    }

    if (shareExtraNote) shareExtraNote.value = "";
    if (shareModal) shareModal.style.display = "block";
  }

  function closeShareModal() {
    if (shareModal) shareModal.style.display = "none";
    currentShareId = "";
  }

  async function runShare() {
    if (!currentShareId) return;

    const useKop = withKop ? withKop.checked : false;
    const kop_id = kopSelect ? kopSelect.value : "";
    if (useKop && !kop_id) return warn("Pilih kop dulu.");

    const fields = Array.from(document.querySelectorAll('input[name="fields"]:checked'))
      .map((x) => x.value)
      .join(",");

    if (shareRun) { shareRun.disabled = true; shareRun.textContent = "Membuat PDF..."; }

    const extra_note = shareExtraNote ? shareExtraNote.value.trim() : "";

    const r = await api("pdf.generate", {
      id: currentShareId,
      with_kop: useKop ? "1" : "0",
      kop_id,
      fields,
      extra_note
    }, "Membuat PDF...");

    if (shareRun) { shareRun.disabled = false; shareRun.textContent = "Buat & Dapatkan Link"; }
    if (!r.ok) return;

    closeShareModal();

    // Bonus: auto-copy link
    if (r.pdf_url) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(r.pdf_url);
          ok("Link PDF sudah disalin. Membuka PDF...");
        } else {
          info("PDF dibuat. Membuka PDF...");
        }
      } catch {
        info("PDF dibuat. Membuka PDF...");
      }

      window.open(r.pdf_url, "_blank");
    } else {
      ok("PDF berhasil dibuat.");
    }
  }

  // Initial list load
  loadList();
}

// ==================
// PAGE: EDIT
// ==================
function initEdit() {
  const id = getQueryParam("id");
  if (!id) {
    warn("ID tidak ada.");
    location.href = "daftar.html";
    return;
  }

  const form = $("#formEdit");
  if (!form) return;

  async function load() {
    const r = await api("contacts.get", { id }, "Memuat data...");
    if (!r.ok) {
      warn("Data tidak ditemukan.");
      location.href = "daftar.html";
      return;
    }

    const c = r.data;
    $("#id").value = c.id || "";
    $("#nama_lengkap").value = c.nama_lengkap || "";
    $("#alamat").value = c.alamat || "";
    $("#no_hp").value = c.no_hp || "";
    $("#email").value = c.email || "";
    $("#catatan").value = c.catatan || "";
    $("#nama_alias").value = c.nama_alias || "";
    $("#instansi_organisasi").value = c.instansi_organisasi || "";
    $("#jabatan").value = c.jabatan || "";
    $("#tanggal_lahir").value = c.tanggal_lahir || "";
    $("#domisili").value = c.domisili || "";
    $("#nik").value = c.nik || "";

    const prev = $("#fotoPreview");
    if (prev) prev.textContent = c.foto_url ? `Foto tersimpan: ${c.foto_url}` : "Belum ada foto.";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nama_lengkap = $("#nama_lengkap")?.value.trim() || "";
    const alamat = $("#alamat")?.value.trim() || "";
    const no_hp = $("#no_hp")?.value.trim() || "";
    const email = $("#email")?.value.trim() || "";
    const catatan = $("#catatan")?.value.trim() || "";

    const nama_alias = $("#nama_alias")?.value.trim() || "";
    const instansi_organisasi = $("#instansi_organisasi")?.value.trim() || "";
    const jabatan = $("#jabatan")?.value.trim() || "";
    const tanggal_lahir = $("#tanggal_lahir")?.value || "";
    const domisili = $("#domisili")?.value.trim() || "";
    const nik = $("#nik")?.value.trim() || "";

    if (!nama_lengkap) return warn("Nama lengkap wajib diisi.");
    if (!alamat) return warn("Alamat wajib diisi.");

    let foto_data_url = "";
    const f = $("#foto")?.files?.[0];
    if (f) {
      if (f.size > 6 * 1024 * 1024) return warn("Foto terlalu besar (maks 6MB).");
      foto_data_url = await resizeImageToDataURL(f, 900, 0.75);
    }

    const btn = $("#btnSubmit");
    if (btn) { btn.disabled = true; btn.textContent = "Menyimpan..."; }

    const r = await api("contacts.update", {
      id,
      nama_lengkap,
      alamat,
      no_hp,
      email,
      catatan, // label UI = Lain-lain
      nama_alias,
      instansi_organisasi,
      jabatan,
      tanggal_lahir,
      domisili,
      nik,
      foto_data_url
    }, "Menyimpan perubahan...");

    if (btn) { btn.disabled = false; btn.textContent = "Simpan Perubahan"; }
    if (!r.ok) return;

    ok("Perubahan disimpan.");
    setTimeout(() => location.href = "daftar.html", 350);
  });

  const back = $("#btnBack");
  if (back) back.addEventListener("click", () => location.href = "daftar.html");

  load();
}

// ==================
// PAGE: KOP
// ==================
function initKop() {
  const elList = $("#kopList");
  const form = $("#formKop");
  if (!elList || !form) return;

  async function load() {
    elList.innerHTML = "Loading...";
    const r = await api("kop.list", {}, "Mengambil daftar kop...");
    if (!r.ok) {
      elList.innerHTML = `<div class="empty">Gagal memuat kop.</div>`;
      return;
    }

    if (!r.data || !r.data.length) {
      elList.innerHTML = `<div class="empty">Belum ada kop surat.</div>`;
      return;
    }

    elList.innerHTML = r.data.map((k) => `
      <div class="row">
        <div class="name">${esc(k.nama_instansi)}</div>
        <div class="small">
          <a href="${esc(k.link_google_docs)}" target="_blank">Buka Docs</a>
        </div>
        <div class="actions">
          <button data-act="default" data-id="${esc(k.id)}">Jadikan Default</button>
          <button data-act="del" data-id="${esc(k.id)}">Hapus</button>
        </div>
      </div>
    `).join("");
  }

  const btnNo = $("#btnDefaultNoKop");
  if (btnNo) {
    btnNo.addEventListener("click", async () => {
      if (!confirm("Jadikan default tanpa kop?")) return;
      const r = await api("kop.clearDefault", {}, "Menyetel default tanpa kop...");
      if (!r.ok) return;
      ok("Default diubah: Tanpa Kop.");
      load();
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nama_instansi = $("#nama_instansi")?.value.trim() || "";
    const link_google_docs = $("#link_google_docs")?.value.trim() || "";

    if (!nama_instansi) return warn("Nama instansi wajib diisi.");
    if (!link_google_docs) return warn("Link Google Docs wajib diisi.");

    const btn = $("#btnTambahKop");
    if (btn) { btn.disabled = true; btn.textContent = "Menyimpan..."; }

    const r = await api("kop.add", { nama_instansi, link_google_docs }, "Menyimpan kop...");

    if (btn) { btn.disabled = false; btn.textContent = "Tambah Kop"; }
    if (!r.ok) return;

    $("#nama_instansi").value = "";
    $("#link_google_docs").value = "";
    ok("Kop berhasil ditambahkan.");
    load();
  });

  elList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const act = btn.dataset.act;
    const id = btn.dataset.id;

    if (act === "default") {
      const r = await api("kop.setDefault", { id }, "Menyetel default...");
      if (!r.ok) return;
      ok("Kop default diset.");
      load();
      return;
    }

    if (act === "del") {
      if (!confirm("Hapus kop ini?")) return;
      const r = await api("kop.delete", { id }, "Menghapus kop...");
      if (!r.ok) return;
      ok("Kop dihapus.");
      load();
      return;
    }
  });

  load();
}

function initStatus() {
  const box = $("#statsBox");
  const btnR = $("#btnRefresh");
  const btnC = $("#btnCleanup");

  async function render() {
    if (box) box.textContent = "Loading...";
    const r = await api("stats.get", {}, "Mengambil statistik...");
    if (!r.ok) {
      if (box) box.innerHTML = `<div class="empty">Gagal memuat statistik.</div>`;
      return;
    }

    const d = r.data;
    if (box) {
      box.innerHTML = `
        <div class="row"><div class="name">Kontak aktif</div><div>${d.contacts_active}</div></div>
        <div class="row"><div class="name">Kop aktif</div><div>${d.kop_active}</div></div>
        <div class="row"><div class="name">PDF hari ini</div><div>${d.pdf_today}</div></div>
        <div class="row"><div class="name">PDF 7 hari</div><div>${d.pdf_last7}</div></div>
        <div class="row"><div class="name">Error 7 hari</div><div>${d.errors_last7}</div></div>
        <div class="row"><div class="name">Rate limit 7 hari</div><div>${d.rate_limit_last7}</div></div>
        <div class="row"><div class="name">Unauthorized 7 hari</div><div>${d.unauthorized_last7}</div></div>
        <div class="small">Timezone server: ${esc(d.tz)}</div>
      `;
    }
  }

  if (btnR) btnR.addEventListener("click", render);

  if (btnC) {
    btnC.addEventListener("click", async () => {
      const days = $("#daysOld")?.value || "30";
      if (!confirm(`Cleanup PDF lebih tua dari ${days} hari?`)) return;

      const r = await api("maintenance.cleanupPdfs", { days_old: days }, "Cleanup PDF...");
      if (!r.ok) return;

      ok(`Cleanup selesai. Files ditrash: ${r.data.trashed}`);
      render();
    });
  }

  render();
}

function guardLogin_() {
  const page = document.body.dataset.page || "";
  if (page === "login") return;

  const st = localStorage.getItem("session_token") || "";
  if (!st) {
    const next = encodeURIComponent(location.pathname.split("/").pop() + location.search);
    location.href = `login.html?next=${next}`;
  }
}

function initLogin() {
  const form = document.querySelector("#formLogin");
  if (!form) return;

  const next = new URL(location.href).searchParams.get("next") || "index.html";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const pin = document.querySelector("#pin").value.trim();
    const r = await apiPost("auth.login", { pin });

    if (!r.ok) {
      alert("PIN salah.");
      return;
    }

    localStorage.setItem("session_token", r.data.session_token);
    location.href = next;
  });
}