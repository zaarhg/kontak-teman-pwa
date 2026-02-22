document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page || "";
  if (page === "tambah") initTambah();
  if (page === "daftar") initDaftar();
  if (page === "edit") initEdit();
  if (page === "kop") initKop();
});

// ---------- UTIL ----------
function $(sel) {
  return document.querySelector(sel);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
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

// ---------- TAMBAH ----------
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

    if (!nama_lengkap) return alert("Nama lengkap wajib");
    if (!alamat) return alert("Alamat wajib");

    let foto_data_url = "";
    const f = $("#foto")?.files?.[0];
    if (f) {
      if (f.size > 6 * 1024 * 1024) return alert("Foto terlalu besar (maks 6MB).");
      foto_data_url = await resizeImageToDataURL(f, 900, 0.75);
    }

    const btn = $("#btnSubmit");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Menyimpan...";
    }

    const r = await apiPost("contacts.add", {
      nama_lengkap,
      alamat,
      no_hp,
      email,
      catatan,
      foto_data_url
    });

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Simpan";
    }

    if (!r.ok) return alert("Gagal: " + (r.error || r.message || "unknown"));

    location.href = "daftar.html";
  });
}

// ---------- DAFTAR ----------
function initDaftar() {
  const elList = $("#list");
  const elQ = $("#q");

  if (!elList) return;

  // Defaults loaded from config.get
  let defaultShareFields = ["nama_lengkap", "foto", "no_hp"];
  let defaultKopId = "";

  async function loadList(q = "") {
    elList.innerHTML = "Loading...";
    const r = await apiPost("contacts.list", { q });
    if (!r.ok) {
      elList.innerHTML = "Gagal load data.";
      return;
    }

    if (!r.data || !r.data.length) {
      elList.innerHTML = "<p>Belum ada data.</p>";
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
    elQ.addEventListener("input", () => loadList(elQ.value.trim()));
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
      const r = await apiPost("contacts.delete", { id });
      if (!r.ok) return alert("Gagal hapus: " + (r.error || r.message || "unknown"));
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

  if (shareClose) shareClose.addEventListener("click", closeShareModal);
  if (shareRun) shareRun.addEventListener("click", runShare);

  // Load config + kop list once
  (async () => {
    // 1) load config defaults
    const cfg = await apiPost("config.get", {});
    if (cfg.ok && cfg.data) {
      defaultKopId = cfg.data.default_kop_id || "";
      const f = (cfg.data.default_share_fields || "").trim();
      if (f) {
        defaultShareFields = f.split(",").map((x) => x.trim()).filter(Boolean);
      }
    }

    // 2) load kop list for dropdown
    if (kopSelect) {
      kopSelect.innerHTML = `<option value="">(Pilih kop)</option>`;
      const r = await apiPost("kop.list", {});
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
    boxes.forEach((b) => {
      b.checked = defaultShareFields.includes(b.value);
    });
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

    if (useKop && !kop_id) return alert("Pilih kop dulu.");

    const fields = Array.from(document.querySelectorAll('input[name="fields"]:checked'))
      .map((x) => x.value)
      .join(",");

    if (shareRun) {
      shareRun.disabled = true;
      shareRun.textContent = "Membuat PDF...";
    }

    const r = await apiPost("pdf.generate", {
      id: currentShareId,
      with_kop: useKop ? "1" : "0",
      kop_id,
      fields
    });

    if (shareRun) {
      shareRun.disabled = false;
      shareRun.textContent = "Buat & Dapatkan Link";
    }

    if (!r.ok) return alert("Gagal: " + (r.error || r.message || "unknown"));

    closeShareModal();
    window.open(r.pdf_url, "_blank");
  }

  // Initial list load
  loadList();
}

// ---------- EDIT ----------
function initEdit() {
  const id = getQueryParam("id");
  if (!id) {
    alert("ID tidak ada");
    location.href = "daftar.html";
    return;
  }

  const form = $("#formEdit");
  if (!form) return;

  async function load() {
    const r = await apiPost("contacts.get", { id });
    if (!r.ok) {
      alert("Data tidak ditemukan");
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

    const prev = $("#fotoPreview");
    if (prev) {
      prev.textContent = c.foto_url ? `Foto tersimpan: ${c.foto_url}` : "Belum ada foto.";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nama_lengkap = $("#nama_lengkap")?.value.trim() || "";
    const alamat = $("#alamat")?.value.trim() || "";
    const no_hp = $("#no_hp")?.value.trim() || "";
    const email = $("#email")?.value.trim() || "";
    const catatan = $("#catatan")?.value.trim() || "";

    if (!nama_lengkap) return alert("Nama lengkap wajib");
    if (!alamat) return alert("Alamat wajib");

    let foto_data_url = "";
    const f = $("#foto")?.files?.[0];
    if (f) {
      if (f.size > 6 * 1024 * 1024) return alert("Foto terlalu besar (maks 6MB).");
      foto_data_url = await resizeImageToDataURL(f, 900, 0.75);
    }

    const btn = $("#btnSubmit");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Menyimpan...";
    }

    const r = await apiPost("contacts.update", {
      id,
      nama_lengkap,
      alamat,
      no_hp,
      email,
      catatan,
      foto_data_url
    });

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Simpan Perubahan";
    }

    if (!r.ok) return alert("Gagal: " + (r.error || r.message || "unknown"));

    location.href = "daftar.html";
  });

  const back = $("#btnBack");
  if (back) back.addEventListener("click", () => location.href = "daftar.html");

  load();
}

// ---------- KOP ----------
function initKop() {
  const elList = $("#kopList");
  const form = $("#formKop");
  if (!elList || !form) return;

  async function load() {
    elList.innerHTML = "Loading...";
    const r = await apiPost("kop.list", {});
    if (!r.ok) {
      elList.innerHTML = "Gagal load kop.";
      return;
    }

    if (!r.data || !r.data.length) {
      elList.innerHTML = "<p>Belum ada kop surat.</p>";
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nama_instansi = $("#nama_instansi")?.value.trim() || "";
    const link_google_docs = $("#link_google_docs")?.value.trim() || "";

    if (!nama_instansi) return alert("Nama instansi wajib");
    if (!link_google_docs) return alert("Link Google Docs wajib");

    const btn = $("#btnTambahKop");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Menyimpan...";
    }

    const r = await apiPost("kop.add", { nama_instansi, link_google_docs });

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Tambah Kop";
    }

    if (!r.ok) return alert("Gagal: " + (r.error || r.message || "unknown"));

    $("#nama_instansi").value = "";
    $("#link_google_docs").value = "";
    load();
  });

  elList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const act = btn.dataset.act;
    const id = btn.dataset.id;

    if (act === "default") {
      const r = await apiPost("kop.setDefault", { id });
      if (!r.ok) return alert("Gagal set default: " + (r.error || r.message || "unknown"));
      alert("Berhasil: kop default diset.");
      load();
      return;
    }

    if (act === "del") {
      if (!confirm("Hapus kop ini?")) return;
      const r = await apiPost("kop.delete", { id });
      if (!r.ok) return alert("Gagal hapus kop: " + (r.error || r.message || "unknown"));
      load();
      return;
    }
  });

  load();
}