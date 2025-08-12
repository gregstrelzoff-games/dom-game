  Estate:    { name:'Estate',    cost:2, type:'Victory',  points:1, desc:'Worth 1 VP at end of game' },
  Duchy:     { name:'Duchy',     cost:5, type:'Victory',  points:3, desc:'Worth 3 VP at end of game' },
  Province:  { name:'Province',  cost:8, type:'Victory',  points:6, desc:'Worth 6 VP at end of game' },
               effect: (g,actor)=>{ drawCards(actor,3); if(actor===g.player) addLog(`You played Smithy and drew 3 cards.`); } },
               effect: (g,actor)=>{ drawCards(actor,1); if(actor===g.player){ g.actions += 2; addLog(`You played Village: +1 card, +2 actions.`);} else { g.aiActions += 2; } } },
               effect: (g,actor)=>{ drawCards(actor,1); if(actor===g.player){ g.actions += 1; g.buys += 1; g.coins += 1; addLog('You played Market: +1 card, +1 action, +1 buy, +1 coin.'); } else { g.aiActions += 1; g.aiBuys += 1; g.aiCoins += 1; } } },
               effect: (g,actor)=>{ drawCards(actor,2); if(actor===g.player){ g.actions += 1; addLog('You played Laboratory: +2 cards, +1 action.'); } else { g.aiActions += 1; } } },
               effect: (g,actor)=>{ if(actor===g.player){ g.actions += 2; g.buys += 1; g.coins += 2; addLog('You played Festival: +2 actions, +1 buy, +2 coins.'); } else { g.aiActions += 2; g.aiBuys += 1; g.aiCoins += 2; } } },
               effect: (g,actor)=>{ if(actor===g.player){ g.buys += 1; g.coins += 2; addLog('You played Woodcutter: +1 buy, +2 coins.'); } else { g.aiBuys += 1; g.aiCoins += 2; } } },
               effect: (g,actor)=>{ drawCards(actor,1); if(actor===g.player){ g.actions += 1; g.merchantPending.player++; addLog('You played Merchant: +1 card, +1 action. The first time you play a Silver this turn, +$1.'); } else { g.aiActions += 1; g.merchantPending.ai++; } } },
  Workshop:  { name:'Workshop',  cost:3, type:'Action',   desc:'Gain a card costing up to 4 to your discard',
               effect: (g,actor)=>{ if(actor===g.player){ openGainChoice(4, g.player, 'Workshop'); } else { const pick = aiGainChoiceUpTo(4); if(pick){ const pile=getPile(pick); if(pile&&pile.count>0){ pile.count--; g.ai.discard.push(instance(pick)); } } } } },
// ------------------- Game State -------------------
const game = {
  player:{ deck:[], discard:[], hand:[], played:[] },
  ai:     { deck:[], discard:[], hand:[], played:[] },
  actions:1, buys:1, coins:0, turn:'player', phase:'action',
  endAfterThisTurn:false, gameOver:false,
  merchantPending:{ player:0, ai:0 },
function packActor(actor){ return { deck: actor.deck.map(c=>c.name), discard: actor.discard.map(c=>c.name), hand: actor.hand.map(c=>c.name), played: actor.played.map(c=>c.name) }; }
function unpackActor(p){ return { deck: p.deck.map(instance), discard: p.discard.map(instance), hand: p.hand.map(instance), played: p.played.map(instance) }; }
  if(actor===game.player && game.turn==='player' && game.undo){ game.undoForbidden='draw'; } }
function computeScores(){ const p = vpOfPile([...game.player.deck,...game.player.discard,...game.player.hand]); const a = vpOfPile([...game.ai.deck,...game.ai.discard,...game.ai.hand]); return {p,a}; }
function closeChoiceOverlay(){ const over=document.getElementById('choiceOverlay'); over.classList.remove('show'); game.interactionLock=false; }
function syncLockFromOverlay(){ game.interactionLock = isChoiceOpen(); }
function hasPlayableAction(){ return !game.interactionLock && game.actions>0 && game.player.hand.some(c=>c.type==='Action'); }
function hasTreasure(){ return !game.interactionLock && game.player.hand.some(c=>c.type==='Treasure'); }
function checkEndgameFlags(){ const prov = getPile('Province'); if(prov && prov.count===0) game.endAfterThisTurn = true; if(emptyPileCount() >= 3)  game.endAfterThisTurn = true; if(game.endAfterThisTurn) addLog('End condition met - game will end after this turn.'); }
function showWinner(){ const {p,a} = computeScores(); const title = (p>a)? 'You win!': (a>p? 'AI wins.':'Tie game.'); document.getElementById('winnerTitle').textContent = title; document.getElementById('winnerDetail').textContent = `Final score - You: ${p} · AI: ${a}`; document.getElementById('overlay').classList.add('show'); Sound.play('end'); Chat.endGame(title, {p,a}); }
// Player counts HTML
function playerCountsHTML(){ const all=[...game.player.deck, ...game.player.discard, ...game.player.hand]; const map={}; const typeTotals={Treasure:0, Victory:0, Action:0}; all.forEach(c=>{ map[c.name]=(map[c.name]||0)+1; typeTotals[c.type]=(typeTotals[c.type]||0)+1; }); const block=(label,names)=>{ const total = typeTotals[label]||0; const details = names.map(n=> `${n} ${map[n]||0}`).join(' · '); return `<div class=\"countGroup\"><div class=\"row\"><span class=\"label\">${label}</span><span class=\"totalWrap\"><span class=\"mini\">total</span><span class=\"totalNum\"><strong>${total}</strong></span></span></div><div class=\"sub\">${details}</div></div>`; }; return [ block('Treasure',['Gold','Silver','Copper']), block('Victory',['Province','Duchy','Estate']), block('Action',['Festival','Laboratory','Market','Merchant','Smithy','Village','Workshop','Woodcutter']) ].join(''); }
function writeAIDebug(lines){ const box = document.getElementById('ai-debug'); if(!box) return; if(!game.debugAI){ box.style.display='none'; box.textContent=''; return; } box.style.display='block'; box.textContent = (lines||[]).join('\n'); }
  game.interactionLock = true; updateUndoUI();
      pile.count--; actor.discard.push(instance(def.name));
      game.interactionLock = false; updateUndoUI(); checkEndgameFlags(); render();
function canUndo(){ return !!game.undo; }
  const p=game.player, a=game.ai;
  for(let i=0;i<7;i++){ p.deck.push(instance('Copper')); a.deck.push(instance('Copper')); }
  for(let i=0;i<3;i++){ p.deck.push(instance('Estate')); a.deck.push(instance('Estate')); }
  shuffle(p.deck); shuffle(a.deck);
  document.getElementById('autoAdvance').checked=game.autoAdvance;
  document.getElementById('autoAdvance').onchange=(e)=>{ game.autoAdvance=e.target.checked; };
  const sel=document.getElementById('aiMode'); sel.value=game.aiMode; sel.onchange=(e)=>{ game.aiMode=e.target.value; toast(`AI set to ${game.aiMode}`); };
  const dbg=document.getElementById('debugAICheck'); dbg.checked=game.debugAI; dbg.onchange=(e)=>{ game.debugAI=e.target.checked; writeAIDebug([]); };
  document.getElementById('newGameBtn').onclick = ()=> location.reload();
  lastCountsHTML = playerCountsHTML();
  const pc = document.getElementById('playerCounts'); if(pc) pc.innerHTML = lastCountsHTML;
  addLog(`Build ${BUILD.num} ready. Your turn [${game.turnNum}].`);
  Chat.startGame?.();
  document.getElementById('actions').textContent = game.actions;
  document.getElementById('buys').textContent    = game.buys;
  document.getElementById('coins').textContent   = game.coins;
  document.getElementById('phase').textContent   = game.phase.charAt(0).toUpperCase()+game.phase.slice(1);
  const pc = document.getElementById('playerCounts'); if(pc) pc.innerHTML = lastCountsHTML;
        const canBuy = (!game.gameOver && !game.interactionLock && game.turn==='player' && game.phase==='buy' && game.buys>0 && game.coins>=def.cost && pile.count>0);
  const hand = document.getElementById('player-hand'); hand.innerHTML='';
  const indexed = game.player.hand.map((c,idx)=>({c,idx}));
    const canPlayAction = (!game.gameOver && !game.interactionLock && c.type==='Action' && game.turn==='player' && game.phase==='action' && game.actions>0);
    const canPlayTreasure = (!game.gameOver && !game.interactionLock && c.type==='Treasure' && game.turn==='player' && game.phase!=='buy');
  document.getElementById('endTurnBtn').onclick = ()=>{ if(!game.interactionLock){ Sound.play('end'); endTurn(); } };
  document.getElementById('autoTreasureBtn').onclick = ()=>{ if(game.interactionLock) return; if(game.phase==='action') game.phase='treasure'; snapshot(); autoPlayTreasures(); };
  document.getElementById('toBuyBtn').onclick = ()=>{ if(game.interactionLock) return; if(game.phase!=='buy'){ snapshot(); game.phase='buy'; addLog('Buy phase. Buying disables further card play this turn.'); render(); } };
function endIfNeeded(){ if(game.endAfterThisTurn){ game.gameOver=true; showWinner(); return true; } return false; }
// ------------------- Actions & Buys (Player) -------------------
function cleanupAndDraw(who){ who.discard.push(...who.hand, ...who.played); who.hand.length=0; who.played.length=0; for(let i=0;i<5;i++) drawOne(who); }
function aiPlayBestActionStrong(debug){ if(game.aiActions<=0) return false; const hand = game.ai.hand; const hasTerminal = hand.some(c=> c.name==='Smithy' || c.name==='Woodcutter' || c.name==='Workshop'); let idx = -1; if(hand.some(c=>c.name==='Village') && (game.aiActions<=1) && (hasTerminal)){ idx = hand.findIndex(c=>c.name==='Village'); } else if(hand.some(c=>c.name==='Festival')){ idx = hand.findIndex(c=>c.name==='Festival'); } else if(hand.some(c=>c.name==='Market')){ idx = hand.findIndex(c=>c.name==='Market'); } else if(hand.some(c=>c.name==='Laboratory')){ idx = hand.findIndex(c=>c.name==='Laboratory'); } else if(hand.some(c=>c.name==='Merchant')){ idx = hand.findIndex(c=>c.name==='Merchant'); } else if(hand.some(c=>c.name==='Smithy')){ idx = hand.findIndex(c=>c.name==='Smithy'); } else if(hand.some(c=>c.name==='Workshop')){ idx = hand.findIndex(c=>c.name==='Workshop'); } else if(hand.some(c=>c.name==='Village')){ idx = hand.findIndex(c=>c.name==='Village'); } else if(hand.some(c=>c.name==='Woodcutter')){ idx = hand.findIndex(c=>c.name==='Woodcutter'); } if(idx===-1) return false; game.aiActions -= 1; const [act] = hand.splice(idx,1); game.ai.played.push(act); if(debug) debug.push(`Action: ${act.name}`); if(typeof act.effect==='function') act.effect(game, game.ai); return true; }
function aiPlayBestActionWeak(debug){ if(game.aiActions<=0) return false; const hand = game.ai.hand; let order = ['Festival','Market','Laboratory','Merchant','Smithy','Workshop','Village','Woodcutter']; let idx = order.map(n=> hand.findIndex(c=>c.name===n)).find(i=>i!==-1) ?? -1; if(idx===-1) return false; game.aiActions -= 1; const [act] = hand.splice(idx,1); game.ai.played.push(act); if(debug) debug.push(`[Weak] Action: ${act.name}`); if(typeof act.effect==='function') act.effect(game, game.ai); game.aiActions = 0; return true; }
function aiAutoPlayTreasures(debug){ let add=0; const played=[]; let sawSilver=false; for(let i=game.ai.hand.length-1;i>=0;i--){ if(game.ai.hand[i].type==='Treasure'){ const t = game.ai.hand.splice(i,1)[0]; game.ai.played.push(t); add += (t.value||0); played.push(t); if(t.name==='Silver') sawSilver=true; } } if(sawSilver && game.merchantPending.ai>0){ add += game.merchantPending.ai; if(debug) debug.push(`Merchant bonus on Silver: +${game.merchantPending.ai}`); game.merchantPending.ai=0; } if(debug && played.length) debug.push(`Treasures: ${groupByName(played)} => +${add}`); game.aiCoins += add; return add; }
function aiCountInDeck(name){ const all=[...game.ai.deck,...game.ai.discard,...game.ai.hand,...game.ai.played]; return all.filter(c=>c.name===name).length; }