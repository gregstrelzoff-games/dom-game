/* build: v9.3.19 | file: assets/poc-game.js | date: 2025-08-14 */

// ------------------- Card Definitions -------------------
const CARD_DEFS = {
  Copper:    { name:'Copper',    cost:0, type:'Treasure', value:1, desc:'+1 coin' },
  Silver:    { name:'Silver',    cost:3, type:'Treasure', value:2, desc:'+2 coins' },
  Gold:      { name:'Gold',      cost:6, type:'Treasure', value:3, desc:'+3 coins' },
  Estate:    { name:'Estate',    cost:2, type:'Victory',  points:1, desc:'Worth 1 VP at end of game' },
  Duchy:     { name:'Duchy',     cost:5, type:'Victory',  points:3, desc:'Worth 3 VP at end of game' },
  Province:  { name:'Province',  cost:8, type:'Victory',  points:6, desc:'Worth 6 VP at end of game' },
  Smithy:    { name:'Smithy',    cost:4, type:'Action',   desc:'+3 cards',
               effect: (g,actor)=>{ drawCards(actor,3); if(actor===g.player) addLog(`You played Smithy and drew 3 cards.`); } },
  Village:   { name:'Village',   cost:3, type:'Action',   desc:'+1 card, +2 actions',
               effect: (g,actor)=>{ drawCards(actor,1); if(actor===g.player){ g.actions += 2; addLog(`You played Village: +1 card, +2 actions.`);} else { g.aiActions += 2; } } },
  Market:    { name:'Market',    cost:5, type:'Action',   desc:'+1 card, +1 action, +1 buy, +1 coin',
               effect: (g,actor)=>{ drawCards(actor,1); if(actor===g.player){ g.actions += 1; g.buys += 1; g.coins += 1; addLog('You played Market: +1 card, +1 action, +1 buy, +1 coin.'); } else { g.aiActions += 1; g.aiBuys += 1; g.aiCoins += 1; } } },
  Laboratory:{ name:'Laboratory',cost:5, type:'Action',   desc:'+2 cards, +1 action',
               effect: (g,actor)=>{ drawCards(actor,2); if(actor===g.player){ g.actions += 1; addLog('You played Laboratory: +2 cards, +1 action.'); } else { g.aiActions += 1; } } },
  Festival:  { name:'Festival',  cost:5, type:'Action',   desc:'+2 actions, +1 buy, +2 coins',
               effect: (g,actor)=>{ if(actor===g.player){ g.actions += 2; g.buys += 1; g.coins += 2; addLog('You played Festival: +2 actions, +1 buy, +2 coins.'); } else { g.aiActions += 2; g.aiBuys += 1; g.aiCoins += 2; } } },
  Woodcutter:{ name:'Woodcutter',cost:3, type:'Action',   desc:'+1 buy, +2 coins',
               effect: (g,actor)=>{ if(actor===g.player){ g.buys += 1; g.coins += 2; addLog('You played Woodcutter: +1 buy, +2 coins.'); } else { g.aiBuys += 1; g.aiCoins += 2; } } },
  Merchant:  { name:'Merchant',  cost:3, type:'Action',   desc:'Draw 1, +1 Action. The first time you play a Silver this turn, +$1.',
               effect: (g,actor)=>{ drawCards(actor,1); if(actor===g.player){ g.actions += 1; g.merchantPending.player++; addLog('You played Merchant: +1 card, +1 action. The first time you play a Silver this turn, +$1.'); } else { g.aiActions += 1; g.merchantPending.ai++; } } },
  Workshop:  { name:'Workshop',  cost:3, type:'Action',   desc:'Gain a card costing up to 4 to your discard',
               effect: (g,actor)=>{ if(actor===g.player){ openGainChoice(4, g.player, 'Workshop'); } else { const pick = aiGainChoiceUpTo(4); if(pick){ const pile=getPile(pick); if(pile&&pile.count>0){ pile.count--; g.ai.discard.push(instance(pick)); } } } } },
};

const SUPPLY = [
  { key:'Copper',   count:60 },
  { key:'Silver',   count:40 },
  { key:'Gold',     count:30 },
  { key:'Estate',   count:24 },
  { key:'Duchy',    count:12 },
  { key:'Province', count:12 },
  { key:'Smithy',   count:10 },
  { key:'Village',  count:10 },
  { key:'Market',   count:10 },
  { key:'Laboratory',count:10 },
  { key:'Festival', count:10 },
  { key:'Woodcutter',count:10 },
  { key:'Merchant', count:10 },
  { key:'Workshop', count:10 },
];



// ------------------- Game State -------------------
const game = {
  player:{ deck:[], discard:[], hand:[], played:[] },
  ai:     { deck:[], discard:[], hand:[], played:[] },
  actions:1, buys:1, coins:0, turn:'player', phase:'action',
  autoAdvance:true,
  debugAI:false,
  aiActions:1, aiBuys:1, aiCoins:0,
  endAfterThisTurn:false, gameOver:false,
  aiMode:'strong',
  undo:null,
  undoForbidden:null,
  suppressAutoAdvanceOnce:false,
  interactionLock:false,
  merchantPending:{ player:0, ai:0 },
  turnNum:1,
};



// ------------------- Helpers -------------------
function instance(name){ return { ...CARD_DEFS[name] }; }
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }
function packActor(actor){ return { deck: actor.deck.map(c=>c.name), discard: actor.discard.map(c=>c.name), hand: actor.hand.map(c=>c.name), played: actor.played.map(c=>c.name) }; }
function unpackActor(p){ return { deck: p.deck.map(instance), discard: p.discard.map(instance), hand: p.hand.map(instance), played: p.played.map(instance) }; }
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }
function drawOne(actor){ if(actor.deck.length===0){ actor.deck.push(...actor.discard); actor.discard.length=0; shuffle(actor.deck); if(actor===game.player){ addLog('Your deck was shuffled.', 'mint'); Chat.say('shuffle'); } Sound.play('shuffle'); } if(actor.deck.length>0){ actor.hand.push(actor.deck.pop()); if(actor===game.player) Sound.play('draw'); }
  if(actor===game.player && game.turn==='player' && game.undo){ game.undoForbidden='draw'; } }
function drawCards(actor,n){ for(let i=0;i<n;i++) drawOne(actor); }
function vpOfPile(pile){ return pile.reduce((sum,c)=> sum + (c.points||0), 0); }
function computeScores(){ const p = vpOfPile([...game.player.deck,...game.player.discard,...game.player.hand]); const a = vpOfPile([...game.ai.deck,...game.ai.discard,...game.ai.hand]); return {p,a}; }
function cardIcon(name){ switch(name){ case 'Copper': return '🟠'; case 'Silver': return '⚪️'; case 'Gold': return '🟡'; case 'Estate': return '🏠'; case 'Duchy': return '🏯'; case 'Province': return '🏰'; case 'Smithy': return '⚒️'; case 'Village': return '🏘️'; case 'Market': return '🛒'; case 'Laboratory': return '🧪'; case 'Festival': return '🎪'; case 'Woodcutter': return '🪓'; case 'Merchant': return '🏬'; case 'Workshop': return '🧰'; default: return '🃏'; } }

function isChoiceOpen(){ return document.getElementById('choiceOverlay').classList.contains('show'); }
function closeChoiceOverlay(){ const over=document.getElementById('choiceOverlay'); over.classList.remove('show'); game.interactionLock=false; }
function syncLockFromOverlay(){ game.interactionLock = isChoiceOpen(); }
function hasPlayableAction(){ return !game.interactionLock && game.actions>0 && game.player.hand.some(c=>c.type==='Action'); }
function hasTreasure(){ return !game.interactionLock && game.player.hand.some(c=>c.type==='Treasure'); }
function maybeAutoAdvance(){ if(game.interactionLock) return false; if(game.suppressAutoAdvanceOnce){ game.suppressAutoAdvanceOnce=false; return false; } if(!game.autoAdvance || game.gameOver) return false; let changed=false; if(game.phase==='action' && !hasPlayableAction()){ game.phase='treasure'; changed=true; } if(game.phase==='treasure' && !hasTreasure()){ game.phase='buy'; changed=true; } return changed; }

function emptyPileCount(){ return SUPPLY.reduce((n,p)=> n + (p.count===0?1:0), 0); }
function getPile(name){ return SUPPLY.find(p=>p.key===name); }
function checkEndgameFlags(){ const prov = getPile('Province'); if(prov && prov.count===0) game.endAfterThisTurn = true; if(emptyPileCount() >= 3)  game.endAfterThisTurn = true; if(game.endAfterThisTurn) addLog('End condition met - game will end after this turn.'); }
function showWinner(){ const {p,a} = computeScores(); const title = (p>a)? 'You win!': (a>p? 'AI wins.':'Tie game.'); document.getElementById('winnerTitle').textContent = title; document.getElementById('winnerDetail').textContent = `Final score - You: ${p} · AI: ${a}`; document.getElementById('overlay').classList.add('show'); Sound.play('end'); Chat.endGame(title, {p,a}); }

function phaseBand(){ const prov = getPile('Province'); const left = prov? prov.count : 12; if(left <= 3) return 'late'; if(left <= 7) return 'mid'; return 'early'; }

// Player counts HTML
function playerCountsHTML(){ const all=[...game.player.deck, ...game.player.discard, ...game.player.hand]; const map={}; const typeTotals={Treasure:0, Victory:0, Action:0}; all.forEach(c=>{ map[c.name]=(map[c.name]||0)+1; typeTotals[c.type]=(typeTotals[c.type]||0)+1; }); const block=(label,names)=>{ const total = typeTotals[label]||0; const details = names.map(n=> `${n} ${map[n]||0}`).join(' · '); return `<div class=\"countGroup\"><div class=\"row\"><span class=\"label\">${label}</span><span class=\"totalWrap\"><span class=\"mini\">total</span><span class=\"totalNum\"><strong>${total}</strong></span></span></div><div class=\"sub\">${details}</div></div>`; }; return [ block('Treasure',['Gold','Silver','Copper']), block('Victory',['Province','Duchy','Estate']), block('Action',['Festival','Laboratory','Market','Merchant','Smithy','Village','Workshop','Woodcutter']) ].join(''); }
let lastCountsHTML = '';



// ---------- Debug helpers ----------
function groupByName(cards){ const m = new Map(); cards.forEach(c=> m.set(c.name, (m.get(c.name)||0)+1)); return [...m.entries()].sort((a,b)=> a[0].localeCompare(b[0])).map(([n,k])=> `${n}×${k}`).join(', '); }
function writeAIDebug(lines){ const box = document.getElementById('ai-debug'); if(!box) return; if(!game.debugAI){ box.style.display='none'; box.textContent=''; return; } box.style.display='block'; box.textContent = (lines||[]).join('\n'); }



// ------------------- Actions & Buys (Player) -------------------
function play(index){ if(game.interactionLock || game.turn!=='player' || game.gameOver) return; const card = game.player.hand[index]; if(!card) return; snapshot(); if(card.type==='Action'){ if(game.phase!=='action' || game.actions<=0) return; game.actions -= 1; const [played] = game.player.hand.splice(index,1); game.player.played.push(played); if(typeof played.effect==='function') played.effect(game, game.player); Sound.play('action'); toast(`Played ${played.name}`); } else if(card.type==='Treasure'){ if(game.phase==='buy') { Sound.play('error'); return; } if(game.phase==='action') game.phase='treasure'; const [tre] = game.player.hand.splice(index,1); game.player.played.push(tre); let add = (tre.value||0); if(tre.name==='Silver' && game.merchantPending.player>0){ add += game.merchantPending.player; addLog(`Merchant boosts Silver: +${game.merchantPending.player}.`); game.merchantPending.player = 0; } game.coins += add; Sound.play('coins'); toast(`+${add} coins`); } render(); }

function autoPlayTreasures(){ if(game.turn!=='player' || game.phase==='buy' || game.gameOver) return; if(game.phase==='action') game.phase='treasure'; let added=0; let count=0; let sawSilver=false; for(let i=game.player.hand.length-1;i>=0;i--){ if(game.player.hand[i].type==='Treasure'){ const card = game.player.hand.splice(i,1)[0]; game.player.played.push(card); added += (card.value||0); count++; if(card.name==='Silver') sawSilver=true; } } if(sawSilver && game.merchantPending.player>0){ added += game.merchantPending.player; addLog(`Merchant boosts Silver: +${game.merchantPending.player}.`); game.merchantPending.player=0; } game.coins += added; if(count>0){ addLog(`Auto-played ${count} treasure${count>1?'s':''} for +${added} coins.`); Sound.play('coins'); toast(`Auto Treasures: +${added}`); } render(); }

function buy(name){ if(game.interactionLock || game.turn!=='player' || game.phase!=='buy' || game.gameOver) return; const pile = getPile(name); const def = CARD_DEFS[name]; if(!pile || !def || pile.count<=0) return; if(game.buys<=0){ Sound.play('error'); toast('No buys left'); return; } if(game.coins < def.cost){ Sound.play('error'); toast('Not enough coins'); return; } snapshot(); game.buys -= 1; game.coins -= def.cost; pile.count -= 1; game.player.discard.push(instance(def.name)); addLog(`You bought ${def.name} for ${def.cost}.`); Sound.play('buy'); toast(`Bought ${def.name} (-${def.cost})`); Chat.say?.('playerBuy', {name:def.name}); checkEndgameFlags(); render(); }



// ------------------- Turn Flow -------------------
function cleanupAndDraw(who){ who.discard.push(...who.hand, ...who.played); who.hand.length=0; who.played.length=0; for(let i=0;i<5;i++) drawOne(who); }
function endTurn(){ if(game.turn!=='player' || game.gameOver) return; game.undo = null; updateUndoUI(); cleanupAndDraw(game.player); lastCountsHTML = playerCountsHTML(); const pc = document.getElementById('playerCounts'); if(pc) pc.innerHTML = lastCountsHTML; if(endIfNeeded()) return; game.turn='ai'; game.actions=1; game.buys=1; game.coins=0; game.phase='action'; game.merchantPending.ai = 0; addLog('AI is thinking...'); render(); setTimeout(aiTurn, 300); }



// ------------------- AI -------------------
function aiPlayBestActionStrong(debug){ if(game.aiActions<=0) return false; const hand = game.ai.hand; const hasTerminal = hand.some(c=> c.name==='Smithy' || c.name==='Woodcutter' || c.name==='Workshop'); let idx = -1; if(hand.some(c=>c.name==='Village') && (game.aiActions<=1) && (hasTerminal)){ idx = hand.findIndex(c=>c.name==='Village'); } else if(hand.some(c=>c.name==='Festival')){ idx = hand.findIndex(c=>c.name==='Festival'); } else if(hand.some(c=>c.name==='Market')){ idx = hand.findIndex(c=>c.name==='Market'); } else if(hand.some(c=>c.name==='Laboratory')){ idx = hand.findIndex(c=>c.name==='Laboratory'); } else if(hand.some(c=>c.name==='Merchant')){ idx = hand.findIndex(c=>c.name==='Merchant'); } else if(hand.some(c=>c.name==='Smithy')){ idx = hand.findIndex(c=>c.name==='Smithy'); } else if(hand.some(c=>c.name==='Workshop')){ idx = hand.findIndex(c=>c.name==='Workshop'); } else if(hand.some(c=>c.name==='Village')){ idx = hand.findIndex(c=>c.name==='Village'); } else if(hand.some(c=>c.name==='Woodcutter')){ idx = hand.findIndex(c=>c.name==='Woodcutter'); } if(idx===-1) return false; game.aiActions -= 1; const [act] = hand.splice(idx,1); game.ai.played.push(act); if(debug) debug.push(`Action: ${act.name}`); if(typeof act.effect==='function') act.effect(game, game.ai); return true; }
function aiPlayBestActionWeak(debug){ if(game.aiActions<=0) return false; const hand = game.ai.hand; let order = ['Festival','Market','Laboratory','Merchant','Smithy','Workshop','Village','Woodcutter']; let idx = order.map(n=> hand.findIndex(c=>c.name===n)).find(i=>i!==-1) ?? -1; if(idx===-1) return false; game.aiActions -= 1; const [act] = hand.splice(idx,1); game.ai.played.push(act); if(debug) debug.push(`[Weak] Action: ${act.name}`); if(typeof act.effect==='function') act.effect(game, game.ai); game.aiActions = 0; return true; }
function aiAutoPlayTreasures(debug){ let add=0; const played=[]; let sawSilver=false; for(let i=game.ai.hand.length-1;i>=0;i--){ if(game.ai.hand[i].type==='Treasure'){ const t = game.ai.hand.splice(i,1)[0]; game.ai.played.push(t); add += (t.value||0); played.push(t); if(t.name==='Silver') sawSilver=true; } } if(sawSilver && game.merchantPending.ai>0){ add += game.merchantPending.ai; if(debug) debug.push(`Merchant bonus on Silver: +${game.merchantPending.ai}`); game.merchantPending.ai=0; } if(debug && played.length) debug.push(`Treasures: ${groupByName(played)} => +${add}`); game.aiCoins += add; return add; }
function aiCountInDeck(name){ const all=[...game.ai.deck,...game.ai.discard,...game.ai.hand,...game.ai.played]; return all.filter(c=>c.name===name).length; }
function aiGainChoiceUpTo(maxCost){ const provLeft = getPile('Province')?.count ?? 12; if(provLeft<=3){ if(maxCost>=2 && getPile('Estate').count>0) return 'Estate'; } const needVillage = aiCountInDeck('Village') < (aiCountInDeck('Smithy') + aiCountInDeck('Workshop'))/2; if(needVillage && maxCost>=3 && getPile('Village').count>0) return 'Village'; if(maxCost>=4 && getPile('Smithy').count>0) return 'Smithy'; if(maxCost>=3 && getPile('Silver').count>0) return 'Silver'; if(maxCost>=3 && getPile('Merchant').count>0) return 'Merchant'; const eligible = SUPPLY.filter(p=> p.count>0 && CARD_DEFS[p.key].cost<=maxCost); return eligible.length? eligible[Math.floor(Math.random()*eligible.length)].key : null; }
function aiChooseBuyStrong(debug){ const coins = game.aiCoins; const phase = phaseBand(); const piles = { Province:getPile('Province'), Duchy:getPile('Duchy'), Estate:getPile('Estate'), Gold:getPile('Gold'), Silver:getPile('Silver'), Smithy:getPile('Smithy'), Village:getPile('Village'), Market:getPile('Market'), Laboratory:getPile('Laboratory'), Festival:getPile('Festival'), Woodcutter:getPile('Woodcutter'), Merchant:getPile('Merchant'), Workshop:getPile('Workshop') }; const can = n=> n && n.count>0; let pick=null; if(coins>=8 && can(piles.Province)) pick='Province'; else if(coins>=6 && can(piles.Gold)) pick='Gold'; else if(coins>=5){ const prefs = ['Festival','Market','Laboratory','Smithy']; pick = prefs.find(n=> can(piles[n])) || null; } else if(coins>=4 && can(piles.Smithy)) pick='Smithy'; else if(coins>=3){ const prefs3 = ['Silver','Village','Merchant','Workshop','Woodcutter']; pick = prefs3.find(n=> can(piles[n])) || null; } if(phase==='late' && !pick){ if(coins>=5 && can(piles.Duchy)) pick='Duchy'; else if(coins>=2 && can(piles.Estate)) pick='Estate'; } if(debug) debug.push(`Buy choice: ${pick??'nothing'} (coins ${coins})`); return pick; }
function aiChooseBuyWeak(debug){ const coins = game.aiCoins; const provLeft = getPile('Province')?.count ?? 12; let pick=null; if(coins>=6) pick='Gold'; else if(coins>=5) pick=['Festival','Market','Laboratory'][Math.floor(Math.random()*3)]; else if(coins>=4) pick='Smithy'; else if(coins>=3) pick=['Silver','Merchant','Village','Workshop','Woodcutter'][Math.floor(Math.random()*5)]; if(!pick && provLeft<=3){ if(coins>=8) pick='Province'; else if(coins>=5) pick='Duchy'; else if(coins>=2) pick='Estate'; } if(!pick && coins===0 && Math.random()<0.3 && getPile('Copper').count>0) pick='Copper'; if(debug) debug.push(`[Weak] Buy choice: ${pick??'nothing'} (coins ${coins})`); return pick; }
function aiMultiBuy(debug, mode){ let boughtList=[]; let safety=5; while(game.aiBuys>0 && safety-->0){ const choice = (mode==='weak') ? aiChooseBuyWeak(debug) : aiChooseBuyStrong(debug); if(!choice) break; const pile = getPile(choice); const def = CARD_DEFS[choice]; if(!pile || pile.count<=0 || game.aiCoins < def.cost) break; pile.count--; game.ai.discard.push(instance(choice)); game.aiCoins -= def.cost; game.aiBuys -= 1; boughtList.push(choice); checkEndgameFlags(); } return boughtList; }
function aiTurn(){ if(game.gameOver) return; const debug = game.debugAI ? [`AI turn start - hand: ${groupByName(game.ai.hand)}`] : null; game.aiActions=1; game.aiBuys=1; game.aiCoins=0; game.merchantPending.ai = 0; const mode = game.aiMode; if(mode==='weak'){ aiPlayBestActionWeak(debug); } else { let playedSomething=true; let guard=10; while(playedSomething && guard-->0){ playedSomething = aiPlayBestActionStrong(debug); } } const gained = aiAutoPlayTreasures(debug); const boughtList = aiMultiBuy(debug, mode); const bought = boughtList.length? boughtList.join(', '): 'nothing'; document.getElementById('ai-status').textContent = `AI (${mode}) played ${gained} coin${gained===1?'':'s'} and bought ${bought}.`; if(game.debugAI){ if(boughtList.length){ debug.push(`Bought: ${boughtList.join(', ')}`); } debug.push(`End coins: ${game.aiCoins}, End buys: ${game.aiBuys}`); writeAIDebug(debug); } else { writeAIDebug([]); } cleanupAndDraw(game.ai); if(endIfNeeded()) return; game.turn='player'; game.merchantPending.player = 0; game.turnNum += 1; addLog(`Your turn [${game.turnNum}].`); Chat.say?.('aiTurn', {bought:boughtList, coins:gained}); render(); }
