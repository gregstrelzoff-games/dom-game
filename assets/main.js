// ------------------- Build Tag & Favicon -------------------

const BUILD = { num: 'v9.3.4', date: new Date().toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'}) };
(function(){
  document.getElementById('build').textContent = `Build ${BUILD.num} • ${BUILD.date}`;
  // Use provided G.png as favicon when available

const candidates = ['G.png','./G.png','/mnt/data/G.png'];

function setFav(url){

let link=document.querySelector('link[rel="icon"]'); if(!link){ link=document.createElement('link'); link.rel='icon'; document.head.appendChild(link);} link.href=url; }
  (

function tryNext(i){ if(i>=candidates.length) return;

const img=new Image(); img.onload=()=> setFav(candidates[i]); img.onerror=()=> tryNext(i+1); img.src=candidates[i]; })(0);
})();

// ------------------- Sound Engine -------------------

const Sound = {
  ctx: null, master: null, vol: 0.6, muted: false, key:'dominion_sound_v1',
  ensure(){ if(this.ctx) return; try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted?0:this.vol; this.master.connect(this.ctx.destination); }catch(e){ console.warn('Audio init failed', e); } },
  resume(){ try{ this.ensure(); if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); }catch(e){} },
  setVolume(v){ this.vol = v; if(this.master && !this.muted) this.master.gain.value = this.vol; this.persist(); },
  setMuted(m){ this.muted = m; if(this.master) this.master.gain.value = this.muted?0:this.vol; this.persist(); },
  persist(){ try{ localStorage.setItem(this.key, JSON.stringify({vol:this.vol, muted:this.muted})); }catch(e){} },
  load(){ try{

const s = JSON.parse(localStorage.getItem(this.key)||'null'); if(s){ this.vol = s.vol??this.vol; this.muted = !!s.muted; } }catch(e){} },
  now(){ this.ensure(); return this.ctx? this.ctx.currentTime : 0; },
  env(node, t, a=0.005, d=0.08, s=0.0, r=0.12, g=0.5){

const gnode = this.ctx.createGain(); node.connect(gnode); gnode.connect(this.master);

const v = g; gnode.gain.setValueAtTime(0, t); gnode.gain.linearRampToValueAtTime(v, t+a); gnode.gain.linearRampToValueAtTime(v*s, t+a+d); gnode.gain.linearRampToValueAtTime(0.0001, t+a+d+r); },
  tone(freq=440, dur=0.12, type='sine', gain=0.5){ if(!this.ctx || this.muted) return;

const t=this.now();

const o=this.ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(freq, t); this.env(o,t,0.005, dur*0.6, 0.0, dur*0.4, gain); o.start(t); o.stop(t+dur+0.2); },
  chirp(f1=300, f2=900, dur=0.15, type='triangle', gain=0.35){ if(!this.ctx || this.muted) return;

const t=this.now();

const o=this.ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t+dur); this.env(o,t,0.005, dur*0.7, 0.0, 0.12, gain); o.start(t); o.stop(t+dur+0.2); },
  noise(dur=0.15, gain=0.25, band=[300,2000]){ if(!this.ctx || this.muted) return;

const t=this.now();

const buf=this.ctx.createBuffer(1, this.ctx.sampleRate*dur, this.ctx.sampleRate);

const data=buf.getChannelData(0); for(

let i=0;i<data.length;i++){ data[i]=Math.random()*2-1; }

const src=this.ctx.createBufferSource(); src.buffer=buf;

let node=src; if(band){

const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=(band[0]+band[1])/2; bp.Q.value=3; src.connect(bp); node=bp; } this.env(node,t,0.005, dur*0.5, 0.0, 0.15, gain); src.start(t); src.stop(t+dur+0.2); },
  seq(notes){ if(!this.ctx || this.muted) return;

const base=this.now(); notes.forEach(n=>{

const t=base+(n.t||0);

const o=this.ctx.createOscillator(); o.type=n.type||'sine'; o.frequency.setValueAtTime(n.f, t); this.env(o,t,0.005,(n.d||0.1)*0.7,0.0,(n.d||0.1)*0.3,n.g||0.4); o.start(t); o.stop(t+(n.d||0.1)+0.2); }); },
  play(kind){ switch(kind){ case 'draw': this.chirp(320,520,0.08,'triangle',0.25); break; case 'action': this.chirp(420,860,0.12,'triangle',0.35); break; case 'coins': this.seq([{t:0,f:900,d:0.05,g:0.35,type:'square'},{t:0.06,f:1200,d:0.05,g:0.25,type:'square'}]); break; case 'buy': this.seq([{t:0,f:660,d:0.1,g:0.35},{t:0.12,f:990,d:0.1,g:0.25}]); break; case 'shuffle': this.noise(0.25,0.22,[200,3000]); break; case 'attack': this.seq([{t:0,f:220,d:0.14,g:0.4,type:'sawtooth'},{t:0.1,f:180,d:0.12,g:0.35,type:'sawtooth'}]); break; case 'reaction': this.chirp(500,1000,0.16,'sine',0.3); break; case 'error': this.tone(140,0.18,'sawtooth',0.35); break; case 'end': this.seq([{t:0,f:660,d:0.1,g:0.35},{t:0.12,f:880,d:0.12,g:0.35},{t:0.26,f:1320,d:0.16,g:0.25}]); break; } }
};
Sound.load();
['pointerdown','keydown'].forEach(ev=> document.addEventListener(ev, ()=>Sound.resume(), {once:true}));

// ------------------- Card Definitions -------------------

const pick = aiGainChoiceUpTo(4); if(pick){

const pile=getPile(pick); if(pile&&pile.count>0){ pile.count--; g.ai.discard.push(instance(pick)); } } } } },
};

const LOG_MAX = 10;

let LOG_SILENT=false;

const logs = [];

function addLog(msg, cls){ if(LOG_SILENT) return; logs.push({msg, cls}); while(logs.length>LOG_MAX) logs.shift();

const el = document.getElementById('log'); if(el) el.innerHTML = logs.map(l=>`<span class="${l.cls||''}">• ${l.msg}</span>`).join('\n'); }

function toast(msg){

const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1800); }

const tip = document.getElementById('tooltip');

const pad=10;

const w=260;

const h= tip.offsetHeight||100;

let left = Math.min(window.innerWidth - w - pad, x + 14);

let top  = Math.min(window.innerHeight - h - pad, y + 14); tip.style.left = left + 'px'; tip.style.top = top + 'px'; }

const meta = []; if(def.type==='Treasure') meta.push(`+${def.value} coins`); if(def.type==='Victory') meta.push(`${def.points} VP`); if(def.type==='Action') meta.push(def.desc||'Action'); return `<div class="tTitle">${def.name}</div><div class="tMeta">Type: ${def.type} · Cost: ${def.cost}</div><div style=\"margin-top:4px\">${meta.join(' · ')}</div>`; }

// ------------------- Helpers -------------------

function instance(name){ return { ...CARD_DEFS[name] }; }

function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }

function packActor(actor){ return { deck: actor.deck.map(c=>c.name), discard: actor.discard.map(c=>c.name), hand: actor.hand.map(c=>c.name), played: actor.played.map(c=>c.name) }; }

function unpackActor(p){ return { deck: p.deck.map(instance), discard: p.discard.map(instance), hand: p.hand.map(instance), played: p.played.map(instance) }; }

function shuffle(arr){ for(

let i=arr.length-1;i>0;i--){

const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }

let i=0;i<n;i++) drawOne(actor); }

function vpOfPile(pile){ return pile.reduce((sum,c)=> sum + (c.points||0), 0); }

const p = vpOfPile([...game.player.deck,...game.player.discard,...game.player.hand]);

const a = vpOfPile([...game.ai.deck,...game.ai.discard,...game.ai.hand]); return {p,a}; }

function cardIcon(name){ switch(name){ case 'Copper': return '🟠'; case 'Silver': return '⚪️'; case 'Gold': return '🟡'; case 'Estate': return '🏠'; case 'Duchy': return '🏯'; case 'Province': return '🏰'; case 'Smithy': return '⚒️'; case 'Village': return '🏘️'; case 'Market': return '🛒'; case 'Laboratory': return '🧪'; case 'Festival': return '🎪'; case 'Woodcutter': return '🪓'; case 'Merchant': return '🏬'; case 'Workshop': return '🧰'; default: return '🃏'; } }

const over=document.getElementById('choiceOverlay'); over.classList.remove('show'); game.interactionLock=false; }

function hasPlayableAction(){ return !game.interactionLock && game.actions>0 && game.player.hand.some(c=>c.type==='Action'); }

function hasTreasure(){ return !game.interactionLock && game.player.hand.some(c=>c.type==='Treasure'); }

function maybeAutoAdvance(){ if(game.interactionLock) return false; if(game.suppressAutoAdvanceOnce){ game.suppressAutoAdvanceOnce=false; return false; } if(!game.autoAdvance || game.gameOver) return false;

let changed=false; if(game.phase==='action' && !hasPlayableAction()){ game.phase='treasure'; changed=true; } if(game.phase==='treasure' && !hasTreasure()){ game.phase='buy'; changed=true; } return changed; }

function emptyPileCount(){ return SUPPLY.reduce((n,p)=> n + (p.count===0?1:0), 0); }

const prov = getPile('Province'); if(prov && prov.count===0) game.endAfterThisTurn = true; if(emptyPileCount() >= 3)  game.endAfterThisTurn = true; if(game.endAfterThisTurn) addLog('End condition met - game will end after this turn.'); }

const {p,a} = computeScores();

const title = (p>a)? 'You win!': (a>p? 'AI wins.':'Tie game.'); document.getElementById('winnerTitle').textContent = title; document.getElementById('winnerDetail').textContent = `Final score - You: ${p} · AI: ${a}`; document.getElementById('overlay').classList.add('show'); Sound.play('end'); Chat.endGame(title, {p,a}); }

function phaseBand(){

const prov = getPile('Province');

const left = prov? prov.count : 12; if(left <= 3) return 'late'; if(left <= 7) return 'mid'; return 'early'; }

// Player counts HTML

const all=[...game.player.deck, ...game.player.discard, ...game.player.hand];

const map={};

const typeTotals={Treasure:0, Victory:0, Action:0}; all.forEach(c=>{ map[c.name]=(map[c.name]||0)+1; typeTotals[c.type]=(typeTotals[c.type]||0)+1; });

const block=(label,names)=>{

const total = typeTotals[label]||0;

const details = names.map(n=> `${n} ${map[n]||0}`).join(' · '); return `<div class=\"countGroup\"><div class=\"row\"><span class=\"label\">${label}</span><span class=\"totalWrap\"><span class=\"mini\">total</span><span class=\"totalNum\"><strong>${total}</strong></span></span></div><div class=\"sub\">${details}</div></div>`; }; return [ block('Treasure',['Gold','Silver','Copper']), block('Victory',['Province','Duchy','Estate']), block('Action',['Festival','Laboratory','Market','Merchant','Smithy','Village','Workshop','Woodcutter']) ].join(''); }

let lastCountsHTML = '';

// ---------- Debug helpers ----------

function groupByName(cards){

const m = new Map(); cards.forEach(c=> m.set(c.name, (m.get(c.name)||0)+1)); return [...m.entries()].sort((a,b)=> a[0].localeCompare(b[0])).map(([n,k])=> `${n}×${k}`).join(', '); }

function writeAIDebug(lines){

const box = document.getElementById('ai-debug'); if(!box) return; if(!game.debugAI){ box.style.display='none'; box.textContent=''; return; } box.style.display='block'; box.textContent = (lines||[]).join('\n'); }

// ------------------- Choice overlay (Workshop) -------------------

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
      <div class=\"meta\">Cost: ${def.cost}</div>
    `;
    el.onclick = ()=>{
      pile.count--; actor.discard.push(instance(def.name));
      addLog(`You gained ${def.name} with ${source}.`);
      over.classList.remove('show');
      game.interactionLock = false; updateUndoUI(); checkEndgameFlags(); render();
    };
    el.addEventListener('mouseenter', (e)=> showTip(cardTip(def), e.clientX, e.clientY));
    el.addEventListener('mousemove',  (e)=> showTip(cardTip(def), e.clientX, e.clientY));
    el.addEventListener('mouseleave', hideTip);
    grid.appendChild(el);
  });
  over.classList.add('show');
}

// ------------------- Undo -------------------

function snapshot(){ if(game.turn!=='player' || game.gameOver || game.interactionLock) return; game.undo = { turn: game.turn, phase: game.phase, actions: game.actions, buys: game.buys, coins: game.coins, endAfter: game.endAfterThisTurn, playerPacked: packActor(game.player), supply: SUPPLY.map(p=>p.count), logs: deepClone(logs), merchantPending: deepClone(game.merchantPending), turnNum: game.turnNum, }; game.undoForbidden = null; updateUndoUI(); }

function canUndo(){ return !!game.undo; }

function undo(){ if(!canUndo()) return; if(game.undoForbidden==='draw'){ Sound.play('error'); toast('You cannot use undo after a card draw.'); return; } if(isChoiceOpen()) closeChoiceOverlay();

const u = game.undo; game.turn  = u.turn; game.phase = u.phase; game.actions = u.actions; game.buys = u.buys; game.coins = u.coins; game.endAfterThisTurn = u.endAfter; game.player = unpackActor(u.playerPacked); SUPPLY.forEach((p,i)=> p.count = u.supply[i]); logs.length = 0; u.logs.forEach(x=> logs.push(x)); game.merchantPending = u.merchantPending; game.turnNum = u.turnNum; game.undo = null; game.interactionLock = false; game.suppressAutoAdvanceOnce = true; updateUndoUI(); addLog(`Undid last action. Restored phase: ${game.phase}, actions: ${game.actions}, buys: ${game.buys}, coins: ${game.coins}.`, 'mint'); render(); }

function updateUndoUI(){

const b = document.getElementById('undoBtn'); if(b) b.disabled = !canUndo(); }

// ------------------- Init -------------------

function init(){

const p=game.player, a=game.ai;
  for(

let i=0;i<7;i++){ p.deck.push(instance('Copper')); a.deck.push(instance('Copper')); }
  for(

let i=0;i<3;i++){ p.deck.push(instance('Estate')); a.deck.push(instance('Estate')); }
  shuffle(p.deck); shuffle(a.deck);
  for(

let i=0;i<5;i++){ drawOne(p); drawOne(a); }
  document.getElementById('autoAdvance').checked=game.autoAdvance;
  document.getElementById('autoAdvance').onchange=(e)=>{ game.autoAdvance=e.target.checked; };

const sel=document.getElementById('aiMode'); sel.value=game.aiMode; sel.onchange=(e)=>{ game.aiMode=e.target.value; toast(`AI set to ${game.aiMode}`); };

const dbg=document.getElementById('debugAICheck'); dbg.checked=game.debugAI; dbg.onchange=(e)=>{ game.debugAI=e.target.checked; writeAIDebug([]); };

  // Top-right controls
  document.getElementById('newGameBtn').onclick = ()=> location.reload();
  document.getElementById('tutorialBtn').onclick = ()=>{ Coach.ensureInit(); Coach.restart(); };

  // Sound UI

const v = document.getElementById('vol');

const m = document.getElementById('muteToggle');
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
  Coach.init(); Coach.maybeStart();
  setTimeout(sanityCheck, 0);
}

// ------------------- Rendering -------------------

const {p,a} = computeScores();
  document.getElementById('pScore').textContent = p;
  document.getElementById('aScore').textContent = a;

const pc = document.getElementById('playerCounts'); if(pc) pc.innerHTML = lastCountsHTML;

  // SUPPLY

const s = document.getElementById('supply'); s.innerHTML='';

const groups = [ { title:'Coins', type:'Treasure' }, { title:'Victory Cards', type:'Victory' }, { title:'Action Cards', type:'Action' } ];

const sortMetric = (def, type)=> type==='Victory' ? (def.points||0) : def.cost;
  groups.forEach(g=>{

const sec = document.createElement('div'); sec.className='supplySection';

const h = document.createElement('h3'); h.textContent = g.title; sec.appendChild(h);

const grid = document.createElement('div'); grid.className='supplyGrid'; sec.appendChild(grid);

    SUPPLY.filter(p=>CARD_DEFS[p.key].type===g.type)
      .sort((a,b)=>{

const da=CARD_DEFS[a.key], db=CARD_DEFS[b.key];

const va=sortMetric(da,g.type), vb=sortMetric(db,g.type); return vb-va || a.key.localeCompare(b.key); })
      .forEach(pile=>{

const def = CARD_DEFS[pile.key];

const el = document.createElement('div'); el.className='pile'; if(pile.count===0) el.classList.add('empty');
        el.innerHTML = `
          <div class=\"count\">${pile.count}</div>
          <div class=\"name\">
            <div class=\"icon\">${cardIcon(def.name)}</div>
            <div class=\"label\">${def.name}</div>
          </div>
          <div class=\"meta\">Cost: ${def.cost}</div>
        `;

const canBuy = (!game.gameOver && !game.interactionLock && game.turn==='player' && game.phase==='buy' && game.buys>0 && game.coins>=def.cost && pile.count>0);
        if(canBuy){ el.onclick = ()=>buy(def.name); el.classList.remove('disabled'); el.classList.add('buyable'); }
        else { el.classList.add('disabled'); el.classList.remove('buyable'); el.onclick = null; }
        el.addEventListener('mouseenter', (e)=> showTip(cardTip(def), e.clientX, e.clientY));
        el.addEventListener('mousemove',  (e)=> showTip(cardTip(def), e.clientX, e.clientY));
        el.addEventListener('mouseleave', hideTip);
        grid.appendChild(el);
      });
    s.appendChild(sec);
  });

  // HAND

const hand = document.getElementById('player-hand'); hand.innerHTML='';

const indexed = game.player.hand.map((c,idx)=>({c,idx}));

const groupRank = { Action:0, Treasure:1, Victory:2 };
  indexed.sort((a,b)=>{

const ga = groupRank[a.c.type] ?? 3;

const gb = groupRank[b.c.type] ?? 3; if(ga!==gb) return ga-gb; if(a.c.type==='Action' && b.c.type==='Action') return a.c.name.localeCompare(b.c.name); if(a.c.type==='Treasure' && b.c.type==='Treasure') return (b.c.value||0)-(a.c.value||0) || a.c.name.localeCompare(b.c.name); if(a.c.type==='Victory' && b.c.type==='Victory') return (b.c.points||0)-(a.c.points||0) || a.c.name.localeCompare(b.c.name); return a.c.name.localeCompare(b.c.name); });
  indexed.forEach(({c,idx})=>{

const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<div class=\"title\">${cardIcon(c.name)} ${c.name}</div><div class=\"type\">${c.type}</div>`;

const canPlayAction = (!game.gameOver && !game.interactionLock && c.type==='Action' && game.turn==='player' && game.phase==='action' && game.actions>0);

const canPlayTreasure = (!game.gameOver && !game.interactionLock && c.type==='Treasure' && game.turn==='player' && game.phase!=='buy');
    if(canPlayAction || canPlayTreasure){ el.classList.add('playable'); el.onclick = ()=>play(idx); }
    else { el.classList.add('disabled'); el.onclick = null; }

const def = CARD_DEFS[c.name];
    el.addEventListener('mouseenter', (e)=> showTip(cardTip(def), e.clientX, e.clientY));
    el.addEventListener('mousemove',  (e)=> showTip(cardTip(def), e.clientX, e.clientY));
    el.addEventListener('mouseleave', hideTip);
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

// ------------------- Actions & Buys (Player) -------------------

const card = game.player.hand[index]; if(!card) return; snapshot(); if(card.type==='Action'){ if(game.phase!=='action' || game.actions<=0) return; game.actions -= 1;

const [played] = game.player.hand.splice(index,1); game.player.played.push(played); if(typeof played.effect==='function') played.effect(game, game.player); Sound.play('action'); toast(`Played ${played.name}`); } else if(card.type==='Treasure'){ if(game.phase==='buy') { Sound.play('error'); return; } if(game.phase==='action') game.phase='treasure';

const [tre] = game.player.hand.splice(index,1); game.player.played.push(tre);

let add = (tre.value||0); if(tre.name==='Silver' && game.merchantPending.player>0){ add += game.merchantPending.player; addLog(`Merchant boosts Silver: +${game.merchantPending.player}.`); game.merchantPending.player = 0; } game.coins += add; Sound.play('coins'); toast(`+${add} coins`); } render(); }

let added=0;

let count=0;

let sawSilver=false; for(

let i=game.player.hand.length-1;i>=0;i--){ if(game.player.hand[i].type==='Treasure'){

const card = game.player.hand.splice(i,1)[0]; game.player.played.push(card); added += (card.value||0); count++; if(card.name==='Silver') sawSilver=true; } } if(sawSilver && game.merchantPending.player>0){ added += game.merchantPending.player; addLog(`Merchant boosts Silver: +${game.merchantPending.player}.`); game.merchantPending.player=0; } game.coins += added; if(count>0){ addLog(`Auto-played ${count} treasure${count>1?'s':''} for +${added} coins.`); Sound.play('coins'); toast(`Auto Treasures: +${added}`); } render(); }

const pile = getPile(name);

const def = CARD_DEFS[name]; if(!pile || !def || pile.count<=0) return; if(game.buys<=0){ Sound.play('error'); toast('No buys left'); return; } if(game.coins < def.cost){ Sound.play('error'); toast('Not enough coins'); return; } snapshot(); game.buys -= 1; game.coins -= def.cost; pile.count -= 1; game.player.discard.push(instance(def.name)); addLog(`You bought ${def.name} for ${def.cost}.`); Sound.play('buy'); toast(`Bought ${def.name} (-${def.cost})`); Chat.say?.('playerBuy', {name:def.name}); checkEndgameFlags(); render(); }

// ------------------- Turn Flow -------------------

function cleanupAndDraw(who){ who.discard.push(...who.hand, ...who.played); who.hand.length=0; who.played.length=0; for(

let i=0;i<5;i++) drawOne(who); }

const pc = document.getElementById('playerCounts'); if(pc) pc.innerHTML = lastCountsHTML; if(endIfNeeded()) return; game.turn='ai'; game.actions=1; game.buys=1; game.coins=0; game.phase='action'; game.merchantPending.ai = 0; addLog('AI is thinking...'); render(); setTimeout(aiTurn, 300); }

// ------------------- AI -------------------

const hand = game.ai.hand;

const hasTerminal = hand.some(c=> c.name==='Smithy' || c.name==='Woodcutter' || c.name==='Workshop');

let idx = -1; if(hand.some(c=>c.name==='Village') && (game.aiActions<=1) && (hasTerminal)){ idx = hand.findIndex(c=>c.name==='Village'); } else if(hand.some(c=>c.name==='Festival')){ idx = hand.findIndex(c=>c.name==='Festival'); } else if(hand.some(c=>c.name==='Market')){ idx = hand.findIndex(c=>c.name==='Market'); } else if(hand.some(c=>c.name==='Laboratory')){ idx = hand.findIndex(c=>c.name==='Laboratory'); } else if(hand.some(c=>c.name==='Merchant')){ idx = hand.findIndex(c=>c.name==='Merchant'); } else if(hand.some(c=>c.name==='Smithy')){ idx = hand.findIndex(c=>c.name==='Smithy'); } else if(hand.some(c=>c.name==='Workshop')){ idx = hand.findIndex(c=>c.name==='Workshop'); } else if(hand.some(c=>c.name==='Village')){ idx = hand.findIndex(c=>c.name==='Village'); } else if(hand.some(c=>c.name==='Woodcutter')){ idx = hand.findIndex(c=>c.name==='Woodcutter'); } if(idx===-1) return false; game.aiActions -= 1;

const [act] = hand.splice(idx,1); game.ai.played.push(act); if(debug) debug.push(`Action: ${act.name}`); if(typeof act.effect==='function') act.effect(game, game.ai); return true; }

const hand = game.ai.hand;

let order = ['Festival','Market','Laboratory','Merchant','Smithy','Workshop','Village','Woodcutter'];

let idx = order.map(n=> hand.findIndex(c=>c.name===n)).find(i=>i!==-1) ?? -1; if(idx===-1) return false; game.aiActions -= 1;

const [act] = hand.splice(idx,1); game.ai.played.push(act); if(debug) debug.push(`[Weak] Action: ${act.name}`); if(typeof act.effect==='function') act.effect(game, game.ai); game.aiActions = 0; return true; }

function aiAutoPlayTreasures(debug){

let add=0;

const played=[];

let sawSilver=false; for(

let i=game.ai.hand.length-1;i>=0;i--){ if(game.ai.hand[i].type==='Treasure'){

const t = game.ai.hand.splice(i,1)[0]; game.ai.played.push(t); add += (t.value||0); played.push(t); if(t.name==='Silver') sawSilver=true; } } if(sawSilver && game.merchantPending.ai>0){ add += game.merchantPending.ai; if(debug) debug.push(`Merchant bonus on Silver: +${game.merchantPending.ai}`); game.merchantPending.ai=0; } if(debug && played.length) debug.push(`Treasures: ${groupByName(played)} => +${add}`); game.aiCoins += add; return add; }

function aiCountInDeck(name){

const all=[...game.ai.deck,...game.ai.discard,...game.ai.hand,...game.ai.played]; return all.filter(c=>c.name===name).length; }

function aiGainChoiceUpTo(maxCost){

const provLeft = getPile('Province')?.count ?? 12; if(provLeft<=3){ if(maxCost>=2 && getPile('Estate').count>0) return 'Estate'; }

const needVillage = aiCountInDeck('Village') < (aiCountInDeck('Smithy') + aiCountInDeck('Workshop'))/2; if(needVillage && maxCost>=3 && getPile('Village').count>0) return 'Village'; if(maxCost>=4 && getPile('Smithy').count>0) return 'Smithy'; if(maxCost>=3 && getPile('Silver').count>0) return 'Silver'; if(maxCost>=3 && getPile('Merchant').count>0) return 'Merchant';

const eligible = SUPPLY.filter(p=> p.count>0 && CARD_DEFS[p.key].cost<=maxCost); return eligible.length? eligible[Math.floor(Math.random()*eligible.length)].key : null; }

const coins = game.aiCoins;

const phase = phaseBand();

const piles = { Province:getPile('Province'), Duchy:getPile('Duchy'), Estate:getPile('Estate'), Gold:getPile('Gold'), Silver:getPile('Silver'), Smithy:getPile('Smithy'), Village:getPile('Village'), Market:getPile('Market'), Laboratory:getPile('Laboratory'), Festival:getPile('Festival'), Woodcutter:getPile('Woodcutter'), Merchant:getPile('Merchant'), Workshop:getPile('Workshop') };

const can = n=> n && n.count>0;

let pick=null; if(coins>=8 && can(piles.Province)) pick='Province'; else if(coins>=6 && can(piles.Gold)) pick='Gold'; else if(coins>=5){

const prefs = ['Festival','Market','Laboratory','Smithy']; pick = prefs.find(n=> can(piles[n])) || null; } else if(coins>=4 && can(piles.Smithy)) pick='Smithy'; else if(coins>=3){

const prefs3 = ['Silver','Village','Merchant','Workshop','Woodcutter']; pick = prefs3.find(n=> can(piles[n])) || null; } if(phase==='late' && !pick){ if(coins>=5 && can(piles.Duchy)) pick='Duchy'; else if(coins>=2 && can(piles.Estate)) pick='Estate'; } if(debug) debug.push(`Buy choice: ${pick??'nothing'} (coins ${coins})`); return pick; }

const coins = game.aiCoins;

const provLeft = getPile('Province')?.count ?? 12;

let pick=null; if(coins>=6) pick='Gold'; else if(coins>=5) pick=['Festival','Market','Laboratory'][Math.floor(Math.random()*3)]; else if(coins>=4) pick='Smithy'; else if(coins>=3) pick=['Silver','Merchant','Village','Workshop','Woodcutter'][Math.floor(Math.random()*5)]; if(!pick && provLeft<=3){ if(coins>=8) pick='Province'; else if(coins>=5) pick='Duchy'; else if(coins>=2) pick='Estate'; } if(!pick && coins===0 && Math.random()<0.3 && getPile('Copper').count>0) pick='Copper'; if(debug) debug.push(`[Weak] Buy choice: ${pick??'nothing'} (coins ${coins})`); return pick; }

let boughtList=[];

let safety=5; while(game.aiBuys>0 && safety-->0){

const choice = (mode==='weak') ? aiChooseBuyWeak(debug) : aiChooseBuyStrong(debug); if(!choice) break;

const pile = getPile(choice);

const def = CARD_DEFS[choice]; if(!pile || pile.count<=0 || game.aiCoins < def.cost) break; pile.count--; game.ai.discard.push(instance(choice)); game.aiCoins -= def.cost; game.aiBuys -= 1; boughtList.push(choice); checkEndgameFlags(); } return boughtList; }

const debug = game.debugAI ? [`AI turn start - hand: ${groupByName(game.ai.hand)}`] : null; game.aiActions=1; game.aiBuys=1; game.aiCoins=0; game.merchantPending.ai = 0;

const mode = game.aiMode; if(mode==='weak'){ aiPlayBestActionWeak(debug); } else {

let playedSomething=true;

let guard=10; while(playedSomething && guard-->0){ playedSomething = aiPlayBestActionStrong(debug); } }

const gained = aiAutoPlayTreasures(debug);

const boughtList = aiMultiBuy(debug, mode);

const bought = boughtList.length? boughtList.join(', '): 'nothing'; document.getElementById('ai-status').textContent = `AI (${mode}) played ${gained} coin${gained===1?'':'s'} and bought ${bought}.`; if(game.debugAI){ if(boughtList.length){ debug.push(`Bought: ${boughtList.join(', ')}`); } debug.push(`End coins: ${game.aiCoins}, End buys: ${game.aiBuys}`); writeAIDebug(debug); } else { writeAIDebug([]); } cleanupAndDraw(game.ai); if(endIfNeeded()) return; game.turn='player'; game.merchantPending.player = 0; game.turnNum += 1; addLog(`Your turn [${game.turnNum}].`); Chat.say?.('aiTurn', {bought:boughtList, coins:gained}); render(); }

// ------------------- Keyboard Shortcuts -------------------

function firstPlayableActionIndex(){ if(game.turn!=='player' || game.phase!=='action' || game.actions<=0 || game.interactionLock) return -1; return game.player.hand.findIndex(c=>c.type==='Action'); }

document.addEventListener('keydown', (ev)=>{

const k = ev.key.toLowerCase(); if(k==='a'){

const idx = firstPlayableActionIndex(); if(idx>=0){ play(idx); ev.preventDefault(); } else { Sound.play('error'); } } else if(k==='t'){ if(game.interactionLock) return; if(game.phase==='action') game.phase='treasure'; snapshot(); autoPlayTreasures(); ev.preventDefault(); } else if(k==='b'){ if(game.interactionLock) return; if(game.phase!=='buy'){ snapshot(); game.phase='buy'; addLog('Buy phase. Buying disables further card play this turn.'); render(); } ev.preventDefault(); } else if(k==='e'){ if(game.interactionLock) return; Sound.play('end'); endTurn(); ev.preventDefault(); } else if(k==='z'){ undo(); ev.preventDefault(); } });

// ------------------- Chat Bot (persisted) -------------------

const Chat = { elPanel:null, elBody:null, elInput:null, said:new Set(), storageKey:'dominion_chat_v1', init(){ this.elPanel = document.getElementById('chatPanel'); this.elBody  = document.getElementById('chatBody'); this.elInput = document.getElementById('chatInput'); document.getElementById('chatSend').onclick = ()=> this.send(); document.getElementById('clearChat').onclick = ()=> this.clear(); this.elInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); this.send(); } }); this.load(); }, scroll(){ this.elBody.scrollTop = this.elBody.scrollHeight; }, variant(text){

const suf = [' •',' …',' 🙂',' 🤖',' ✨',' !',' ~'][Math.floor(Math.random()*7)];

let v = text + suf; while(this.said.has(v)) v = text + suf + Math.floor(Math.random()*9); return v; }, post(role, text){ if(role==='bot'){ if(this.said.has(text)) text = this.variant(text); this.said.add(text); }

const line = document.createElement('div'); line.className = 'msg ' + (role==='bot'?'bot':'user');

const bubble = document.createElement('div'); bubble.className='bubble'; bubble.textContent=text; line.appendChild(bubble); this.elBody.appendChild(line); this.persist(); this.scroll(); }, postUnique(lines){

const pool = lines.filter(t=> !this.said.has(t));

const pick = (arr)=> arr[Math.floor(Math.random()*arr.length)];

const chosen = (pool.length? pick(pool) : this.variant(pick(lines))); this.post('bot', chosen); }, persist(){

const items = [...this.elBody.querySelectorAll('.msg')].slice(-150).map(n=>({ role: n.classList.contains('bot')? 'bot':'user', text: n.querySelector('.bubble')?.textContent || '' })); try{ localStorage.setItem(this.storageKey, JSON.stringify({items, said:[...this.said].slice(-500)})); }catch(e){} }, load(){ try{

const raw = localStorage.getItem(this.storageKey); if(!raw) return;

const data = JSON.parse(raw); this.said = new Set(Array.isArray(data?.said)? data.said: []); (data?.items||[]).forEach(it=> this.post(it.role, it.text)); }catch(e){} }, clear(){ this.elBody.innerHTML=''; this.said.clear(); this.persist(); }, send(){

const v = this.elInput.value.trim(); if(!v) return; this.post('user', v); this.elInput.value=''; setTimeout(()=> this.reply(v), 120); }, reply(text){

const t = text.toLowerCase(); if(t.includes('help')||t.includes('how')) return this.post('bot', 'Phases go Action → Treasure → Buy. Hit T to auto-play treasures, B to buy, Z to undo.'); if(t.includes('why') && t.includes('buy')) return this.post('bot', 'Simple plan: build economy (Silver/Gold), add Market/Festival, sprinkle Merchants, green when Provinces drop.'); if(t.includes('score')){

const {p,a}=computeScores(); return this.post('bot', `VP check → You: ${p}, AI: ${a}.`); } this.postUnique(['Auto-Treasure (T) saves clicks; Undo (Z) saves regrets.','Greening too early can stall—watch Province pile count.','Merchants love Silvers; your first Silver each turn gets bonus.','Workshop can fix economy: gain Silver or a key 4-cost like Smithy.']); }, say(evt, data){ if(evt==='shuffle'){ return this.postUnique(['Shuffle time! Minty fresh deck.','Cards doing cardio: shuffle complete.','Shuffled—your Estates promised to behave.','Riffle, riffle. Deal me a win.','New order, who dis?',]); } if(evt==='playerBuy'){

const mapping = { Province:'Province! Bold move. I can smell the victory points.', Market:'Bought a Market. Economy go brrr.', Festival:'Festival acquired. Confetti not included.', Laboratory:'Lab online. Please wear safety goggles while drawing cards.', Woodcutter:'Woodcutter hired. Lumber? I hardly know her.', Merchant:'Merchant secured. May your Silvers be lucrative.', Workshop:'Workshop online. Time to craft value.', }; return this.post('bot', mapping[data?.name] || `Picked up ${data?.name}. Nice.`); } if(evt==='aiTurn'){

const bought = (data?.bought||[]).join(', ') || 'nothing';

const lines=[`AI bought ${bought}. We can beat that.`,`AI turn over. My analysis: 🤖 mid.`, bought.includes('Province')? 'AI went green. Time to race!':'AI didn\'t touch Provinces. Opportunity knocks.', 'If AI buys nothing, we buy something shiny.','AI thinks long term. We think victory screen.',]; return this.postUnique(lines); } }
};

// ------------------- Sanity / smoke checks -------------------

function sanityCheck(){ try{ LOG_SILENT = true;

const supplyPiles = document.querySelectorAll('#supply .pile').length;

const okSupply = supplyPiles >= 14 && SUPPLY.some(p=>p.key==='Market') && SUPPLY.some(p=>p.key==='Merchant') && SUPPLY.some(p=>p.key==='Workshop');

const okHand = Array.isArray(game.player.hand) && game.player.hand.length === 5;

const okFns = typeof CARD_DEFS?.Smithy?.effect === 'function' && typeof cardIcon === 'function';

const okChatRaised = getComputedStyle(document.getElementById('chatPanel')).bottom === '88px';

const dummy = { actions:0, buys:0, coins:0, player:{deck:[],discard:[],hand:[],played:[]}, ai:{}, aiActions:0, aiBuys:0, aiCoins:0, merchantPending:{player:0,ai:0} }; CARD_DEFS.Woodcutter.effect(dummy, dummy.player);

const okPlusBuy = dummy.buys===1 && dummy.coins===2; CARD_DEFS.Laboratory.effect(dummy, dummy.player);

const okLabAction = dummy.actions===1; CARD_DEFS.Merchant.effect(dummy, dummy.player);

const okMerchantFlag = dummy.merchantPending.player===1; openGainChoice(4, dummy.player, 'Test');

const nameLayoutOK = document.querySelector('#choiceGrid .name .label')!==null; closeChoiceOverlay(); LOG_SILENT = false; if(!(okSupply && okHand && okFns && okPlusBuy && okLabAction && okMerchantFlag && okChatRaised && nameLayoutOK)){

const msg = `Sanity failed (supply:${okSupply}, hand5:${okHand}, fns:${okFns}, +Buy:${okPlusBuy}, lab+Action:${okLabAction}, merchantFlag:${okMerchantFlag}, chatRaised:${okChatRaised}, choiceLayout:${nameLayoutOK}).`; console.error(msg); toast(msg); } else { console.log('Sanity check passed.'); } }catch(e){ LOG_SILENT=false; console.error('Sanity check exception', e); toast('Sanity check exception'); } }

// ------------------- Start -------------------
init();
(function ensureBuildBadge(){
  try {
    const el = document.getElementById('build');
    if (el && typeof BUILD !== 'undefined') {
      const date = BUILD.date || new Date().toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'});
      el.textContent = `Build ${BUILD.num} • ${date}`;
    }
  } catch(e){}
})();


const Coach = (function(){
  let step = 0;
  const steps = [
    { title: "Welcome!", text: "Phases: Action → Treasure → Buy." },
    { title: "Supply", text: "Click piles during Buy to gain cards you can afford." },
    { title: "Hand", text: "Play Actions first, then Treasures, then Buy." },
    { title: "Status", text: "Watch Actions, Buys, Coins. Shortcuts: A,T,B,E,Z." },
    { title: "Go win!", text: "Build economy, then green at the right time." }
  ];
  function show(){ const o=document.getElementById('coach'); if(!o) return; o.classList.add('show'); sync(); }
  function hide(){ const o=document.getElementById('coach'); if(o) o.classList.remove('show'); }
  function sync(){ const t=document.getElementById('coachTitle'); const d=document.getElementById('coachText'); if(t&&d){ t.textContent=steps[step].title; d.textContent=steps[step].text; } }
  function next(){ step++; if(step>=steps.length){ hide(); return; } sync(); }
  function restart(){ step=0; show(); }
  function init(){ const n=document.getElementById('coachNext'); const s=document.getElementById('coachSkip'); if(n) n.onclick=next; if(s) s.onclick=hide; const btn=document.getElementById('tutorialBtn'); if(btn) btn.onclick=restart; }
  function ensureInit(){ init(); }
  return { init, ensureInit, restart, maybeStart: ()=>{} };
})();


if (typeof init === 'function') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
}
