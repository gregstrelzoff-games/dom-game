// v10.0.0: minimal hover tooltip restore
(function(){
  var tip;
  function tipEl(){ if(!tip) tip = document.getElementById('tooltip'); return tip; }
  function cardKeyFrom(el){
    if(!el) return null;
    var key = el.getAttribute && (el.getAttribute('data-card') || el.getAttribute('data-key') || el.getAttribute('data-name'));
    if (!key && el.dataset) key = el.dataset.card || el.dataset.key || el.dataset.name;
    if (!key) key = (el.textContent || '').trim().split(/\s+/)[0];
    return key || null;
  }
  function defFor(key){
    try{ return (window.CARD_DEFS && window.CARD_DEFS[key]) || null; }catch(e){ return null; }
  }
  function show(e){
    var el = e.target.closest ? e.target.closest('[data-card], .card') : null;
    if (!el) return;
    var key = cardKeyFrom(el); if(!key) return;
    var def = defFor(key) || {};
    var t = tipEl(); if (!t) return;
    var name = def.name || key;
    var text = def.text || def.desc || '';
    var cost = (def.cost!=null) ? ('Cost: ' + def.cost) : '';
    t.innerHTML = '<div style="font-weight:700;margin-bottom:2px">'+name+'</div>' +
                  (text?'<div style="opacity:.9;margin-bottom:2px">'+text+'</div>':'') +
                  (cost?'<div style="opacity:.8">'+cost+'</div>':'');
    t.style.display = 'block';
    t.style.position = 'absolute';
    t.style.left = (e.pageX + 12) + 'px';
    t.style.top = (e.pageY + 12) + 'px';
    t.style.pointerEvents = 'none';
  }
  function hide(){ var t = tipEl(); if(t) t.style.display='none'; }
  function move(e){ var t = tipEl(); if(t && t.style.display==='block'){ t.style.left=(e.pageX+12)+'px'; t.style.top=(e.pageY+12)+'px'; } }
  function install(){
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseover', show);
    document.addEventListener('mouseout', hide);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
