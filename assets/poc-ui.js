/* build: v9.3.19 | file: assets/poc-ui.js | date: 2025-08-14 */
// Robust hover tooltips + empty pile overlay + default AI debug ON
(function(){
  function $(id){ return document.getElementById(id); }
  function tipEl(){
    var t = $('tooltip');
    if(!t){ t = document.createElement('div'); t.id='tooltip'; document.body.appendChild(t); }
    t.style.pointerEvents = 'none';
    return t;
  }
  function cardKeyFrom(el){
    if(!el) return null;
    var key = (el.getAttribute && (el.getAttribute('data-card')||el.getAttribute('data-key')||el.getAttribute('data-name'))) || null;
    if (!key && el.dataset) key = el.dataset.card || el.dataset.key || el.dataset.name;
    if (!key) { var txt = (el.textContent||'').trim(); if (txt) key = txt.split(/\s+/)[0]; }
    return key || null;
  }
  function defFor(key){ try{ return (window.CARD_DEFS && window.CARD_DEFS[key]) || null; }catch(e){ return null; } }
  function renderTipFor(el, e){
    var k = cardKeyFrom(el); if(!k) return hide();
    var def = defFor(k) || {};
    var t = tipEl(); if(!t) return;
    var name = def.name || k;
    var text = def.text || def.desc || '';
    var cost = (def.cost!=null) ? ('Cost: ' + def.cost) : '';
    t.innerHTML = '<div style="font-weight:800;margin-bottom:2px">'+name+'</div>' +
                  (text?'<div style="opacity:.9;margin-bottom:2px">'+text+'</div>':'') +
                  (cost?'<div style="opacity:.8">'+cost+'</div>':'');
    t.style.display='block';
    t.style.position='absolute';
    t.style.left = (e.pageX + 12) + 'px';
    t.style.top  = (e.pageY + 12) + 'px';
  }
  function hide(){ var t = $('tooltip'); if(t) t.style.display='none'; }
  function onOver(e){ var el = e.target.closest ? e.target.closest('.card,[data-card]') : null; if (!el) return hide(); renderTipFor(el, e); }
  function onMove(e){ var t = $('tooltip'); if(!t || t.style.display!=='block') return; t.style.left=(e.pageX+12)+'px'; t.style.top=(e.pageY+12)+'px'; }

  // Empty pile watcher
  function markEmptyPiles(){
    var root = $('supply'); if(!root) return;
    var piles = root.querySelectorAll('.pile');
    piles.forEach(function(p){
      var cntEl = p.querySelector('.count, .qty, [data-count], [data-qty]');
      var val = null;
      if (cntEl && cntEl.getAttribute) val = cntEl.getAttribute('data-count') || cntEl.getAttribute('data-qty');
      if (val==null && cntEl) { var m = (cntEl.textContent||'').match(/\d+/); if(m) val = m[0]; }
      if (val==null && p.hasAttribute('data-count')) val = p.getAttribute('data-count');
      if (String(val) === '0') p.classList.add('empty'); else p.classList.remove('empty');
    });
  }
  function installEmptyWatcher(){
    var root = $('supply'); if(!root) return;
    var mo = new MutationObserver(function(){ markEmptyPiles(); });
    mo.observe(root, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['data-count','data-qty'] });
    markEmptyPiles();
  }
  function ensureAIDebugOn(){
    var cb = $('debugAICheck'); if (cb) cb.checked = true;
    var dbg = $('ai-debug'); if (dbg) dbg.style.display = 'block';
  }
  function install(){
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseout', hide, true);
    installEmptyWatcher();
    ensureAIDebugOn();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
