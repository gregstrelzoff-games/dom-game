// Canvas splash + basic auth (email code) + leaderboard
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function drawSplash() {
  const w = canvas.width, h = canvas.height;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#1d4ed8');
  g.addColorStop(1, '#9333ea');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'white';
  ctx.font = '64px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Dominion Prototype', w / 2, h / 2 - 20);
  ctx.font = '20px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  ctx.fillText('Login + KV + Leaderboard', w / 2, h / 2 + 24);
}

drawSplash();

// Lightweight client identity for leaderboard userId fallback
const userIdEl = document.getElementById('userId');
let userId = localStorage.getItem('userId');
if (!userId) {
  userId = 'user-' + Math.random().toString(36).slice(2, 8);
  localStorage.setItem('userId', userId);
}
userIdEl.textContent = userId;

// Login flow
aSyncInit();

async function aSyncInit(){
  await refreshMe();
  refreshLeaderboard();
}

async function refreshMe(){
  const cur = document.getElementById('currentUser');
  try{
    const r = await fetch('/api/me');
    if(r.ok){
      const d = await r.json();
      cur.textContent = d.email || 'guest';
      if(d.email) userIdEl.textContent = d.email;
    }else{
      cur.textContent = 'guest';
    }
  }catch{
    cur.textContent = 'guest';
  }
}

async function sendLoginCode(){
  const email = document.getElementById('loginEmail').value.trim();
  const out = document.getElementById('sendStatus');
  if(!email){ out.textContent = 'Enter your email'; return; }
  out.textContent = 'Sending...';
  const res = await fetch('/api/auth-start', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
  const data = await res.json().catch(()=>({}));
  out.textContent = res.ok ? (data.devCode ? `Code sent (dev: ${data.devCode})` : 'Code sent. Check your email') : (data.error || 'Error');
}

async function verifyLogin(){
  const email = document.getElementById('loginEmail').value.trim();
  const code = document.getElementById('loginCode').value.trim();
  const out = document.getElementById('sendStatus');
  if(!email || !code){ out.textContent = 'Enter email and code'; return; }
  out.textContent = 'Verifying...';
  const res = await fetch('/api/auth-verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, code }) });
  const data = await res.json().catch(()=>({}));
  if(res.ok){
    out.textContent = 'Logged in';
    document.getElementById('loginCode').value='';
    await refreshMe();
  }else{
    out.textContent = data.error || 'Invalid code';
  }
}

async function logout(){
  await fetch('/api/logout', { method:'POST' });
  await refreshMe();
}

// Leaderboard
const lbEl = document.getElementById('leaderboard');
async function refreshLeaderboard() {
  lbEl.innerHTML = '<li class="muted">Loading...</li>';
  const res = await fetch('/api/leaderboard');
  const data = await res.json();
  const entries = Array.isArray(data.top) ? data.top : [];
  const pairs = [];
  for (let i = 0; i < entries.length; i += 2) {
    pairs.push({ userId: entries[i], score: entries[i + 1] });
  }
  lbEl.innerHTML = pairs.map((p, idx) => `<li>#${idx + 1} ${p.userId} - ${p.score}</li>`).join('') || '<li class="muted">No scores yet</li>';
}

async function submitRandomScore() {
  const score = Math.floor(Math.random() * 100);
  const btn = document.getElementById('btnRandomScore');
  btn.disabled = true;
  await fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, score })
  });
  btn.disabled = false;
  refreshLeaderboard();
}

// Wire buttons
document.getElementById('btnRandomScore').addEventListener('click', submitRandomScore);
document.getElementById('btnRefresh').addEventListener('click', refreshLeaderboard);
document.getElementById('btnSendCode').addEventListener('click', sendLoginCode);
document.getElementById('btnVerifyCode').addEventListener('click', verifyLogin);
document.getElementById('btnLogout').addEventListener('click', logout);

// Pro check
document.getElementById('btnCheckPro').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const out = document.getElementById('proResult');
  if (!email) { out.textContent = 'Enter an email.'; return; }
  out.textContent = 'Checking...';
  const res = await fetch('/api/is-pro?email=' + encodeURIComponent(email));
  const data = await res.json();
  out.textContent = data.pro ? 'Pro: yes' : 'Pro: no';
});
