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
               effect: (g,actor)=>{ if(actor===g.player){ openGainChoice(4, g.player, 'Workshop'); } else {

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

// ------------------- Log & Tooltip -------------------

function drawOne(actor){ if(actor.deck.length===0){ actor.deck.push(...actor.discard); actor.discard.length=0; shuffle(actor.deck); if(actor===game.player){ addLog('Your deck was shuffled.', 'mint'); Chat.say('shuffle'); } Sound.play('shuffle'); } if(actor.deck.length>0){ actor.hand.push(actor.deck.pop()); if(actor===game.player) Sound.play('draw'); }
  if(actor===game.player && game.turn==='player' && game.undo){ game.undoForbidden='draw'; } }

function drawCards(actor,n){ for(

function computeScores(){

function getPile(name){ return SUPPLY.find(p=>p.key===name); }

function checkEndgameFlags(){

function showWinner(){

function play(index){ if(game.interactionLock || game.turn!=='player' || game.gameOver) return;

function autoPlayTreasures(){ if(game.turn!=='player' || game.phase==='buy' || game.gameOver) return; if(game.phase==='action') game.phase='treasure';

function buy(name){ if(game.interactionLock || game.turn!=='player' || game.phase!=='buy' || game.gameOver) return;

function endTurn(){ if(game.turn!=='player' || game.gameOver) return; game.undo = null; updateUndoUI(); cleanupAndDraw(game.player); lastCountsHTML = playerCountsHTML();

function aiPlayBestActionStrong(debug){ if(game.aiActions<=0) return false;

function aiPlayBestActionWeak(debug){ if(game.aiActions<=0) return false;

function aiChooseBuyStrong(debug){

function aiChooseBuyWeak(debug){

function aiMultiBuy(debug, mode){

function aiTurn(){ if(game.gameOver) return;