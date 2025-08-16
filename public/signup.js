
const $ = sel => document.querySelector(sel);

function stepTo(n){
  document.querySelectorAll(".step").forEach(s => s.classList.toggle("active", s.dataset.step == n));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("hidden", p.dataset.step != n));
}
$("#next1").onclick = () => {
  if (!$("#name").value || !$("#age").value) return alert("Please enter your name and age.");
  stepTo(2);
};
$("#back2").onclick = () => stepTo(1);
$("#next2").onclick = () => {
  const s = $("#screenname").value.trim();
  if (s.length < 3) return alert("Screen name must be at least 3 characters.");
  stepTo(3);
};
$("#back3").onclick = () => stepTo(2);

async function version(){
  try {
    const r = await fetch("/api/version").then(r => r.json());
    $("#ver").textContent = `v${r.version}`;
  } catch {}
}
version();

$("#form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name: $("#name").value.trim(),
    age: Number($("#age").value),
    screenname: $("#screenname").value.trim(),
    email: $("#email").value.trim()
  };
  try {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to sign up");
    $("#form").classList.add("hidden");
    $("#success").classList.remove("hidden");
    if (data.dev_verify_link) {
      const el = $("#devLink");
      el.classList.remove("hidden");
      el.innerHTML = `<p><strong>Dev only:</strong> <a href="${data.dev_verify_link}">${data.dev_verify_link}</a></p>`;
    }
  } catch (err) {
    alert(err.message);
  }
});
