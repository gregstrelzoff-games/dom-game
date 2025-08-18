
// v10.0.60 live remaining from SUPPLY
function getSupplyRemaining(def){
  try{
    if (typeof SUPPLY==='undefined' || !Array.isArray(SUPPLY)) return '';
    var key = (def && (def.key || def.name)) || def || '';
    var found = SUPPLY.find(function(p){ return p && (p.key===key || p.name===key || (def && (p.key===def.key || p.name===def.name))); });
    return found ? (found.count||0) : '';
  }catch(e){ return ''; }
}

function applyCompactControls(){
  try{
    var root = document.querySelector('.topbar') || document.querySelector('.controls') || document.getElementById('controls');
    if(root && !root.classList.contains('controls-bar')) root.classList.add('controls-bar');
  }catch(e){}
}

// --- Early globals to avoid TDZ ---
var LOG_SILENT = false;
var logs = [];              // buffer until UI hooks in
var LOG_MAX = 10;           // clamp log lines



// ------------------- Build Tag & Favicon -------------------
const BUILD = { num: 'v10.0.84', date: new Date().toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'}) };
(function(){
  document.getElementById('build').textContent = `Build ${BUILD.num} • ${BUILD.date}`;
  // Use provided G.png as favicon when available
  const candidates = ['G.png','./G.png','/mnt/data/G.png'];
  function setFav(url){ let link=document.querySelector('link[rel="icon"]'); if(!link){ link=document.createElement('link'); link.rel='icon'; document.head.appendChild(link);} link.href=url; }
  (function tryNext(i){ if(i>=candidates.length) return; const img=new Image(); img.onload=()=> setFav(candidates[i]); img.onerror=()=> tryNext(i+1); img.src=candidates[i]; })(0);
})();



// ------------------- Sound Engine -------------------
const Sound = {
  ctx: null, master: null, vol: 0.6, muted: false, key:'dominion_sound_v1',
  ensure(){ if(this.ctx) return; try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted?0:this.vol; this.master.connect(this.ctx.destination); }catch(e){ console.warn('Audio init failed', e); } },
  resume(){ try{ this.ensure(); if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); }catch(e){} },
  setVolume(v){ this.vol = v; if(this.master && !this.muted) this.master.gain.value = this.vol; this.persist(); },
  setMuted(m){ this.muted = m; if(this.master) this.master.gain.value = this.muted?0:this.vol; this.persist(); },
  persist(){ try{ localStorage.setItem(this.key, JSON.stringify({vol:this.vol, muted:this.muted})); }catch(e){} },
  load(){ try{ const s = JSON.parse(localStorage.getItem(this.key)||'null'); if(s){ this.vol = s.vol??this.vol; this.muted = !!s.muted; } }catch(e){} },
  now(){ this.ensure(); return this.ctx? this.ctx.currentTime : 0; },
  env(node, t, a=0.005, d=0.08, s=0.0, r=0.12, g=0.5){ const gnode = this.ctx.createGain(); node.connect(gnode); gnode.connect(this.master); const v = g; gnode.gain.setValueAtTime(0, t); gnode.gain.linearRampToValueAtTime(v, t+a); gnode.gain.linearRampToValueAtTime(v*s, t+a+d); gnode.gain.linearRampToValueAtTime(0.0001, t+a+d+r); },
  tone(freq=440, dur=0.12, type='sine', gain=0.5){ if(!this.ctx || this.muted) return; const t=this.now(); const o=this.ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(freq, t); this.env(o,t,0.005, dur*0.6, 0.0, dur*0.4, gain); o.start(t); o.stop(t+dur+0.2); },
  chirp(f1=300, f2=900, dur=0.15, type='triangle', gain=0.35){ if(!this.ctx || this.muted) return; const t=this.now(); const o=this.ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t+dur); this.env(o,t,0.005, dur*0.7, 0.0, 0.12, gain); o.start(t); o.stop(t+dur+0.2); },
  noise(dur=0.15, gain=0.25, band=[300,2000]){ if(!this.ctx || this.muted) return; const t=this.now(); const buf=this.ctx.createBuffer(1, this.ctx.sampleRate*dur, this.ctx.sampleRate); const data=buf.getChannelData(0); for(let i=0;i<data.length;i++){ data[i]=Math.random()*2-1; } const src=this.ctx.createBufferSource(); src.buffer=buf; let node=src; if(band){ const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=(band[0]+band[1])/2; bp.Q.value=3; src.connect(bp); node=bp; } this.env(node,t,0.005, dur*0.5, 0.0, 0.15, gain); src.start(t); src.stop(t+dur+0.2); },
  seq(notes){ if(!this.ctx || this.muted) return; const base=this.now(); notes.forEach(n=>{ const t=base+(n.t||0); const o=this.ctx.createOscillator(); o.type=n.type||'sine'; o.frequency.setValueAtTime(n.f, t); this.env(o,t,0.005,(n.d||0.1)*0.7,0.0,(n.d||0.1)*0.3,n.g||0.4); o.start(t); o.stop(t+(n.d||0.1)+0.2); }); },
  play(kind){ switch(kind){ case 'gain': this.tone(880,0.10,'sine',0.35); this.tone(1320,0.10,'triangle',0.25); break; case 'draw': this.chirp(320,520,0.08,'triangle',0.25); break; case 'action': this.chirp(420,860,0.12,'triangle',0.35); break; case 'coins': this.seq([{t:0,f:900,d:0.05,g:0.35,type:'square'},{t:0.06,f:1200,d:0.05,g:0.25,type:'square'}]); break; case 'buy': this.seq([{t:0,f:660,d:0.1,g:0.35},{t:0.12,f:990,d:0.1,g:0.25}]); break; case 'shuffle': this.noise(0.25,0.22,[200,3000]); break; case 'attack': this.seq([{t:0,f:220,d:0.14,g:0.4,type:'sawtooth'},{t:0.1,f:180,d:0.12,g:0.35,type:'sawtooth'}]); break; case 'reaction': this.chirp(500,1000,0.16,'sine',0.3); break; case 'error': this.tone(140,0.18,'sawtooth',0.35); break; case 'end': this.seq([{t:0,f:660,d:0.1,g:0.35},{t:0.12,f:880,d:0.12,g:0.35},{t:0.26,f:1320,d:0.16,g:0.25}]); break; } }
};
Sound.load();
['pointerdown','keydown','click','touchstart'].forEach(ev=> document.addEventListener(ev, ()=>Sound.resume(), {once:true}));
['pointerdown','keydown'].forEach(ev=> document.addEventListener(ev, ()=>Sound.resume(), {once:true}));



// ------------------- Card Definitions -------------------






// ------------------- Undo -------------------
function snapshot(){ if(game.turn!=='player' || game.gameOver || game.interactionLock) return; game.undo = { turn: game.turn, phase: game.phase, actions: game.actions, buys: game.buys, coins: game.coins, endAfter: game.endAfterThisTurn, playerPacked: packActor(game.player), supply: SUPPLY.map(p=>p.count), logs: deepClone(logs), merchantPending: deepClone(game.merchantPending), turnNum: game.turnNum, }; game.undoForbidden = null; updateUndoUI(); }
function canUndo(){ return !!game.undo; }
function undo(){ if(!canUndo()) return; if(game.undoForbidden==='draw'){ Sound.play('error'); toast('You cannot use undo after a card draw.'); return; } if(isChoiceOpen()) closeChoiceOverlay(); const u = game.undo; game.turn  = u.turn; game.phase = u.phase; game.actions = u.actions; game.buys = u.buys; game.coins = u.coins; game.endAfterThisTurn = u.endAfter; game.player = unpackActor(u.playerPacked); SUPPLY.forEach((p,i)=> p.count = u.supply[i]); logs.length = 0; u.logs.forEach(x=> logs.push(x)); game.merchantPending = u.merchantPending; game.turnNum = u.turnNum; game.undo = null; game.interactionLock = false; game.suppressAutoAdvanceOnce = true; updateUndoUI(); addLog(`Undid last action. Restored phase: ${game.phase}, actions: ${game.actions}, buys: ${game.buys}, coins: ${game.coins}.`, 'mint'); render(); }
function updateUndoUI(){ const b = document.getElementById('undoBtn'); if(b) b.disabled = !canUndo(); }



// ------------------- Init -------------------


// v10.0.19: Player-held counts (no totals), compact 3-line layout
// v10.0.20: Player-held counts (safe mapping)
function playerCountsHTML(){
  try{
    const p = game.player || {};
    const zones = [p.hand||[], p.deck||[], p.discard||[], p.played||[]];
    const counts = Object.create(null);
    const toName = (c)=> (c && typeof c === 'object') ? (c.name || c.key || '') : String(c||'');
    for(const zone of zones){
      for(const c of zone){
        const name = toName(c);
        if(!name) continue;
        counts[name] = (counts[name]||0) + 1;
      }
    }
    const have = (n)=> counts[n] > 0;
    const row = (arr)=> arr.filter(have).map(n => `${n} (${counts[n]})`).join('   ');

    const tRow = row(['Gold','Silver','Copper']);
    const vRow = row(['Province','Duchy','Estate']);
    const fixed = new Set(['Gold','Silver','Copper','Province','Duchy','Estate']);
    const others = Object.keys(counts).filter(n => !fixed.has(n)).sort();
    const aRow = others.length ? row(others) : '';

    return [
      '<div class="countsList" style="margin-top:0">',
      tRow ? `<div class="row">${tRow}</div>` : '',
      vRow ? `<div class="row">${vRow}</div>` : '',
      aRow ? `<div class="row">${aRow}</div>` : '',
      '</div>'
    ].join('');
  }catch(e){
    return '<div class="countsList"></div>';
  }
}



// v10.0.21: Player-held counts for ALL game cards (zeros included)
function playerCountsHTML(){
  try{
    const p = game.player || {};
    const zones = [p.hand||[], p.deck||[], p.discard||[], p.played||[]];
    const counts = Object.create(null);
    const toName = (c)=> (c && typeof c === 'object') ? (c.name || c.key || '') : String(c||'');
    for (const zone of zones){
      for (const c of zone){
        const name = toName(c);
        if(!name) continue;
        counts[name] = (counts[name]||0) + 1;
      }
    }
    const fixedT = ['Gold','Silver','Copper'];
    const fixedV = ['Province','Duchy','Estate'];
    const fixedSet = new Set([...fixedT, ...fixedV]);
    const supplyKeys = (typeof SUPPLY!=='undefined' && Array.isArray(SUPPLY)) ? SUPPLY.map(p=> p.key) : [];
    const actions = supplyKeys.filter(k => !fixedSet.has(k)).sort();
    const countOr0 = (n)=> counts[n] || 0;
    const formatRow = (arr)=> arr.map(n => `${n} (${countOr0(n)})`).join('   ');
    const tRow = formatRow(fixedT);
    const vRow = formatRow(fixedV);
    const aRow = actions.length ? formatRow(actions) : '';
    return [
      '<div class="countsList" style="margin-top:0">',
      `<div class="row">${tRow}</div>`,
      `<div class="row">${vRow}</div>`,
      aRow ? `<div class="row">${aRow}</div>` : '',
      '</div>'
    ].join('');
  }catch(e){
    return '<div class="countsList"></div>';
  }
}

function init(){
  const p=game.player, a=game.ai;
  // v10.0.15: hard reset zones to avoid stale state
  p.deck.length=p.discard.length=p.hand.length=p.played.length=0;
  a.deck.length=a.discard.length=a.hand.length=a.played.length=0;
  for(let i=0;i<7;i++){ p.deck.push(instance('Copper')); a.deck.push(instance('Copper')); }
  for(let i=0;i<3;i++){ p.deck.push(instance('Estate')); a.deck.push(instance('Estate')); }
  shuffle(p.deck); shuffle(a.deck);
  game.turn='player'; game.phase='action'; game.actions=1; game.buys=1; game.coins=0; game.turnNum=1;
  for(let i=0;i<5;i++){ drawOne(p); drawOne(a); }
  game.initHandSize = Array.isArray(game?.player?.hand) ? game.player.hand.length : 5;

  document.getElementById('autoAdvance').checked=game.autoAdvance;
  document.getElementById('autoAdvance').onchange=(e)=>{ game.autoAdvance=e.target.checked; };
  const sel=document.getElementById('aiMode'); sel.value=game.aiMode; sel.onchange=(e)=>{ game.aiMode=e.target.value; toast(`AI set to ${game.aiMode}`); };
  const dbg=document.getElementById('debugAICheck'); dbg.checked=true; game.debugAI=true; dbg.onchange=(e)=>{ game.debugAI=e.target.checked; writeAIDebug([]); };

  // Top-right controls
  document.body.classList.add('compact');
  document.getElementById('newGameBtn').onclick = ()=> location.reload();
  document.getElementById('tutorialBtn').onclick = ()=>{ Coach.ensureInit(); Coach.restart(); };
  applyCompactControls();

  // Sound UI
  const v = document.getElementById('vol'); const m = document.getElementById('muteToggle');
  v.value = Math.round(Sound.vol*100); m.checked = Sound.muted;
  v.oninput = (e)=>{ Sound.setVolume((+e.target.value)/100); };
  m.onchange = (e)=>{ Sound.setMuted(!!e.target.checked); };

  lastCountsHTML = playerCountsHTML();
  const pc = document.getElementById('playerCounts'); if(pc) pc.innerHTML = lastCountsHTML;
  addLog(`Build ${BUILD.num} ready. Your turn [${game.turnNum}].`);
  updateUndoUI();
  render();
  Chat.init();
  Chat.startGame?.();
  window.addEventListener('load', function(){ try{ Coach.init?.(); Coach.maybeStart?.(); }catch(e){} });
  setTimeout(sanityCheckOnce, 50);
}



// ------------------- Keyboard Shortcuts -------------------
function firstPlayableActionIndex(){ if(game.turn!=='player' || game.phase!=='action' || game.actions<=0 || game.interactionLock) return -1; return game.player.hand.findIndex(c=>c.type==='Action'); }


/* v10.0.12: removed global keydown shortcuts */



// ------------------- Chat Bot (persisted) -------------------
const Chat = { elPanel:null, elBody:null, elInput:null, said:new Set(), storageKey:'dominion_chat_v1', init(){ this.elPanel = document.getElementById('chatPanel'); this.elBody  = document.getElementById('chatBody'); this.elInput = document.getElementById('chatInput'); document.getElementById('chatSend').onclick = ()=> this.send(); document.getElementById('clearChat').onclick = ()=> this.clear(); this.elInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); this.send(); } }); this.load(); }, scroll(){ this.elBody.scrollTop = this.elBody.scrollHeight; }, variant(text){ const suf = [' •',' …',' 🙂',' 🤖',' ✨',' !',' ~'][Math.floor(Math.random()*7)]; let v = text + suf; while(this.said.has(v)) v = text + suf + Math.floor(Math.random()*9); return v; }, post(role, text){ if(role==='bot'){ if(this.said.has(text)) text = this.variant(text); this.said.add(text); } const line = document.createElement('div'); line.className = 'msg ' + (role==='bot'?'bot':'user'); const bubble = document.createElement('div'); bubble.className='bubble'; bubble.textContent=text; line.appendChild(bubble); this.elBody.appendChild(line); this.persist(); this.scroll(); }, postUnique(lines){ const pool = lines.filter(t=> !this.said.has(t)); const pick = (arr)=> arr[Math.floor(Math.random()*arr.length)]; const chosen = (pool.length? pick(pool) : this.variant(pick(lines))); this.post('bot', chosen); }, persist(){ const items = [...this.elBody.querySelectorAll('.msg')].slice(-150).map(n=>({ role: n.classList.contains('bot')? 'bot':'user', text: n.querySelector('.bubble')?.textContent || '' })); try{ localStorage.setItem(this.storageKey, JSON.stringify({items, said:[...this.said].slice(-500)})); }catch(e){} }, load(){ try{ const raw = localStorage.getItem(this.storageKey); if(!raw) return; const data = JSON.parse(raw); this.said = new Set(Array.isArray(data?.said)? data.said: []); (data?.items||[]).forEach(it=> this.post(it.role, it.text)); }catch(e){} }, clear(){ this.elBody.innerHTML=''; this.said.clear(); this.persist(); }, send(){ const v = this.elInput.value.trim(); if(!v) return; this.post('user', v); this.elInput.value=''; setTimeout(()=> this.reply(v), 120); }, reply(text){ const t = text.toLowerCase(); if(t.includes('help')||t.includes('how')) return this.post('bot', 'Phases go Action → Treasure → Buy. Hit T to auto-play treasures, B to buy, Z to undo.'); if(t.includes('why') && t.includes('buy')) return this.post('bot', 'Simple plan: build economy (Silver/Gold), add Market/Festival, sprinkle Merchants, green when Provinces drop.'); if(t.includes('score')){ const {p,a}=computeScores(); return this.post('bot', `VP check → You: ${p}, AI: ${a}.`); } this.postUnique(['Auto-Treasure (T) saves clicks; Undo (Z) saves regrets.','Greening too early can stall—watch Province pile count.','Merchants love Silvers; your first Silver each turn gets bonus.','Workshop can fix economy: gain Silver or a key 4-cost like Smithy.']); }, say(evt, data){ if(evt==='shuffle'){ return this.postUnique(['Shuffle time! Minty fresh deck.','Cards doing cardio: shuffle complete.','Shuffled—your Estates promised to behave.','Riffle, riffle. Deal me a win.','New order, who dis?',]); } if(evt==='playerBuy'){ const mapping = { Province:'Province! Bold move. I can smell the victory points.', Market:'Bought a Market. Economy go brrr.', Festival:'Festival acquired. Confetti not included.', Laboratory:'Lab online. Please wear safety goggles while drawing cards.', Woodcutter:'Woodcutter hired. Lumber? I hardly know her.', Merchant:'Merchant secured. May your Silvers be lucrative.', Workshop:'Workshop online. Time to craft value.', }; return this.post('bot', mapping[data?.name] || `Picked up ${data?.name}. Nice.`); } if(evt==='aiTurn'){ const bought = (data?.bought||[]).join(', ') || 'nothing'; const lines=[`AI bought ${bought}. We can beat that.`,`AI turn over. My analysis: 🤖 mid.`, bought.includes('Province')? 'AI went green. Time to race!':'AI didn\'t touch Provinces. Opportunity knocks.', 'If AI buys nothing, we buy something shiny.','AI thinks long term. We think victory screen.',]; return this.postUnique(lines); } }
};



// ------------------- Sanity / smoke checks -------------------
function sanityCheckOnce(){ 
  if(window.__sanityDone) return; 
  window.__sanityDone = true; try{ LOG_SILENT = true; const supplyPiles = document.querySelectorAll('#supply .pile').length; const okSupply = supplyPiles >= 14 && SUPPLY.some(p=>p.key==='Market') && SUPPLY.some(p=>p.key==='Merchant') && SUPPLY.some(p=>p.key==='Workshop'); const okHand = Array.isArray(game.player.hand) && game.player.hand.length === (game.initHandSize||5); const okFns = typeof CARD_DEFS?.Smithy?.effect === 'function' && typeof cardIcon === 'function'; const okChatRaised = parseInt(getComputedStyle(document.getElementById('chatPanel')).bottom,10) >= 60; const dummy = { actions:0, buys:0, coins:0, player:{deck:[],discard:[],hand:[],played:[]}, ai:{}, aiActions:0, aiBuys:0, aiCoins:0, merchantPending:{player:0,ai:0} }; CARD_DEFS.Woodcutter.effect(dummy, dummy.player); const okPlusBuy = dummy.buys===1 && dummy.coins===2; CARD_DEFS.Laboratory.effect(dummy, dummy.player); const okLabAction = dummy.actions===1; CARD_DEFS.Merchant.effect(dummy, dummy.player); const okMerchantFlag = dummy.merchantPending.player===1; openGainChoice(4, dummy.player, 'Test'); const nameLayoutOK = document.querySelector('#choiceGrid .name .label')!==null; closeChoiceOverlay(); LOG_SILENT = false; if(!(okSupply && okHand && okFns && okPlusBuy && okLabAction && okMerchantFlag && okChatRaised && nameLayoutOK)){ const msg = `Sanity failed (supply:${okSupply}, hand5:${okHand}, fns:${okFns}, +Buy:${okPlusBuy}, lab+Action:${okLabAction}, merchantFlag:${okMerchantFlag}, chatRaised:${okChatRaised}, choiceLayout:${nameLayoutOK}).`; console.error(msg); toast(msg); } else { console.log('Sanity check passed.'); } }catch(e){ LOG_SILENT=false; console.error('Sanity check exception', e); toast('Sanity check exception'); } }



// ------------------- Start -------------------
init();



// ------------------- Log & Tooltip -------------------
LOG_MAX =  10; LOG_SILENT = false; logs =  [];
function addLog(msg, cls){ if(LOG_SILENT) return; logs.push({msg, cls}); while(logs.length>LOG_MAX) logs.shift(); const el = document.getElementById('log'); if(el) el.innerHTML = logs.map(l=>`<span class="${l.cls||''}">• ${l.msg}</span>`).join('\n'); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1800); }
let tooltipEl = document.getElementById('tooltip') || document.getElementById('tooltipEl');function showTip(html, x, y){ if(!tooltipEl){ tooltipEl=document.getElementById("tooltip")||document.getElementById("tip"); if(!tooltipEl) return; } tooltipEl.innerHTML = html; tooltipEl.style.display='block'; const pad=10; const w=260; const h= tooltipEl.offsetHeight||100; let left = Math.min(window.innerWidth - w - pad, x + 14); let top  = Math.min(window.innerHeight - h - pad, y + 14); tooltipEl.style.left = left + 'px'; tooltipEl.style.top = top + 'px'; }
function hideTip(){ if(!tooltipEl){ tooltipEl=document.getElementById("tooltip")||document.getElementById("tip"); if(!tooltipEl) return; } tooltipEl.style.display='none'; }
function cardTip(def){ const meta = []; if(def.type==='Treasure') meta.push(`+${def.value} coins`); if(def.type==='Victory') meta.push(`${def.points} VP`); if(def.type==='Action') meta.push(def.desc||'Action'); return `<div class="tTitle">${def.name}</div><div class="tMeta">Type: ${def.type} · Cost: ${def.cost}</div><div style=\"margin-top:4px\">${meta.join(' · ')}</div>`; }



// ------------------- Choice overlay (Workshop) -------------------
function openGainChoice(maxCost, actor, source){
  game.interactionLock = true; updateUndoUI();
  const over = document.getElementById('choiceOverlay');
  const grid = document.getElementById('choiceGrid'); grid.innerHTML = '';
  document.getElementById('choiceTitle').textContent = 'Gain a card';
  document.getElementById('choiceDetail').textContent = `Pick a card costing up to ${maxCost}.`;
  const eligible = SUPPLY.filter(p=> p.count>0 && CARD_DEFS[p.key].cost<=maxCost);
  eligible.sort((a,b)=> CARD_DEFS[b.key].cost - CARD_DEFS[a.key].cost || a.key.localeCompare(b.key));
  eligible.forEach(pile=>{
    const def = CARD_DEFS[pile.key];
    const el = document.createElement('div'); el.className='pile';
    el.innerHTML = `
      <div class=\"count\">${pile.count}</div>
      <div class=\"name\">
        <div class=\"icon\">${cardIcon(def.name)}</div>
        <div class=\"label\">${def.name}</div>
      </div>
      
    `;
    el.onclick = ()=>{
      Sound.play('gain'); pile.count--; actor.discard.push(instance(def.name));
      addLog(`You gained ${def.name} with ${source}.`);
      over.classList.remove('show');
      game.interactionLock = false; updateUndoUI(); checkEndgameFlags(); render();
    };
    el.addEventListener('mouseenter', (e)=> { const tip = cardTip(def) + `<div class=\"tcount\"><div class="tcount">Remaining: ${getSupplyRemaining(def)}</div></div>`; showTip(tip, e.pageX, e.pageY); });
    el.addEventListener('mousemove',  (e)=> { const tip = cardTip(def) + `<div class=\"tcount\"><div class="tcount">Remaining: ${getSupplyRemaining(def)}</div></div>`; showTip(tip, e.pageX, e.pageY); });
    el.addEventListener('mouseleave', hideTip);
    grid.appendChild(el);
  });
  over.classList.add('show');
}



// ------------------- Rendering -------------------
function render(){
  // v10.0.9: ensure hover bindings after render
  bindCardHover();
  syncLockFromOverlay();
  document.getElementById('actions').textContent = game.actions;
  document.getElementById('buys').textContent    = game.buys;
  document.getElementById('coins').textContent   = game.coins;
  document.getElementById('phase').textContent   = game.phase.charAt(0).toUpperCase()+game.phase.slice(1);
  const {p,a} = computeScores();
  document.getElementById('pScore').textContent = p;
  document.getElementById('aScore').textContent = a;
  const pc = document.getElementById('playerCounts'); if(pc) pc.innerHTML = lastCountsHTML;

  // SUPPLY
  const s = document.getElementById('supply'); s.innerHTML='';
  const groups = [ { title:'Treasure', type:'Treasure' }, { title:'Victory Cards', type:'Victory' }, { title:'Action Cards', type:'Action' } ];
  const sortMetric = (def, type)=> type==='Victory' ? (def.points||0) : def.cost;
  groups.forEach(g=>{
    const sec = document.createElement('div'); sec.className='supplySection';
    const h = document.createElement('h3'); h.textContent = g.title; sec.appendChild(h);
    const grid = document.createElement('div'); grid.className='supplyGrid'; sec.appendChild(grid);

    SUPPLY.filter(p=>CARD_DEFS[p.key].type===g.type)
      .sort((a,b)=>{ const da=CARD_DEFS[a.key], db=CARD_DEFS[b.key]; const va=sortMetric(da,g.type), vb=sortMetric(db,g.type); return vb-va || a.key.localeCompare(b.key); })
      .forEach(pile=>{
        const def = CARD_DEFS[pile.key];
        const el = document.createElement('div'); el.className='pile'; if(pile.count===0) el.classList.add('empty');
        el.innerHTML = `
          <div class=\"nameRow\">${cardIcon(def.name)} <span class=\"label\">${def.name}</span></div>
        `;
        const canBuy = (!game.gameOver && !game.interactionLock && game.turn==='player' && game.phase==='buy' && game.buys>0 && game.coins>=def.cost && pile.count>0);
        if(canBuy){ el.onclick = ()=>buy(def.name); el.classList.remove('disabled'); el.classList.add('buyable'); }
        else { el.classList.add('disabled'); el.classList.remove('buyable'); el.onclick = null; }
        el.addEventListener('mouseenter', (e)=> { const tip = cardTip(def) + `<div class=\"tcount\"><div class="tcount">Remaining: ${getSupplyRemaining(def)}</div></div>`; showTip(tip, e.pageX, e.pageY); });
        el.addEventListener('mousemove',  (e)=> { const tip = cardTip(def) + `<div class=\"tcount\"><div class="tcount">Remaining: ${getSupplyRemaining(def)}</div></div>`; showTip(tip, e.pageX, e.pageY); });
        el.addEventListener('mouseleave', hideTip);
        grid.appendChild(el);
      });
    s.appendChild(sec);
  });

  // HAND
  const hand = document.getElementById('player-hand'); hand.innerHTML='';
  const indexed = game.player.hand.map((c,idx)=>({c,idx}));
  const groupRank = { Action:0, Treasure:1, Victory:2 };
  indexed.sort((a,b)=>{ const ga = groupRank[a.c.type] ?? 3; const gb = groupRank[b.c.type] ?? 3; if(ga!==gb) return ga-gb; if(a.c.type==='Action' && b.c.type==='Action') return a.c.name.localeCompare(b.c.name); if(a.c.type==='Treasure' && b.c.type==='Treasure') return (b.c.value||0)-(a.c.value||0) || a.c.name.localeCompare(b.c.name); if(a.c.type==='Victory' && b.c.type==='Victory') return (b.c.points||0)-(a.c.points||0) || a.c.name.localeCompare(b.c.name); return a.c.name.localeCompare(b.c.name); });
  indexed.forEach(({c,idx})=>{
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<div class=\"title\">${cardIcon(c.name)} ${c.name}</div><div class=\"type\">${c.type}</div>`;
    const canPlayAction = (!game.gameOver && !game.interactionLock && c.type==='Action' && game.turn==='player' && game.phase==='action' && game.actions>0);
    const canPlayTreasure = (!game.gameOver && !game.interactionLock && c.type==='Treasure' && game.turn==='player' && game.phase!=='buy');
    if(canPlayAction || canPlayTreasure){ el.classList.add('playable'); el.onclick = ()=>play(idx); }
    else { el.classList.add('disabled'); el.onclick = null; }
    const def = CARD_DEFS[c.name];
    hand.appendChild(el);
  });

  // Buttons
  document.getElementById('endTurnBtn').onclick = ()=>{ if(!game.interactionLock){ Sound.play('end'); endTurn(); } };
  document.getElementById('autoTreasureBtn').onclick = ()=>{ if(game.interactionLock) return; if(game.phase==='action') game.phase='treasure'; snapshot(); autoPlayTreasures(); };
  document.getElementById('toBuyBtn').onclick = ()=>{ if(game.interactionLock) return; if(game.phase!=='buy'){ snapshot(); game.phase='buy'; addLog('Buy phase. Buying disables further card play this turn.'); render(); } };
  document.getElementById('undoBtn').onclick = undo;

  const changed = maybeAutoAdvance();
  if(changed) return render();
}

function endIfNeeded(){ if(game.endAfterThisTurn){ game.gameOver=true; showWinner(); return true; } return false; }



// v9.3.14: clamp log to last LOG_MAX lines even if other code appends
(function(){
  function clampLogTail(){
    var el = document.getElementById('log');
    if(!el) return;
    var lines = (el.textContent || "").split(/\r?\n/);
    if (lines.length > LOG_MAX) el.textContent = lines.slice(-LOG_MAX).join('\n');
  }
  function installClamp(){
    var el = document.getElementById('log');
    if(!el) return;
    var mo = new MutationObserver(function(){ clampLogTail(); });
    mo.observe(el, {characterData:true, childList:true, subtree:true});
    clampLogTail();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installClamp, { once:true });
  else installClamp();
})();



document.addEventListener('DOMContentLoaded', ()=>{
  try {
    let el = document.getElementById('build');
    if (!el) { el = document.createElement('div'); el.id = 'build'; el.className = 'build'; document.body.appendChild(el); }
    const date = (typeof BUILD!=='undefined' && BUILD.date) ? BUILD.date : new Date().toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'});
    const num  = (typeof BUILD!=='undefined' && BUILD.num)  ? BUILD.num  : 'v?';
    el.textContent = `Build ${num} • ${date}`;
  } catch(e) {}
});



const Coach=(function(){let s=0;const steps=[
{title:"Welcome!",text:"Phases: Action → Treasure → Buy."},
{title:"Supply",text:"Click piles during Buy to gain cards."},
{title:"Hand",text:"Play Actions, then Treasures, then Buy."},
{title:"Status",text:"Watch Actions, Buys, Coins. A,T,B,E,Z."},
{title:"Go win!",text:"Build economy, then green at the right time."}
];function show(){const o=document.getElementById('coach');if(!o)return;o.classList.add('show');sync();}
function hide(){const o=document.getElementById('coach');if(o)o.classList.remove('show');}
function sync(){const t=document.getElementById('coachTitle');const d=document.getElementById('coachText');if(t&&d){t.textContent=steps[s].title;d.textContent=steps[s].text;}}
function next(){s++;if(s>=steps.length){hide();return;}sync();}
function restart(){s=0;show();}
function init(){const n=document.getElementById('coachNext');const sk=document.getElementById('coachSkip');if(n)n.onclick=next;if(sk)sk.onclick=hide;const btn=document.getElementById('tutorialBtn');if(btn)btn.onclick=restart;}
function ensureInit(){init();}
return{init,ensureInit,restart,maybeStart:()=>{}};})();



if(typeof init==='function'){
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init,{once:true});}
  else{init();}
}

function bindCardHover(){ /* v10.0.27: disabled; using delegated hover */ }

function bindDelegatedHover(){
  if (bindDelegatedHover._bound) return; bindDelegatedHover._bound = true;
  const root = document;
  const getCard = (el)=> el && el.closest ? el.closest('.card') : null;
  root.addEventListener('mouseover', function(ev){
    const card = getCard(ev.target);
    if(!card) return;
    if(card.closest && card.closest('#player-hand')){ try{ if (typeof hideTip==='function') hideTip(); }catch(e){} return; }
    try{
      const key = card.dataset.key || card.dataset.card || card.dataset.name || card.getAttribute('data-key') || card.getAttribute('data-name');
      const def = (typeof CARD_DEFS!=='undefined' && key) ? CARD_DEFS[key] : null;
      if(def && typeof showTip==='function'){
        let tip = cardTip(def);
      const cnt = getSupplyCount(def.key);
      if (cnt !== '' && tip.indexOf('tcount') === -1) {
        tip = tip.replace('</div></div>', `<div class="tcount"><div class="tcount">Remaining: ${getSupplyRemaining(def)}</div></div></div>`);
      }
        showTip(tip, ev.pageX, ev.pageY);
      }
    }catch(e){}
  }, true);
  root.addEventListener('mousemove', function(ev){
    const card = getCard(ev.target);
    if(!card) return;
    if(card.closest && card.closest('#player-hand')){ try{ if (typeof hideTip==='function') hideTip(); }catch(e){} return; }
    try{
      if(typeof showTip==='function'){ showTip(null, ev.pageX, ev.pageY); }
    }catch(e){}
  }, true);
  root.addEventListener('mouseout', function(ev){
    try{ if(typeof hideTip==='function') hideTip(); }catch(e){}
  }, true);
}
document.addEventListener('DOMContentLoaded', bindDelegatedHover);

// v10.0.28 supply count helper
function getSupplyCount(key){
  try{
    if (typeof SUPPLY==='undefined') return '';
    const p = SUPPLY.find(x=> x.key===key);
    return p ? (p.count||0) : '';
  }catch(e){ return ''; }
}


// v10.0.29 chat minimize toggle
function toggleChatMin(){
  const panel = document.getElementById('chatPanel');
  if(!panel) return;
  panel.classList.toggle('minimized');
}
document.addEventListener('DOMContentLoaded', function(){
  const b = document.getElementById('chatMinBtn');
  if(b){ b.addEventListener('click', toggleChatMin); }
});


// v10.0.61 — AI Buy Overlay (scores + highlight)
(function(){
  const Overlay = {
    els:{},
    clear(){ try{ Object.values(this.els).forEach(e=>e&&e.remove()); }catch(_){ } this.els={}; },
    _pos(pile){
      try{
        const r = pile.getBoundingClientRect();
        return { left: (r.left + window.scrollX + 6) + 'px', top: (r.top + window.scrollY - 18) + 'px' };
      }catch(_){ return {left:'0px', top:'0px'}; }
    },
    _findPile(card){
      let sel = `[data-card='${card}'],[data-key='${card}'],[data-name='${card}']`;
      let el = document.querySelector(sel);
      if(!el){
        // fallback: match by text label
        el = Array.from(document.querySelectorAll('#supply .pile, #supply [data-card], #supply .card')).find(n => (n.textContent||'').trim().startsWith(card));
      }
      return el || null;
    },
    showScores(scores, chosen){
      this.clear();
      Object.entries(scores||{}).forEach(([card, score])=>{
        const pile = this._findPile(card);
        if(!pile) return;
        const box = document.createElement('div');
        box.textContent = (typeof score==='number' && isFinite(score)) ? score.toFixed(2) : String(score);
        const pos = this._pos(pile);
        Object.assign(box.style, {
          position:'absolute', left:pos.left, top:pos.top, padding:'2px 4px', fontSize:'11px',
          borderRadius:'4px', background:(card===chosen?'#0EA5E9':'rgba(0,0,0,0.6)'), color:'#fff',
          pointerEvents:'none', zIndex:9999, fontWeight:(card===chosen?'700':'600')
        });
        document.body.appendChild(box);
        this.els[card]=box;
        if(card===chosen && box.animate){
          box.animate([{opacity:1},{opacity:0.4},{opacity:1}], {duration:1000, iterations:Infinity});
        }
      });
    }
  };
  window.AIOverlay = Overlay;

  function computeNaiveScores(game){
    const scores = {};
    try{
      const supply = (typeof SUPPLY==='object' && SUPPLY.length)? SUPPLY.map(p=>p.name||p.key||p.card||p) : [];
      const coins = game?.aiCoins ?? 0;
      supply.forEach(name=>{
        const def = (window.CARD_DEFS && window.CARD_DEFS[name]) || null;
        const pile = (typeof getPile==='function') ? getPile(name) : null;
        const affordable = def ? (def.cost<=coins) : false;
        const avail = pile ? (pile.count>0) : 0;
        // simple score: cost fit + availability + slight preference for Victory when coins high
        let s = 0;
        if(affordable) s += 1;
        if(avail) s += 0.2;
        if(def && /Province|Duchy|Estate/i.test(def.name) && coins>=5) s += 0.1;
        if(def && /Gold|Silver/i.test(def.name)) s += 0.05;
        s += (def? Math.min(def.cost,8)/100 : 0); // tie-breaker
        scores[name]=Number(s.toFixed(2));
      });
    }catch(_){}
    return scores;
  }

  function wrapBuyChooser(fnName){
    const g = window.game || null;
    if(!g) return;
    const orig = window[fnName];
    if(typeof orig !== 'function') return;
    if(orig.__wrapped) return;
    function wrapped(debug){
      try{
        const scores = computeNaiveScores(window.game);
        const choice = orig.call(this, debug);
        if(scores && Object.keys(scores).length){
          // promote chosen card to look highest for clarity
          if(choice && (choice in scores)) scores[choice] = Number((scores[choice] + 0.8).toFixed(2));
          Overlay.showScores(scores, choice);
        }
        return choice;
      }catch(e){
        try{ return orig.call(this, debug); }catch(_){ return orig.apply(this, arguments); }
      }
    }
    wrapped.__wrapped = true;
    window[fnName] = wrapped;
  }

  function integrate(){
    ['aiChooseBuyStrong','aiChooseBuyWeak'].forEach(wrapBuyChooser);
  }

  if(document.readyState==='complete' || document.readyState==='interactive'){
    setTimeout(integrate, 0);
  }else{
    document.addEventListener('DOMContentLoaded', integrate, {once:true});
  }
})();


// v10.0.62 — Robust AI overlay integration: wait for aiChooseBuy* and wrap when present
(function(){
  function install(){
    try{
      var weak = (typeof window.aiChooseBuyWeak === 'function') ? window.aiChooseBuyWeak : null;
      var strong = (typeof window.aiChooseBuyStrong === 'function') ? window.aiChooseBuyStrong : null;
      var any = [weak, strong].some(Boolean);
      if(!any) return false;
      function wrap(fn){
        if(!fn || fn.__wrapped) return fn;
        var orig = fn;
        function wrapped(){
          try{
            var scores = (window.AIOverlay && window.AIOverlay.computeNaiveScores) ? window.AIOverlay.computeNaiveScores(window.game||{}) : (typeof computeNaiveScores==='function'? computeNaiveScores(window.game||{}): null);
            var choice = orig.apply(this, arguments);
            if(window.AIOverlay && scores){ 
              if(choice && (choice in scores)) scores[choice] = Number((scores[choice] + 0.8).toFixed(2));
              window.AIOverlay.showScores(scores, choice);
            }
            return choice;
          }catch(e){ return orig.apply(this, arguments); }
        }
        wrapped.__wrapped = true;
        return wrapped;
      }
      if(weak) window.aiChooseBuyWeak = wrap(weak);
      if(strong) window.aiChooseBuyStrong = wrap(strong);
      return true;
    }catch(e){ return false; }
  }
  var tries = 0;
  var t = setInterval(function(){
    if(install() || ++tries>50){ clearInterval(t); }
  }, 100);
})();


// v10.0.63 — Replace single-letter key hints with helpful descriptions on controls
document.addEventListener('DOMContentLoaded', function(){
  try{
    const map = [
      {ids:['goToBuyBtn','gotoBuyBtn','buyPhaseBtn'], text:'Click here to Switch to the Buy phase where you can buy Treasure, Victory Card or Action cards'},
      {ids:['autoTreasureBtn','autoPlayBtn','playAllTreasuresBtn'], text:'Click here to automatically play all available treasure instead of clicking them one by one'},
      {ids:['undoBtn','undoLastBtn'], text:'Click here to undo certain kinds of mistakes. You cannot undo when you draw extra cards for example'},
      {ids:['endTurnBtn','endBtn'], text:'Click here to finally let the AI have a chance to play!'}
    ];
    const rmSel = '.hotkey,.key,.kbd,.hk,.shortcut,[data-hotkey],[data-key]';
    map.forEach(entry=>{
      entry.ids.forEach(id=>{
        const btn = document.getElementById(id);
        if(!btn) return;
        // strip trailing "(X)"
        if (btn.firstChild && btn.firstChild.nodeType === 3) {
          btn.firstChild.nodeValue = btn.firstChild.nodeValue.replace(/\(\s*[A-Z]\s*\)\s*$/, '').trim() + ' ';
        } else {
          btn.textContent = (btn.textContent||'').replace(/\(\s*[A-Z]\s*\)\s*$/, '').trim();
        }
        // remove any old badge spans
        btn.querySelectorAll(rmSel).forEach(n=>n.remove());
        // set tooltip and aria
        btn.setAttribute('title', entry.text);
        btn.setAttribute('aria-label', entry.text);
        // if a badge container is recreated later, convert its text
        const mo = new MutationObserver(function(muts){
          muts.forEach(m=>{
            if(m.addedNodes){
              m.addedNodes.forEach(n=>{
                try{
                  if(n.nodeType===1 && (n.matches && n.matches(rmSel))) n.textContent = entry.text;
                }catch(_){}
              });
            }
          });
        });
        mo.observe(btn, {childList:true, subtree:true});
        btn.__hintMO = mo;
      });
    });
  }catch(_){}
});



// v10.0.72 — minimal sweep to strip letters and set data-help (no observers)
(function(){
  const MAP = [
    {ids:['goToBuyBtn','gotoBuyBtn','buyPhaseBtn','goToBuyPhaseBtn','buyBtn','buy_button'], text:'Click here to Switch to the Buy phase where you can buy Treasure, Victory Card or Action cards', match:/\b(Buy|Go to Buy|Buy Phase)\b/i},
    {ids:['autoTreasureBtn','autoPlayBtn','playAllTreasuresBtn'], text:'Click here to automatically play all available treasure instead of clicking them one by one', match:/Treasure/i},
    {ids:['undoBtn','undoLastBtn'], text:'Click here to undo certain kinds of mistakes. You cannot undo when you draw extra cards for example', match:/Undo/i},
    {ids:['endTurnBtn','endBtn'], text:'Click here to finally let the AI have a chance to play!', match:/End\s*Turn/i}
  ];
  function findBtn(cfg){
    for(const id of cfg.ids){ const el = document.getElementById(id); if(el) return el; }
    const cands = Array.from(document.querySelectorAll('button,[role="button"],.btn'));
    return cands.find(el => cfg.match.test((el.textContent||'').trim())) || null;
  }
  function stripAndMark(btn, text){
    if(!btn) return false;
    try{
      if (btn.firstChild && btn.firstChild.nodeType===3){
        btn.firstChild.nodeValue = btn.firstChild.nodeValue.replace(/\s*\([A-Z]\)\s*$/, '').trim();
      } else {
        btn.textContent = (btn.textContent||'').replace(/\s*\([A-Z]\)\s*$/, '').trim();
      }
      btn.querySelectorAll('.hotkey,.key,.kbd,.shortcut,[data-hotkey],[data-key]').forEach(n=>n.remove());
      // data-help for CSS tooltip (and remove native title to avoid OS tooltip)
      btn.dataset.help = text;
      if (btn.hasAttribute('title')) btn.removeAttribute('title');
      return true;
    }catch(_){ return false; }
  }
  function sweep(){
    MAP.forEach(cfg => stripAndMark(findBtn(cfg), cfg.text));
  }
  function run(){
    sweep();
    // retry a few times to handle late layout init without observers
    let count=0, t=setInterval(()=>{ sweep(); if(++count>6) clearInterval(t); }, 300);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, {once:true});
  } else {
    run();
  }
})();



// v10.0.77 — JS tooltip (fixed 250x400, black) + reliable bindings
(function(){
  const HELP = {
    buy:  'Click here to Switch to the Buy phase where you can buy Treasure, Victory Card or Action cards',
    auto: 'Click here to automatically play all available treasure instead of clicking them one by one',
    undo: 'Click here to undo certain kinds of mistakes. You cannot undo when you draw extra cards for example',
    end:  'Click here to finally let the AI have a chance to play!'
  };
  const MAP = [
    {ids:['goToBuyBtn','gotoBuyBtn','buyPhaseBtn','goToBuyPhaseBtn','buyBtn','buy_button'], key:'buy', match:/\b(Buy|Go to Buy|Buy Phase)\b/i},
    {ids:['autoTreasureBtn','autoPlayBtn','playAllTreasuresBtn'], key:'auto', match:/Treasure/i},
    {ids:['undoBtn','undoLastBtn'], key:'undo', match:/Undo/i},
    {ids:['endTurnBtn','endBtn'], key:'end', match:/End\s*Turn/i}
  ];

  let tipEl;
  function ensureTip(){
    if(!tipEl){
      tipEl = document.createElement('div');
      tipEl.id = 'help-tip';
      tipEl.className = 'help-tip';
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
  function showTip(target, text){
    const el = ensureTip();
    el.textContent = text;
    const r = target.getBoundingClientRect();
    const W = 250, H = 150, M = 8;
    // Center horizontally within viewport
    const left = Math.max(M, Math.min((r.left + r.right)/2 - W/2, window.innerWidth - W - M));
    // Prefer above: tooltip bottom touches button top; else below touching
    let top = r.top - H;
    if (top < M) top = r.bottom;
    el.style.left = Math.round(left) + 'px';
    el.style.top  = Math.round(top) + 'px'; // fixed positioning (no scrollY)
    el.classList.add('show');
  }
  function hideTip(){ if(tipEl) tipEl.classList.remove('show'); }

  function findBtn(cfg){
    for(const id of cfg.ids){ const el = document.getElementById(id); if(el) return el; }
    const cands = Array.from(document.querySelectorAll('button,[role="button"],.btn'));
    return cands.find(el => cfg.match.test((el.textContent||'').trim())) || null;
  }

  function stripBadge(btn){
    try{
      if(!btn) return;
      if (btn.firstChild && btn.firstChild.nodeType===3){
        btn.firstChild.nodeValue = btn.firstChild.nodeValue.replace(/\s*\([A-Z]\)\s*$/, '').trim();
      }else{
        btn.textContent = (btn.textContent||'').replace(/\s*\([A-Z]\)\s*$/, '').trim();
      }
      btn.querySelectorAll('.hotkey,.key,.kbd,.shortcut,[data-hotkey],[data-key]').forEach(n=>n.remove());
    }catch(_){}
  }

  function wireOnce(){
    MAP.forEach(cfg => {
      const btn = findBtn(cfg);
      if(!btn) return;
      stripBadge(btn);
      ['mouseenter','focus'].forEach(ev => btn.addEventListener(ev, ()=>showTip(btn, HELP[cfg.key])));
      ['mouseleave','blur'].forEach(ev => btn.addEventListener(ev, hideTip));
    });
  }

  function boot(){
    wireOnce();
    // retry a few times in case controls mount late
    let tries=0; const t=setInterval(()=>{ wireOnce(); if(++tries>6) clearInterval(t); }, 300);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }
})();



// v10.0.83 — restore Table Talk minimize (delegated, precise selectors)
(function(){
  function panel(){ return document.getElementById('tableTalk') || document.getElementById('chatPanel'); }
  const SELECTOR = '#tableTalkMin, #chatMinimize, [data-tt-min]';
  document.addEventListener('click', function(ev){
    const btn = ev.target && ev.target.closest ? ev.target.closest(SELECTOR) : null;
    if(!btn) return;
    const p = panel();
    if(!p) return;
    ev.preventDefault(); ev.stopPropagation();
    p.classList.toggle('min');
    p.classList.toggle('minimized');
  }, true);
})();



// v10.0.83 — guard: never show help/supply tooltips over Your Hand
(function(){
  document.addEventListener('mouseover', function(e){
    try{
      const inHand = e.target && e.target.closest && e.target.closest('#player-hand');
      if(inHand && window.hideTip){ hideTip(); }
    }catch(_){}
  }, true);
})();



// v10.0.84 — harden Table Talk minimize
(function(){
  function panel(){ return document.getElementById('tableTalk') || document.getElementById('chatPanel'); }
  function headerEl(p){
    return p && (p.querySelector('.header, .panel-header, .chat-header, header, .titlebar') || p);
  }
  function ensureMinBtn(p){
    if (!p) return null;
    let btn = p.querySelector('#tableTalkMin, #chatMinimize, [data-tt-min]');
    if (!btn){
      const h = headerEl(p);
      if(!h) return null;
      btn = document.createElement('button');
      btn.id = 'tableTalkMin';
      btn.type = 'button';
      btn.setAttribute('aria-label','Minimize Table Talk');
      btn.textContent = '–';
      btn.style.marginRight = '8px';
      btn.style.width = '24px'; btn.style.height='24px';
      btn.style.lineHeight='20px'; btn.style.borderRadius='6px';
      btn.style.border='1px solid #888'; btn.style.background='#111'; btn.style.color='#fff';
      // insert at far left of header
      h.insertBefore(btn, h.firstChild);
    }
    return btn;
  }
  function toggleMin(p){
    if(!p) return;
    p.classList.toggle('min');
    p.classList.toggle('minimized');
    const isMin = p.classList.contains('min') || p.classList.contains('minimized');
    p.style.setProperty('--tt-min-height','120px');
    if(isMin){
      p.style.height = 'var(--tt-min-height)';
      p.style.overflow = 'hidden';
    }else{
      p.style.height = '';
      p.style.overflow = '';
    }
  }
  function wire(){
    const p = panel(); if(!p) return;
    const btn = ensureMinBtn(p);
    if(btn && !btn.__wired84){
      btn.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); toggleMin(p); }, true);
      btn.__wired84 = true;
    }
  }
  // delegated safety net
  document.addEventListener('click', function(ev){
    const t = ev.target && ev.target.closest && ev.target.closest('#tableTalkMin, #chatMinimize, [data-tt-min]');
    if(!t) return;
    const p = panel(); if(!p) return;
    ev.preventDefault(); ev.stopPropagation();
    toggleMin(p);
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, {once:true});
  else wire();
  // Retry a few times in case DOM mounts late
  let tries=0; const t=setInterval(()=>{ wire(); if(++tries>6) clearInterval(t); }, 300);
})();



// v10.0.84 — guard: suppress any tooltip creation in Your Hand
(function(){
  function inHand(target){ return !!(target && target.closest && target.closest('#player-hand')); }
  ['mouseover','mousemove','mouseenter','pointerover','pointerenter'].forEach(ev=>{
    document.addEventListener(ev, function(e){
      if(inHand(e.target)){
        try{ e.stopPropagation(); }catch(_){}
        try{ if(window.hideTip) hideTip(); }catch(_){}
      }
    }, true);
  });
  // remove any pre-existing tooltip nodes on first hover over hand
  document.addEventListener('mouseover', function(e){
    if(!inHand(e.target)) return;
    try{
      document.querySelectorAll('.tip,.tooltip,.tt,[role="tooltip"]').forEach(n=>n.remove());
    }catch(_){}
  }, true);
})();

