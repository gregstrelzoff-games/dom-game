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

// ------------------- Rendering -------------------
function render(){
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
  const groups = [ { title:'Coins', type:'Treasure' }, { title:'Victory Cards', type:'Victory' }, { title:'Action Cards', type:'Action' } ];
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
  indexed.sort((a,b)=>{ const ga = groupRank[a.c.type] ?? 3; const gb = groupRank[b.c.type] ?? 3; if(ga!==gb) return ga-gb; if(a.c.type==='Action' && b.c.type==='Action') return a.c.name.localeCompare(b.c.name); if(a.c.type==='Treasure' && b.c.type==='Treasure') return (b.c.value||0)-(a.c.value||0) || a.c.name.localeCompare(b.c.name); if(a.c.type==='Victory' && b.c.type==='Victory') return (b.c.points||0)-(a.c.points||0) || a.c.name.localeCompare(b.c.name); return a.c.name.localeCompare(b.c.name); });
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

// ------------------- Log & Tooltip -------------------
const LOG_MAX = 10; let LOG_SILENT=false; const logs = [];
function addLog(msg, cls){ if(LOG_SILENT) return; logs.push({msg, cls}); while(logs.length>LOG_MAX) logs.shift(); const el = document.getElementById('log'); if(el) el.innerHTML = logs.map(l=>`<span class="${l.cls||''}">• ${l.msg}</span>`).join('\n'); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1800); }

const tip = document.getElementById('tooltip');
function showTip(html, x, y){ tip.innerHTML = html; tip.style.display='block'; const pad=10; const w=260; const h= tip.offsetHeight||100; let left = Math.min(window.innerWidth - w - pad, x + 14); let top  = Math.min(window.innerHeight - h - pad, y + 14); tip.style.left = left + 'px'; tip.style.top = top + 'px'; }
function hideTip(){ tip.style.display='none'; }
function cardTip(def){ const meta = []; if(def.type==='Treasure') meta.push(`+${def.value} coins`); if(def.type==='Victory') meta.push(`${def.points} VP`); if(def.type==='Action') meta.push(def.desc||'Action'); return `<div class="tTitle">${def.name}</div><div class="tMeta">Type: ${def.type} · Cost: ${def.cost}</div><div style=\"margin-top:4px\">${meta.join(' · ')}</div>`; }
