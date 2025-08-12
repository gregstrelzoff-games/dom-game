// ------------------- Card Definitions -------------------
const CARD_DEFS = {
  Smithy:    { name:'Smithy',    cost:4, type:'Action',   desc:'+3 cards',
  Village:   { name:'Village',   cost:3, type:'Action',   desc:'+1 card, +2 actions',
  Market:    { name:'Market',    cost:5, type:'Action',   desc:'+1 card, +1 action, +1 buy, +1 coin',
  Laboratory:{ name:'Laboratory',cost:5, type:'Action',   desc:'+2 cards, +1 action',
  Merchant:  { name:'Merchant',  cost:3, type:'Action',   desc:'Draw 1, +1 Action. The first time you play a Silver this turn, +$1.',
  { key:'Smithy',   count:10 },
  { key:'Village',  count:10 },
  { key:'Laboratory',count:10 },
  { key:'Merchant', count:10 },
function cardTip(def){ const meta = []; if(def.type==='Treasure') meta.push(`+${def.value} coins`); if(def.type==='Victory') meta.push(`${def.points} VP`); if(def.type==='Action') meta.push(def.desc||'Action'); return `<div class="tTitle">${def.name}</div><div class="tMeta">Type: ${def.type} · Cost: ${def.cost}</div><div style=\"margin-top:4px\">${meta.join(' · ')}</div>`; }
function instance(name){ return { ...CARD_DEFS[name] }; }
function drawCards(actor,n){ for(let i=0;i<n;i++) drawOne(actor); }
function cardIcon(name){ switch(name){ case 'Copper': return '🟠'; case 'Silver': return '⚪️'; case 'Gold': return '🟡'; case 'Estate': return '🏠'; case 'Duchy': return '🏯'; case 'Province': return '🏰'; case 'Smithy': return '⚒️'; case 'Village': return '🏘️'; case 'Market': return '🛒'; case 'Laboratory': return '🧪'; case 'Festival': return '🎪'; case 'Woodcutter': return '🪓'; case 'Merchant': return '🪙'; case 'Workshop': return '🧰'; default: return '🃏'; } }
function groupByName(cards){ const m = new Map(); cards.forEach(c=> m.set(c.name, (m.get(c.name)||0)+1)); return [...m.entries()].sort((a,b)=> a[0].localeCompare(b[0])).map(([n,k])=> `${n}×${k}`).join(', '); }
  document.getElementById('choiceTitle').textContent = 'Gain a card';
  document.getElementById('choiceDetail').textContent = `Pick a card costing up to ${maxCost}.`;
  const eligible = SUPPLY.filter(p=> p.count>0 && CARD_DEFS[p.key].cost<=maxCost);
  eligible.sort((a,b)=> CARD_DEFS[b.key].cost - CARD_DEFS[a.key].cost || a.key.localeCompare(b.key));
    const def = CARD_DEFS[pile.key];
        <div class=\"icon\">${cardIcon(def.name)}</div>
  const groups = [ { title:'Coins', type:'Treasure' }, { title:'Victory Cards', type:'Victory' }, { title:'Action Cards', type:'Action' } ];
    SUPPLY.filter(p=>CARD_DEFS[p.key].type===g.type)
      .sort((a,b)=>{ const da=CARD_DEFS[a.key], db=CARD_DEFS[b.key]; const va=sortMetric(da,g.type), vb=sortMetric(db,g.type); return vb-va || a.key.localeCompare(b.key); })
        const def = CARD_DEFS[pile.key];
            <div class=\"icon\">${cardIcon(def.name)}</div>
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<div class=\"title\">${cardIcon(c.name)} ${c.name}</div><div class=\"type\">${c.type}</div>`;
    const def = CARD_DEFS[c.name];