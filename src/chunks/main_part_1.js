// ------------------- Build Tag & Favicon -------------------
const BUILD = { num: 'v8.6.2', date: new Date().toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'}) };
(function(){
  document.getElementById('build').textContent = `Build ${BUILD.num} • ${BUILD.date}`;
  // Use provided G.png as favicon when available
  const candidates = ['G.png','./G.png','/mnt/data/G.png'];
  (function tryNext(i){ if(i>=candidates.length) return; const img=new Image(); img.onload=()=> setFav(candidates[i]); img.onerror=()=> tryNext(i+1); img.src=candidates[i]; })(0);
})();

  resume(){ try{ this.ensure(); if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); }catch(e){} },
  setVolume(v){ this.vol = v; if(this.master && !this.muted) this.master.gain.value = this.vol; this.persist(); },
  setMuted(m){ this.muted = m; if(this.master) this.master.gain.value = this.muted?0:this.vol; this.persist(); },
  persist(){ try{ localStorage.setItem(this.key, JSON.stringify({vol:this.vol, muted:this.muted})); }catch(e){} },
  load(){ try{ const s = JSON.parse(localStorage.getItem(this.key)||'null'); if(s){ this.vol = s.vol??this.vol; this.muted = !!s.muted; } }catch(e){} },
  now(){ this.ensure(); return this.ctx? this.ctx.currentTime : 0; },
  env(node, t, a=0.005, d=0.08, s=0.0, r=0.12, g=0.5){ const gnode = this.ctx.createGain(); node.connect(gnode); gnode.connect(this.master); const v = g; gnode.gain.setValueAtTime(0, t); gnode.gain.linearRampToValueAtTime(v, t+a); gnode.gain.linearRampToValueAtTime(v*s, t+a+d); gnode.gain.linearRampToValueAtTime(0.0001, t+a+d+r); },
  tone(freq=440, dur=0.12, type='sine', gain=0.5){ if(!this.ctx || this.muted) return; const t=this.now(); const o=this.ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(freq, t); this.env(o,t,0.005, dur*0.6, 0.0, dur*0.4, gain); o.start(t); o.stop(t+dur+0.2); },
  chirp(f1=300, f2=900, dur=0.15, type='triangle', gain=0.35){ if(!this.ctx || this.muted) return; const t=this.now(); const o=this.ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t+dur); this.env(o,t,0.005, dur*0.7, 0.0, 0.12, gain); o.start(t); o.stop(t+dur+0.2); },
  seq(notes){ if(!this.ctx || this.muted) return; const base=this.now(); notes.forEach(n=>{ const t=base+(n.t||0); const o=this.ctx.createOscillator(); o.type=n.type||'sine'; o.frequency.setValueAtTime(n.f, t); this.env(o,t,0.005,(n.d||0.1)*0.7,0.0,(n.d||0.1)*0.3,n.g||0.4); o.start(t); o.stop(t+(n.d||0.1)+0.2); }); },
  play(kind){ switch(kind){ case 'draw': this.chirp(320,520,0.08,'triangle',0.25); break; case 'action': this.chirp(420,860,0.12,'triangle',0.35); break; case 'coins': this.seq([{t:0,f:900,d:0.05,g:0.35,type:'square'},{t:0.06,f:1200,d:0.05,g:0.25,type:'square'}]); break; case 'buy': this.seq([{t:0,f:660,d:0.1,g:0.35},{t:0.12,f:990,d:0.1,g:0.25}]); break; case 'shuffle': this.noise(0.25,0.22,[200,3000]); break; case 'attack': this.seq([{t:0,f:220,d:0.14,g:0.4,type:'sawtooth'},{t:0.1,f:180,d:0.12,g:0.35,type:'sawtooth'}]); break; case 'reaction': this.chirp(500,1000,0.16,'sine',0.3); break; case 'error': this.tone(140,0.18,'sawtooth',0.35); break; case 'end': this.seq([{t:0,f:660,d:0.1,g:0.35},{t:0.12,f:880,d:0.12,g:0.35},{t:0.26,f:1320,d:0.16,g:0.25}]); break; } }
};

  Copper:    { name:'Copper',    cost:0, type:'Treasure', value:1, desc:'+1 coin' },
  Silver:    { name:'Silver',    cost:3, type:'Treasure', value:2, desc:'+2 coins' },
  Gold:      { name:'Gold',      cost:6, type:'Treasure', value:3, desc:'+3 coins' },
  Festival:  { name:'Festival',  cost:5, type:'Action',   desc:'+2 actions, +1 buy, +2 coins',
  Woodcutter:{ name:'Woodcutter',cost:3, type:'Action',   desc:'+1 buy, +2 coins',
};

const SUPPLY = [
  { key:'Copper',   count:60 },
  { key:'Silver',   count:40 },
  { key:'Gold',     count:30 },
  { key:'Estate',   count:24 },
  { key:'Duchy',    count:12 },
  { key:'Province', count:12 },
  { key:'Market',   count:10 },
  { key:'Festival', count:10 },
  { key:'Woodcutter',count:10 },
  { key:'Workshop', count:10 },
];

  autoAdvance:true,
  debugAI:false,
  aiActions:1, aiBuys:1, aiCoins:0,
  aiMode:'strong',
  undo:null,
  undoForbidden:null,
  suppressAutoAdvanceOnce:false,
  interactionLock:false,
  turnNum:1,
};

// ------------------- Log & Tooltip -------------------
const LOG_MAX = 10; let LOG_SILENT=false; const logs = [];
function addLog(msg, cls){ if(LOG_SILENT) return; logs.push({msg, cls}); while(logs.length>LOG_MAX) logs.shift(); const el = document.getElementById('log'); if(el) el.innerHTML = logs.map(l=>`<span class="${l.cls||''}">• ${l.msg}</span>`).join('\n'); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1800); }

const tip = document.getElementById('tooltip');
function showTip(html, x, y){ tip.innerHTML = html; tip.style.display='block'; const pad=10; const w=260; const h= tip.offsetHeight||100; let left = Math.min(window.innerWidth - w - pad, x + 14); let top  = Math.min(window.innerHeight - h - pad, y + 14); tip.style.left = left + 'px'; tip.style.top = top + 'px'; }
function hideTip(){ tip.style.display='none'; }

// ------------------- Helpers -------------------
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }
function vpOfPile(pile){ return pile.reduce((sum,c)=> sum + (c.points||0), 0); }

function isChoiceOpen(){ return document.getElementById('choiceOverlay').classList.contains('show'); }

function emptyPileCount(){ return SUPPLY.reduce((n,p)=> n + (p.count===0?1:0), 0); }
function getPile(name){ return SUPPLY.find(p=>p.key===name); }


let lastCountsHTML = '';

// ---------- Debug helpers ----------

// ------------------- Choice overlay (Workshop) -------------------
function openGainChoice(maxCost, actor, source){
  const over = document.getElementById('choiceOverlay');
  const grid = document.getElementById('choiceGrid'); grid.innerHTML = '';
  eligible.forEach(pile=>{
    const el = document.createElement('div'); el.className='pile';
    el.innerHTML = `
      <div class=\"count\">${pile.count}</div>
      <div class=\"name\">
        <div class=\"label\">${def.name}</div>
      </div>
      <div class=\"meta\">Cost: ${def.cost}</div>
    `;
    el.onclick = ()=>{
      addLog(`You gained ${def.name} with ${source}.`);
      over.classList.remove('show');
    };
    grid.appendChild(el);
  });
  over.classList.add('show');
}

// ------------------- Undo -------------------
function updateUndoUI(){ const b = document.getElementById('undoBtn'); if(b) b.disabled = !canUndo(); }

// ------------------- Init -------------------
function init(){
  for(let i=0;i<5;i++){ drawOne(p); drawOne(a); }

  // Top-right controls
  document.getElementById('tutorialBtn').onclick = ()=>{ Coach.ensureInit(); Coach.restart(); };

  const v = document.getElementById('vol'); const m = document.getElementById('muteToggle');

  updateUndoUI();
  render();
  Chat.init();
  Coach.init(); Coach.maybeStart();
  setTimeout(sanityCheck, 0);
}

// ------------------- Rendering -------------------
function render(){
  syncLockFromOverlay();
  const {p,a} = computeScores();
  document.getElementById('pScore').textContent = p;
  document.getElementById('aScore').textContent = a;

  // SUPPLY
  const s = document.getElementById('supply'); s.innerHTML='';
  const sortMetric = (def, type)=> type==='Victory' ? (def.points||0) : def.cost;
  groups.forEach(g=>{
    const sec = document.createElement('div'); sec.className='supplySection';
    const h = document.createElement('h3'); h.textContent = g.title; sec.appendChild(h);
    const grid = document.createElement('div'); grid.className='supplyGrid'; sec.appendChild(grid);

      .forEach(pile=>{
        const el = document.createElement('div'); el.className='pile'; if(pile.count===0) el.classList.add('empty');
        el.innerHTML = `
          <div class=\"count\">${pile.count}</div>
          <div class=\"name\">
            <div class=\"label\">${def.name}</div>
          </div>
          <div class=\"meta\">Cost: ${def.cost}</div>
        `;
        if(canBuy){ el.onclick = ()=>buy(def.name); el.classList.remove('disabled'); el.classList.add('buyable'); }
        else { el.classList.add('disabled'); el.classList.remove('buyable'); el.onclick = null; }
        grid.appendChild(el);
      });
    s.appendChild(sec);
  });

  // HAND
  const groupRank = { Action:0, Treasure:1, Victory:2 };
  indexed.sort((a,b)=>{ const ga = groupRank[a.c.type] ?? 3; const gb = groupRank[b.c.type] ?? 3; if(ga!==gb) return ga-gb; if(a.c.type==='Action' && b.c.type==='Action') return a.c.name.localeCompare(b.c.name); if(a.c.type==='Treasure' && b.c.type==='Treasure') return (b.c.value||0)-(a.c.value||0) || a.c.name.localeCompare(b.c.name); if(a.c.type==='Victory' && b.c.type==='Victory') return (b.c.points||0)-(a.c.points||0) || a.c.name.localeCompare(b.c.name); return a.c.name.localeCompare(b.c.name); });
  indexed.forEach(({c,idx})=>{
    if(canPlayAction || canPlayTreasure){ el.classList.add('playable'); el.onclick = ()=>play(idx); }
    else { el.classList.add('disabled'); el.onclick = null; }
    hand.appendChild(el);
  });

  // Buttons
  document.getElementById('undoBtn').onclick = undo;

  const changed = maybeAutoAdvance();
  if(changed) return render();
}





// ------------------- Turn Flow -------------------

// ------------------- AI -------------------

// ------------------- Keyboard Shortcuts -------------------


// ------------------- Chat Bot (persisted) -------------------
};

// ------------------- Sanity / smoke checks -------------------

// ------------------- Start -------------------
init();