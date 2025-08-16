
const $ = sel => document.querySelector(sel);
let ADMIN_TOKEN = localStorage.getItem("ADMIN_TOKEN") || "";

$("#token").value = ADMIN_TOKEN;
$("#saveToken").addEventListener("click", () => {
  ADMIN_TOKEN = $("#token").value.trim();
  localStorage.setItem("ADMIN_TOKEN", ADMIN_TOKEN);
  loadUsers();
});

$("#refresh").addEventListener("click", () => loadUsers());
$("#search").addEventListener("input", () => filterRows());
$("#outbox").addEventListener("click", () => loadOutbox());

async function api(path, options={}) {
  const res = await fetch(path, {
    headers: { "x-admin-token": ADMIN_TOKEN || "", "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${t}`);
  }
  return res.json();
}

function fmt(dt) { if(!dt) return ""; try { return new Date(dt).toLocaleString(); } catch { return dt; } }

function filterRows() {
  const q = $("#search").value.trim().toLowerCase();
  const rows = [...document.querySelectorAll("#users tbody tr")];
  let shown = 0;
  rows.forEach(r => {
    const hay = (r.dataset.email || "") + " " + (r.dataset.screen || "") + " " + (r.dataset.name || "");
    const show = !q || hay.includes(q);
    r.classList.toggle("hidden", !show);
    if (show) shown++;
  });
  $("#empty").classList.toggle("hidden", shown !== 0);
}

async function loadUsers() {
  try {
    const v = await fetch("/api/version").then(r=>r.json()).catch(()=>({version:"1.0.0"}));
    $("#ver").textContent = `v${v.version}`;
    const data = await api("/api/admin/users");
    const tbody = $("#users tbody");
    tbody.innerHTML = "";
    data.users.forEach(u => {
      const tr = document.createElement("tr");
      tr.dataset.email = (u.email || "").toLowerCase();
      tr.dataset.screen = (u.screenname || "").toLowerCase();
      tr.dataset.name = (u.name || "").toLowerCase();
      tr.innerHTML = `
        <td class="email"><button class="link userlink" data-id="${u.id}">${u.email}</button></td>
        <td>${u.name || ""}</td>
        <td>${u.screenname || ""}</td>
        <td>${fmt(u.created_at)}</td>
        <td>${fmt(u.last_login_at)}</td>
        <td>${u.login_count ?? 0}</td>
        <td>${u.email_verified ? "Yes" : "No"}</td>
        <td>
          <button class="btn small btn-secondary" data-action="reset" data-id="${u.id}">Send reset link</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    $("#empty").classList.toggle("hidden", data.users.length !== 0);
    filterRows();
  } catch (e) {
    alert("Failed to load users: " + e.message);
  }
}

document.addEventListener("click", async e => {
  const reset = e.target.closest("button.btn[data-action='reset']");
  if (reset) {
    const id = reset.dataset.id;
    try {
      const data = await api(`/api/admin/users/${id}/send-reset`, { method: "POST", body: JSON.stringify({}) });
      alert("Reset link generated: " + (data.dev_reset_link || "(email queued)"));
      loadOutbox();
    } catch (err) {
      alert("Failed to send reset: " + err.message);
    }
    return;
  }
  const userlink = e.target.closest("button.userlink");
  if (userlink) {
    const id = userlink.dataset.id;
    try {
      const data = await api(`/api/admin/users/${id}/logins`);
      $("#detailTitle").textContent = `Login history for ${userlink.textContent}`;
      const tbody = $("#events tbody");
      tbody.innerHTML = "";
      data.events.forEach(ev => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${fmt(ev.created_at)}</td>
          <td>${ev.success ? "Yes" : "No"}</td>
          <td>${ev.method || ""}</td>
          <td>${ev.ip || ""}</td>
          <td title="${ev.user_agent || ""}">${(ev.user_agent || "").slice(0,40)}</td>
          <td>${ev.failure_reason || ""}</td>
        `;
        tbody.appendChild(tr);
      });
      $("#detail").classList.remove("hidden");
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (e2) {
      alert("Failed to load events: " + e2.message);
    }
  }
});

async function loadOutbox() {
  try {
    const data = await api("/api/admin/outbox");
    const panel = $("#outboxPanel");
    const box = $("#emails");
    box.innerHTML = "";
    data.emails.forEach(m => {
      const div = document.createElement("div");
      div.className = "mail";
      div.innerHTML = `
        <div class="mailhead"><strong>To:</strong> ${m.to} &nbsp; <strong>Subject:</strong> ${m.subject} &nbsp; <span class="muted">${fmt(m.created_at)}</span></div>
        <div class="mailbody">${m.html}</div>
      `;
      box.appendChild(div);
    });
    panel.classList.remove("hidden");
  } catch (e) {
    alert("Failed to load outbox: " + e.message);
  }
}

loadUsers();
