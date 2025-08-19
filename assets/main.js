// ========================================================================
// === Dominion POC - main.js (v10.0.104) ===============================
// ========================================================================
// Patched: Restored undo lock after drawing cards.

// --- Build Fallback -----------------------------------------------------
const BUILD = { num: '10.0.104' };

// --- Globals ------------------------------------------------------------
var logs = [];
const LOG_MAX = 10;
let tooltipEl = null;

// --- Sound Engine -------------------------------------------------------
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
  noise(dur=0.15, gain=0.25, band=[300,2000]){ if(!this.ctx || this.muted) return; const t=this.now(); const buf=this.ctx.createBuffer(1, this.ctx.sampleRate*dur, this.ctx.sampleRate); const data=buf.getChannelData(0); for(let i=0; i < data.length; i++){data[i]=Math.random()*2-1;} const src=this.ctx.createBufferSource(); src.buffer=buf; let node=src; if(band){ const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=(band[0]+band[1])/2; bp.Q.value=3; src.connect(bp); node=bp; } this.env(node,t,0.005, dur*0.5, 0.0, 0.15, gain); src.start(t); src.stop(t+dur+0.2);},
  seq(notes){ if(!this.ctx || this.muted) return; const base=this.now(); notes.forEach(n=>{ const t=base+(n.t||0); const o=this.ctx.createOscillator(); o.type=n.type||'sine'; o.frequency.setValueAtTime(n.f, t); this.env(o,t,0.005,(n.d||0.1)*0.7,0.0,(n.d||0.1)*0.3,n.g||0.4); o.start(t); o.stop(t+(n.d||0.1)+0.2); }); },
  play(kind){
    if (game.debugAI) { Chat.post('bot', `🔊 Sound played: ${kind}`); }
    switch(kind){ case 'gain': this.tone(880,0.10,'sine',0.35); this.tone(1320,0.10,'triangle',0.25); break; case 'draw': this.chirp(320,520,0.08,'triangle',0.25); break; case 'action': this.chirp(420,860,0.12,'triangle',0.35); break; case 'coins': this.seq([{t:0,f:900,d:0.05,g:0.35,type:'square'},{t:0.06,f:1200,d:0.05,g:0.25,type:'square'}]); break; case 'buy': this.seq([{t:0,f:660,d:0.1,g:0.35},{t:0.12,f:990,d:0.1,g:0.25}]); break; case 'shuffle': this.seq([{t:0,f:660,d:0.1,g:0.35},{t:0.12,f:990,d:0.1,g:0.25}]); break; case 'attack': this.seq([{t:0,f:220,d:0.14,g:0.4,type:'sawtooth'},{t:0.1,f:180,d:0.12,g:0.35,type:'sawtooth'}]); break; case 'reaction': this.chirp(500,1000,0.16,'sine',0.3); break; case 'error': this.tone(140,0.18,'sawtooth',0.35); break; case 'end': this.seq([{t:0,f:660,d:0.1,g:0.35},{t:0.12,f:880,d:0.12,g:0.35},{t:0.26,f:1320,d:0.16,g:0.25}]); break; } }
};

// --- Game Logic Helpers -------------------------------------------------
function instance(name){ return { ...CARD_DEFS[name] }; }
function packActor(actor){ return { deck: actor.deck.map(c=>c.name), discard: actor.discard.map(c=>c.name), hand: actor.hand.map(c=>c.name), played: actor.played.map(c=>c.name) }; }
function unpackActor(p){ return { deck: p.deck.map(instance), discard: p.discard.map(instance), hand: p.hand.map(instance), played: p.played.map(instance) }; }
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }
function drawOne(actor){
    if(actor.deck.length===0){
        actor.deck.push(...actor.discard);
        actor.discard.length=0;
        shuffle(actor.deck);
        if(actor===game.player){ addLog('Your deck was shuffled.', 'mint'); Chat.say('shuffle'); }
        Sound.play('shuffle');
    }
    if(actor.deck.length>0){
        actor.hand.push(actor.deck.pop());
        if(actor===game.player) {
            Sound.play('draw');
            if(game.turn==='player' && game.undo) game.undoForbidden='draw';
        }
    }
}
function drawCards(actor,n){ for(let i=0;i<n;i++) drawOne(actor); }
function vpOfPile(pile){ return pile.reduce((sum,c)=> sum + (c.points||0), 0); }
function computeScores(){ const p = vpOfPile([...game.player.deck,...game.player.discard,...game.player.hand]); const a = vpOfPile([...game.ai.deck,...game.ai.discard,...game.ai.hand]); return {p,a}; }
function getPile(name){ return SUPPLY.find(p=>p.key===name); }
function checkEndgameFlags(){ const prov = getPile('Province'); if(prov && prov.count===0) game.endAfterThisTurn = true; if(SUPPLY.reduce((n,p)=> n + (p.count===0?1:0), 0) >= 3) game.endAfterThisTurn = true; }

// --- UI Helpers ---------------------------------------------------------
function addLog(msg, cls){ logs.push({msg, cls}); while(logs.length>LOG_MAX) logs.shift(); const el = document.getElementById('log'); if(el) el.innerHTML = logs.map(l=>`<span class="${l.cls||''}">• ${l.msg}</span>`).join('\n'); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1800); }

function showTooltip(content, element, event) {
    if (!tooltipEl) tooltipEl = document.getElementById('tooltip');
    if (!tooltipEl || !content || !element) return;
    tooltipEl.innerHTML = content;
    tooltipEl.style.display = 'block';
    const r = element.getBoundingClientRect();
    const tipR = tooltipEl.getBoundingClientRect();
    const M = 8;
    let top, left;
    const actionButtonIds = ['toBuyBtn', 'autoTreasureBtn', 'undoBtn', 'endTurnBtn', 'tutorialBtn'];
    if (actionButtonIds.includes(element.id)) {
        top = r.bottom + M;
        left = r.left + (r.width / 2) - (tipR.width / 2);
    } else {
        top = event.pageY + 15;
        left = event.pageX + 15;
    }
    if (left + tipR.width > window.innerWidth) left = window.innerWidth - tipR.width - M;
    if (top + tipR.height > window.innerHeight) top = r.top - tipR.height - M;
    if (left < 0) left = M;
    if (top < 0) top = M;
    tooltipEl.style.left = `${Math.round(left)}px`;
    tooltipEl.style.top = `${Math.round(top)}px`;
}

function hideTooltip() {
    if (!tooltipEl) tooltipEl = document.getElementById('tooltip');
    if (tooltipEl) tooltipEl.style.display = 'none';
}

function cardTip(def){ const meta = []; if(def.type==='Treasure') meta.push(`+${def.value} coins`); if(def.type==='Victory') meta.push(`${def.points} VP`); if(def.type==='Action') meta.push(def.desc||'Action'); return `<div class="tTitle">${def.name}</div><div class="tMeta">Type: ${def.type} · Cost: ${def.cost}</div><div style="margin-top:4px">${meta.join(' · ')}</div>`; }
function getSupplyRemaining(def){ try{ const key = (def && (def.key || def.name)) || ''; const found = SUPPLY.find(p => p && (p.key === key || p.name === key)); return found ? found.count : ''; } catch(e) { return ''; } }
function cardIcon(name){ switch(name){ case 'Copper': return '🟠'; case 'Silver': return '⚪️'; case 'Gold': return '🟡'; case 'Estate': return '🏠'; case 'Duchy': return '🏯'; case 'Province': return '🏰'; case 'Smithy': return '⚒️'; case 'Village': return '🏘️'; case 'Market': return '🛒'; case 'Laboratory': return '🧪'; case 'Festival': return '🎪'; case 'Woodcutter': return '🪓'; case 'Merchant': return '🏬'; case 'Workshop': return '🧰'; default: return '🃏'; } }

// --- Game State & Phase Logic -------------------------------------------
function snapshot(){ if(game.turn!=='player' || game.gameOver || game.interactionLock) return; game.undo = { turn: game.turn, phase: game.phase, actions: game.actions, buys: game.buys, coins: game.coins, playerPacked: packActor(game.player), supply: SUPPLY.map(p=>p.count), logs: JSON.parse(JSON.stringify(logs)) }; game.undoForbidden=null; updateUndoUI(); }
function undo(){ if(game.undoForbidden==='draw'){ Sound.play('error'); toast('Cannot undo after drawing cards.'); return; } if(!game.undo) return; const u = game.undo; game.turn=u.turn; game.phase=u.phase; game.actions=u.actions; game.buys=u.buys; game.coins=u.coins; game.player=unpackActor(u.playerPacked); SUPPLY.forEach((p,i)=> p.count=u.supply[i]); logs.length=0; u.logs.forEach(x=>logs.push(x)); game.undo=null; game.interactionLock=false; updateUndoUI(); addLog(`Undid last action.`, 'mint'); render(); }
function updateUndoUI(){ const b = document.getElementById('undoBtn'); if(b) b.disabled = !game.undo || game.undoForbidden; }

function isChoiceOpen(){ return document.getElementById('choiceOverlay').classList.contains('show'); }
function closeChoiceOverlay(){ document.getElementById('choiceOverlay').classList.remove('show'); game.interactionLock=false; render(); }
function syncLockFromOverlay(){ game.interactionLock = isChoiceOpen(); }
function hasPlayableAction(){ return !game.interactionLock && game.actions>0 && game.player.hand.some(c=>c.type==='Action'); }
function hasTreasure(){ return !game.interactionLock && game.player.hand.some(c=>c.type==='Treasure'); }

function maybeAutoAdvance(){
    if(game.interactionLock || !document.getElementById('autoAdvance').checked || game.gameOver) return false;
    let changed=false;
    if(game.phase==='action' && !hasPlayableAction()){ game.phase='treasure'; changed=true; }
    if(game.phase==='treasure' && !hasTreasure()){ game.phase='buy'; changed=true; }
    return changed;
}

function playerCountsHTML(){
  try{
    const p = game.player || {};
    const zones = [p.hand||[], p.deck||[], p.discard||[], p.played||[]];
    const counts = Object.create(null);
    const toName = (c)=> (c && typeof c === 'object') ? (c.name || c.key || '') : String(c||'');
    for (const zone of zones){ for (const c of zone){ const name = toName(c); if(name) counts[name] = (counts[name]||0) + 1; } }
    const fixedT = ['Gold','Silver','Copper'];
    const fixedV = ['Province','Duchy','Estate'];
    const fixedSet = new Set([...fixedT, ...fixedV]);
    const supplyKeys = (typeof SUPPLY!=='undefined' && Array.isArray(SUPPLY)) ? SUPPLY.map(p=> p.key) : [];
    const actions = supplyKeys.filter(k => !fixedSet.has(k)).sort();
    const countOr0 = (n)=> counts[n] || 0;
    const formatRow = (arr)=> arr.map(n => `${n} (<span class="card-count">${countOr0(n)}</span>)`).join('   ');
    const tRow = formatRow(fixedT);
    const vRow = formatRow(fixedV);
    const aRow = actions.length ? formatRow(actions) : '';
    return `<div class="countsList" style="margin-top:0"><div class="row">${tRow}</div><div class="row">${vRow}</div>${aRow ? `<div class="row">${aRow}</div>` : ''}</div>`;
  }catch(e){ return '<div class="countsList">Error generating card counts.</div>'; }
}

function openGainChoice(maxCost, actor, source){
  game.interactionLock = true;
  const over = document.getElementById('choiceOverlay');
  const grid = document.getElementById('choiceGrid');
  grid.innerHTML = '';
  document.getElementById('choiceTitle').textContent = 'Gain a card';
  document.getElementById('choiceDetail').textContent = `Pick a card costing up to ${maxCost}.`;
  SUPPLY.filter(p=> p.count>0 && CARD_DEFS[p.key].cost<=maxCost)
    .sort((a,b)=> CARD_DEFS[b.key].cost - CARD_DEFS[a.key].cost || a.key.localeCompare(b.key))
    .forEach(pile=>{
      const def = CARD_DEFS[pile.key];
      const el = document.createElement('div'); el.className='pile';
      el.innerHTML = `<div class="count">${pile.count}</div><div class="name"><div class="icon">${cardIcon(def.name)}</div><div class="label">${def.name}</div></div>`;
      el.onclick = ()=>{ Sound.play('gain'); pile.count--; actor.discard.push(instance(def.name)); addLog(`You gained ${def.name} with ${source}.`); closeChoiceOverlay(); checkEndgameFlags(); };
      el.onmouseenter = (e)=> { const tip = cardTip(def) + `<div class="tcount">Remaining: ${getSupplyRemaining(def)}</div>`; showTooltip(tip, el, e); };
      el.onmousemove = (e) => { if (tooltipEl && tooltipEl.style.display === 'block') { showTooltip(tooltipEl.innerHTML, el, e); }};
      el.onmouseleave = hideTooltip;
      grid.appendChild(el);
    });
  over.classList.add('show');
}

// --- Core Rendering Function --------------------------------------------
function render() {
    syncLockFromOverlay();
    document.getElementById('actions').textContent = game.actions;
    document.getElementById('buys').textContent = game.buys;
    document.getElementById('coins').textContent = game.coins;
    document.getElementById('phase').textContent = game.phase.charAt(0).toUpperCase() + game.phase.slice(1);
    const { p, a } = computeScores();
    document.getElementById('pScore').textContent = p;
    document.getElementById('aScore').textContent = a;
    document.getElementById('playerCounts').innerHTML = playerCountsHTML();
    const deckCountsEl = document.getElementById('deckCounts');
    if (deckCountsEl) {
        const player = game.player;
        deckCountsEl.textContent = `Draw Pile: ${player.deck.length} / Discard Pile: ${player.discard.length}`;
    }

    const supplyEl = document.getElementById('supply');
    supplyEl.innerHTML = '';
    const groups = [{ title: 'Treasure', type: 'Treasure' }, { title: 'Victory Cards', type: 'Victory' }, { title: 'Action Cards', type: 'Action' }];
    groups.forEach(g => {
        const sec = document.createElement('div'); sec.className = 'supplySection'; sec.innerHTML = `<h3>${g.title}</h3>`;
        const grid = document.createElement('div'); grid.className = 'supplyGrid'; sec.appendChild(grid);
        SUPPLY.filter(p => CARD_DEFS[p.key].type === g.type)
            .sort((a, b) => (CARD_DEFS[b.key].cost || 0) - (CARD_DEFS[a.key].cost || 0) || a.key.localeCompare(b.key))
            .forEach(pile => {
                const def = CARD_DEFS[pile.key];
                const el = document.createElement('div'); el.className = 'pile'; if (pile.count === 0) el.classList.add('empty');
                el.innerHTML = `<div class="count">${pile.count}</div><div class="nameRow">${cardIcon(def.name)} <span class="label">${def.name}</span></div>`;
                el.onmouseenter = (event) => { const tipContent = cardTip(def) + `<div class="tcount">Remaining: ${getSupplyRemaining(def)}</div>`; showTooltip(tipContent, el, event); };
                el.onmousemove = (event) => { if (tooltipEl && tooltipEl.style.display === 'block') { showTooltip(tooltipEl.innerHTML, el, event); }};
                el.onmouseleave = hideTooltip;
                const canBuy = (!game.gameOver && !game.interactionLock && game.turn === 'player' && game.phase === 'buy' && game.buys > 0 && game.coins >= def.cost && pile.count > 0);
                if (canBuy) { el.onclick = () => buy(def.name); el.classList.add('buyable'); } else { el.classList.add('disabled'); }
                grid.appendChild(el);
            });
        supplyEl.appendChild(sec);
    });

    const handEl = document.getElementById('player-hand');
    handEl.innerHTML = '';
    const indexed = game.player.hand.map((c, idx) => ({ c, idx }));
    const groupRank = { Action: 0, Treasure: 1, Victory: 2 };
    indexed.sort((a, b) => {
        const ga = groupRank[a.c.type] ?? 3;
        const gb = groupRank[b.c.type] ?? 3;
        if (ga !== gb) return ga - gb;
        return a.c.name.localeCompare(b.c.name);
    });
    indexed.forEach(({ c, idx }) => {
        const el = document.createElement('div'); el.className = 'card';
        el.innerHTML = `<div class="title">${cardIcon(c.name)} ${c.name}</div><div class="type">${c.type}</div>`;
        const canPlay = (!game.gameOver && !game.interactionLock && ((c.type === 'Action' && game.phase === 'action' && game.actions > 0) || (c.type === 'Treasure' && game.phase !== 'buy')));
        if (canPlay) { el.classList.add('playable'); el.onclick = () => play(idx); } else { el.classList.add('disabled'); }
        handEl.appendChild(el);
    });
    
    if (maybeAutoAdvance()) {
        return render();
    }
}

// --- Player Actions & Turn Flow -----------------------------------------
function play(index) {
    if (game.interactionLock || game.turn !== 'player' || game.gameOver) return;
    const card = game.player.hand[index];
    if (!card) return;
    snapshot();
    if (card.type === 'Action') {
        if (game.phase !== 'action' || game.actions <= 0) return;
        game.actions--;
        Sound.play('action');
    } else if (card.type === 'Treasure') {
        if (game.phase === 'buy') { toast("Cannot play Treasures in Buy phase"); return; }
        if (game.phase === 'action') game.phase = 'treasure';
        game.coins += card.value || 0;
        Sound.play('coins');
    }
    const [playedCard] = game.player.hand.splice(index, 1);
    game.player.played.push(playedCard);
    if (typeof playedCard.effect === 'function') {
        playedCard.effect(game, game.player);
    }
    render();
}

function autoPlayTreasures() {
    if (game.interactionLock || game.turn !== 'player' || game.phase === 'buy') return;
    snapshot();
    if (game.phase === 'action') game.phase = 'treasure';
    let addedCoins = 0;
    for (let i = game.player.hand.length - 1; i >= 0; i--) {
        if (game.player.hand[i].type === 'Treasure') {
            const [card] = game.player.hand.splice(i, 1);
            game.player.played.push(card);
            addedCoins += card.value || 0;
        }
    }
    if (addedCoins > 0) { game.coins += addedCoins; Sound.play('coins'); toast(`Auto-played for +${addedCoins} coins`); }
    render();
}

function buy(name) {
    if (game.interactionLock || game.turn !== 'player' || game.phase !== 'buy') return;
    const pile = SUPPLY.find(p => p.key === name);
    const def = CARD_DEFS[name];
    if (!pile || !def || pile.count <= 0 || game.buys <= 0 || game.coins < def.cost) return;
    snapshot();
    game.buys--; game.coins -= def.cost; pile.count--;
    game.player.discard.push(instance(def.name));
    addLog(`You bought ${def.name}.`); Sound.play('buy');
    // Signal AI to start greening when human buys a Victory card
    if (def.type === 'Victory') { game.humanStartedGreening = true; }
    checkEndgameFlags();
    render();
}

function endTurn() {
    if (game.turn !== 'player' || game.gameOver) return;
    game.undo = null; updateUndoUI();
    game.player.discard.push(...game.player.hand, ...game.player.played);
    game.player.hand.length = 0; game.player.played.length = 0;
    for (let i = 0; i < 5; i++) drawOne(game.player);
    checkEndgameFlags();
    if (endIfNeeded()) return;
    game.turn = 'ai'; addLog('AI is thinking...'); render();
    setTimeout(aiTurn, 500);
}

function endIfNeeded(){ if(game.endAfterThisTurn){ game.gameOver=true; showWinner(); return true; } return false; }
function showWinner() {
    game.gameOver = true;
    const { p, a } = computeScores();
    let message = `Final score - You: ${p} · AI: ${a}`;
    const highScore = parseInt(localStorage.getItem('dominionHighScore')) || 0;
    if (p > highScore) {
        message += ` - New High Score!`;
        localStorage.setItem('dominionHighScore', p);
        updateHighScoreDisplay();
    }
    const title = (p > a) ? 'You win!' : (a > p ? 'AI wins.' : 'Tie game.');
    document.getElementById('winnerTitle').textContent = title;
    document.getElementById('winnerDetail').textContent = message;
    document.getElementById('overlay').classList.add('show');
    Sound.play('end');
}

// --- Chat, Coach, & AI ---------------------------------------------------
const Chat = {
    history: [], elPanel:null, elBody:null, elInput:null, said:new Set(), storageKey:'dominion_chat_v1',
    init(){ this.elPanel = document.getElementById('chatPanel'); this.elBody  = document.getElementById('chatBody'); this.elInput = document.getElementById('chatInput'); document.getElementById('chatSend').onclick = ()=> this.send(); document.getElementById('clearChat').onclick = ()=> this.clear(); document.getElementById('chatMinBtn').onclick = this.toggleMinimize; this.elInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); this.send(); } }); this.load(); },
    toggleMinimize() { const panel = document.getElementById('chatPanel'); if(panel) panel.classList.toggle('minimized'); },
    scroll(){ if (this.elBody) this.elBody.scrollTop = this.elBody.scrollHeight; },
    post(role, text){ if(!this.elBody) return; const line = document.createElement('div'); line.className = `msg ${role}`; const bubble = document.createElement('div'); bubble.className='bubble'; bubble.textContent=text; line.appendChild(bubble); this.elBody.appendChild(line); this.history.push({role, text}); this.persist(); this.scroll(); },
    persist(){ try { localStorage.setItem(this.storageKey, JSON.stringify({items: this.history.slice(-150), said:[...this.said].slice(-500)})); } catch(e){} },
    load(){ try{ const raw = localStorage.getItem(this.storageKey); if(!raw) return; const data = JSON.parse(raw); this.said = new Set(Array.isArray(data?.said)? data.said: []); this.history = data?.items || []; this.history.forEach(it=> this.post(it.role, it.text)); }catch(e){} },
    clear(){ this.elBody.innerHTML=''; this.history = []; this.said.clear(); this.persist(); },
    send(){ const v = this.elInput.value.trim(); if(!v) return; this.post('user', v); this.elInput.value=''; setTimeout(()=> this.reply(v), 120); },
    reply(text){ const t = text.toLowerCase(); if(t.includes('help')||t.includes('how')) return this.post('bot', 'Phases go Action → Treasure → Buy.'); if(t.includes('score')){ const {p,a}=computeScores(); return this.post('bot', `VP check → You: ${p}, AI: ${a}.`); } this.post('bot', '🤖'); },
    say(evt, data){ if(evt==='shuffle'){ this.post('bot', 'Deck shuffled.'); } else if(evt==='playerBuy'){ this.post('bot', `You bought ${data.name}.`);} else if(evt==='aiTurn'){ this.post('bot',`AI bought ${(data?.bought||[]).join(', ') || 'nothing'}.`);}}
};

const Coach=(function(){let s=0;const steps=[
{title:"Welcome!",text:"Phases: Action → Treasure → Buy."},
{title:"Supply",text:"Click piles during Buy to gain cards."},
{title:"Hand",text:"Play Actions, then Treasures, then Buy."},
{title:"Status",text:"Watch Actions, Buys, Coins."},
{title:"Go win!",text:"Build economy, then green at the right time."}
];function show(){const o=document.getElementById('coach');if(!o)return;o.classList.add('show');sync();}
function hide(){const o=document.getElementById('coach');if(o)o.classList.remove('show');}
function sync(){const t=document.getElementById('coachTitle');const d=document.getElementById('coachText');if(t&&d){t.textContent=steps[s].title;d.textContent=steps[s].text;}}
function next(){s++;if(s>=steps.length){hide();return;}sync();}
function restart(){s=0;show();}
function init(){const n=document.getElementById('coachNext');const sk=document.getElementById('coachSkip');if(n)n.onclick=next;if(sk)sk.onclick=hide;const btn=document.getElementById('tutorialBtn');if(btn)btn.onclick=restart;}
function ensureInit(){init();}
return{init,ensureInit,restart,maybeStart:()=>{}};})();

function groupByName(cards){ const m = new Map(); cards.forEach(c=> m.set(c.name, (m.get(c.name)||0)+1)); return [...m.entries()].sort((a,b)=> a[0].localeCompare(b[0])).map(([n,k])=> `${n}×${k}`).join(', '); }
function writeAIDebug(lines){ const box = document.getElementById('ai-debug'); const dbgEl = document.getElementById('debugAICheck'); if(!box || !(dbgEl && dbgEl.checked)){ if(box) {box.style.display='none'; box.textContent='';} return; } box.style.display='block'; box.textContent = (lines||[]).join('\n'); }
function aiPlayBestActionStrong(debug){
    if (game.aiActions <= 0) return false;
    const hand = game.ai.hand;
    let bestCardIndex = -1;
    const engineOrder = ['Village', 'Festival', 'Market', 'Laboratory', 'Merchant'];
    for (const cardName of engineOrder) {
        const idx = hand.findIndex(c => c.name === cardName);
        if (idx !== -1) {
            bestCardIndex = idx;
            break;
        }
    }
    if (bestCardIndex === -1) {
        const terminalOrder = ['Smithy', 'Workshop', 'Woodcutter'];
        for (const cardName of terminalOrder) {
            const idx = hand.findIndex(c => c.name === cardName);
            if (idx !== -1) { bestCardIndex = idx; break; }
        }
    }
    // Fallback: if any Action exists, play it to ensure we consume all available actions
    if (bestCardIndex === -1) {
        const anyActionIdx = hand.findIndex(c => c.type === 'Action');
        if (anyActionIdx !== -1) bestCardIndex = anyActionIdx;
    }
    if (bestCardIndex === -1) return false;
    game.aiActions -= 1;
    const [act] = hand.splice(bestCardIndex, 1);
    game.ai.played.push(act);
    if (debug) debug.push(`Action: ${act.name}`);
    if (typeof act.effect === 'function') act.effect(game, game.ai);
    return true;
}
function aiAutoPlayTreasures(debug){ let add=0; const played=[]; for(let i=game.ai.hand.length-1;i>=0;i--){ if(game.ai.hand[i].type==='Treasure'){ const t = game.ai.hand.splice(i,1)[0]; game.ai.played.push(t); if(t.name==='Silver' && game.merchantPending.ai > 0){ add += (t.value||0) + game.merchantPending.ai; game.merchantPending.ai = 0; if(debug) debug.push(`Merchant bonus on Silver!`); } else { add += (t.value||0); } played.push(t); } } if(debug && played.length) debug.push(`Treasures: ${groupByName(played)} => +${add}`); game.aiCoins += add; return add; }
function aiGainChoiceUpTo(maxCost){ const provLeft = getPile('Province')?.count ?? 12; if(provLeft<=3){ if(maxCost>=2 && getPile('Estate').count>0) return 'Estate'; } const needVillage = [...game.ai.deck,...game.ai.discard].filter(c=>c.name==='Village').length < ([...game.ai.deck,...game.ai.discard].filter(c=>c.name==='Smithy').length)/2; if(needVillage && maxCost>=3 && getPile('Village').count>0) return 'Village'; if(maxCost>=4 && getPile('Smithy').count>0) return 'Smithy'; if(maxCost>=3 && getPile('Silver').count>0) return 'Silver'; if(maxCost>=3 && getPile('Merchant').count>0) return 'Merchant'; const eligible = SUPPLY.filter(p=> p.count>0 && CARD_DEFS[p.key].cost<=maxCost); return eligible.length? eligible[Math.floor(Math.random()*eligible.length)].key : null; }
function aiChooseBuyStrong(debug){
    const coins = game.aiCoins;
    const provLeft = getPile('Province')?.count ?? 12;
    const can = (name) => { const pile = getPile(name); return pile && pile.count > 0; };
    let pick = null;

    let gamePhase = 'early';
    if (provLeft <= 8) gamePhase = 'mid';
    if (provLeft <= 4) gamePhase = 'late';
    
    // Prefer Villages when terminal-heavy to improve action chaining,
    // but only when we don't have enough coins for higher-value buys
    try {
        const zones = [...game.ai.deck, ...game.ai.discard];
        const terminalNames = ['Smithy','Workshop','Woodcutter'];
        let terminalCount = 0; let villageCount = 0;
        for (const c of zones){ if(!c) continue; if (terminalNames.includes(c.name)) terminalCount++; else if (c.name==='Village') villageCount++; }
        if (coins >= 3 && coins < 5 && can('Village') && terminalCount > villageCount * 1.5) return 'Village';
    } catch(e){}

    if (gamePhase === 'late' || game.humanStartedGreening) {
        if (coins >= 8 && can('Province')) return 'Province';
        if (coins >= 5 && can('Duchy')) return 'Duchy';
        if (coins >= 2 && can('Estate')) return 'Estate';
    }
    if (gamePhase === 'mid') {
        if (coins >= 8 && can('Province')) return 'Province';
        if (coins >= 5 && can('Duchy') && Math.random() < 0.5) return 'Duchy';
    }
    if (coins >= 6 && can('Gold')) return 'Gold';
    if (coins >= 5) {
        const midPrefs = ['Festival', 'Market', 'Laboratory', 'Smithy'];
        pick = midPrefs.find(can);
        if (pick) return pick;
    }
    if (coins >= 4 && can('Smithy')) return 'Smithy';
    if (coins >= 3) {
        const earlyPrefs = ['Silver', 'Village', 'Merchant', 'Workshop', 'Woodcutter'];
        pick = earlyPrefs.find(can);
        if (pick) return pick;
    }
    
    return pick;
}
function aiMultiBuy(debug, mode){ let boughtList=[]; let safety=5; while(game.aiBuys>0 && safety-->0){ const choice = aiChooseBuyStrong(debug); if(!choice) break; const pile = getPile(choice); const def = CARD_DEFS[choice]; if(!pile || pile.count<=0 || game.aiCoins < def.cost) break; pile.count--; game.ai.discard.push(instance(choice)); game.aiCoins -= def.cost; game.aiBuys -= 1; boughtList.push(choice); checkEndgameFlags(); } return boughtList; }

function aiTurn(){
    if(game.gameOver) return;
    const dbgEl = document.getElementById('debugAICheck');
    const dbg = !!(dbgEl && dbgEl.checked);
    const provLeft = getPile('Province')?.count ?? 12;
    let gamePhase = 'early';
    if (provLeft <= 8) gamePhase = 'mid';
    if (provLeft <= 4) gamePhase = 'late';
    const debug = dbg ? [`BUILD: ${BUILD.num}`, `---`, `Turn start - hand: ${groupByName(game.ai.hand)}`, `Game Phase: ${gamePhase} (${provLeft} Provinces left)`] : [];

    game.aiActions=1; game.aiBuys=1; game.aiCoins=0; game.merchantPending.ai = 0;
    let playedSomething=true;
    let guard=10;
    while(playedSomething && guard-->0){ playedSomething = aiPlayBestActionStrong(debug); }
    const gained = aiAutoPlayTreasures(debug);
    const boughtList = aiMultiBuy(debug, game.aiMode);
    if(dbg) {
        debug.push(`---`);
        if(boughtList.length) debug.push(`Bought: ${boughtList.join(', ')}`);
        debug.push(`End coins: ${game.aiCoins}, End buys: ${game.aiBuys}`);
        document.getElementById('ai-status').innerHTML = debug.join('<br>');
    } else {
        const bought = boughtList.length ? boughtList.join(', ') : 'nothing';
        document.getElementById('ai-status').textContent = `AI played actions, +${gained} coins, and bought ${bought}.`;
    }
    game.ai.discard.push(...game.ai.hand, ...game.ai.played);
    game.ai.hand.length=0;
    game.ai.played.length=0;
    for(let i=0;i<5;i++) drawOne(game.ai);
    checkEndgameFlags();
    if(endIfNeeded()) return;
    
    game.turn='player';
    game.actions = 1;
    game.buys = 1;
    game.coins = 0;
    game.phase = 'action';
    game.turnNum += 1;
    addLog(`Your turn [${game.turnNum}].`);
    Chat.say('aiTurn', {bought:boughtList});
    render();
}

function updateHighScoreDisplay() {
    const highScore = parseInt(localStorage.getItem('dominionHighScore')) || 0;
    if (highScore > 0) {
        document.getElementById('highScorePill').style.display = 'inline-flex';
        document.getElementById('highScore').textContent = highScore;
    }
}

function startGame() {
    Object.assign(game, {
        player: { deck:[], discard:[], hand:[], played:[] },
        ai: { deck:[], discard:[], hand:[], played:[] },
        actions: 1, buys: 1, coins: 0, turn: 'player', phase: 'action',
        gameOver: false, endAfterThisTurn: false, turnNum: 1,
        undo: null,
        humanStartedGreening: false
    });
    SUPPLY.forEach(p => {
        if(CARD_DEFS[p.key].type === 'Treasure' || CARD_DEFS[p.key].type === 'Victory') {
             p.count = (p.key === 'Copper' ? 60 : (p.key === 'Silver' ? 40 : (p.key === 'Gold' ? 30 : (p.key === 'Estate' ? 24 : 12))));
        } else {
            p.count = 10;
        }
    });

    const p = game.player, a = game.ai;
    for(let i=0;i<7;i++){ p.deck.push(instance('Copper')); a.deck.push(instance('Copper')); }
    for(let i=0;i<3;i++){ p.deck.push(instance('Estate')); a.deck.push(instance('Estate')); }
    shuffle(p.deck); shuffle(a.deck);
    for(let i=0;i<5;i++){ drawOne(p); drawOne(a); }

    logs = [];
    addLog(`Welcome to Dominion! Build ${BUILD.num}`);
    updateHighScoreDisplay();
    updateUndoUI();
    document.getElementById('overlay').classList.remove('show');
    render();
}

// --- Game Initialization ------------------------------------------------
function init() {
    const buildEl = document.getElementById('build');
    if (buildEl) buildEl.textContent = `Build ${BUILD.num}`;
    Chat.init();
    Coach.init();
    Sound.load();
    ['pointerdown','keydown','click','touchstart'].forEach(ev=> document.addEventListener(ev, ()=>Sound.resume(), {once:true}));

    const v = document.getElementById('vol'); const m = document.getElementById('muteToggle');
    if(v) v.value = Math.round(Sound.vol*100);
    if(m) m.checked = Sound.muted;
    if(v) v.oninput = (e)=>{ Sound.setVolume((e.target.value)/100); };
    if(m) m.onchange = (e)=>{ Sound.setMuted(!!e.target.checked); };
    const autoAdvanceEl = document.getElementById('autoAdvance');
    if (autoAdvanceEl) autoAdvanceEl.checked = game.autoAdvance;
    const debugAICheckEl = document.getElementById('debugAICheck');
    if (debugAICheckEl) debugAICheckEl.checked = game.debugAI;
    if (autoAdvanceEl) autoAdvanceEl.onchange=(e)=>{ game.autoAdvance=e.target.checked; };
    if (debugAICheckEl) debugAICheckEl.onchange=(e)=>{ game.debugAI=e.target.checked; writeAIDebug([]); };

    document.getElementById('newGameBtn').onclick = startGame;
    document.getElementById('gameOverNewGameBtn').onclick = startGame;
    document.getElementById('endTurnBtn').onclick = endTurn;
    document.getElementById('autoTreasureBtn').onclick = autoPlayTreasures;
    document.getElementById('toBuyBtn').onclick = () => { if (game.phase !== 'buy') { snapshot(); game.phase = 'buy'; addLog('Buy phase.'); render(); } };
    document.getElementById('undoBtn').onclick = undo;
    document.getElementById('tutorialBtn').onclick = () => { Coach.ensureInit(); Coach.restart(); };
    
    const actionButtonConfigs = [
        { id: 'toBuyBtn', text: 'Switch to the Buy phase to purchase cards.' },
        { id: 'autoTreasureBtn', text: 'Automatically play all Treasure cards from your hand.' },
        { id: 'undoBtn', text: 'Undo your last action (if possible).' },
        { id: 'endTurnBtn', text: 'End your turn and let the AI play.' }
    ];
    actionButtonConfigs.forEach(({ id, text }) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onmouseenter = (e) => showTooltip(text, btn, e);
            btn.onmouseleave = hideTooltip;
        }
    });

    startGame(); // Start the first game automatically
}

document.addEventListener('DOMContentLoaded', init);