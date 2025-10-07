// ========================================================================
// === Dominion POC - poc-game.js (v10.0.136) ===========================
// ========================================================================
// This file now only contains card, supply, and game state definitions.
// Patched: Workshop effect updated to call the new AI choice logic in
// main.js, preventing a hang and allowing the AI to use the card.

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
               effect: (g,actor)=>{
                 if (actor === g.player) {
                     // If the actor is the human player, open the UI overlay.
                     openGainChoice(4, actor, 'Workshop');
                 } else {
                     // If the actor is the AI, call the new AI-specific choice function from main.js.
                     const choice = aiGainChoiceUpTo(4);
                     if (choice) {
                         const pile = getPile(choice);
                         if (pile && pile.count > 0) {
                             pile.count--;
                             actor.discard.push(instance(choice));
                             // AI turn summary will report what it did.
                         }
                     }
                 }
               }
             },
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
  debugAI:true,
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