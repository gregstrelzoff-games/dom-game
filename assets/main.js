/* build: v9.3.27 | file: assets/main.js | date: 2025-08-14 */
var LOG_SILENT=false, logs=[], LOG_MAX=10;
// BUILD bootstrap
var BUILD=(typeof window!=='undefined' && window.BUILD)?window.BUILD:{ num:'v9.3.27', date:new Date().toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'})};
if(typeof window!=='undefined') window.BUILD=BUILD;
try{console.log("Dominion POC " + BUILD.num + " — index/base.css/poc-game/poc-ui/main all updated");}catch(_){}

// ensure #build exists
(function(){var g=document.getElementById.bind(document);document.getElementById=function(id){if(id==='build'){var el=g('build');if(!el){el=document.createElement('div');el.id='build';el.className='build';(document.body||document.documentElement||document.head).appendChild(el);}return el;}return g(id);};})();

function addLog(msg){ if(LOG_SILENT) return; try{msg=String(msg);}catch(e){msg='[object]';} if(!Array.isArray(logs)) logs=[]; logs.push(msg); if(typeof LOG_MAX==='number' && logs.length>LOG_MAX) logs=logs.slice(-LOG_MAX); var el=document.getElementById('log'); if(el) el.textContent=logs.join('\n'); }
function clearLog(){ logs=[]; var el=document.getElementById('log'); if(el) el.textContent=''; }
(function(){ 
  function clamp(){ var el=document.getElementById('log'); if(!el) return; var lines=(el.textContent||'').split(/\r?\n/); if(lines.length>LOG_MAX) el.textContent=lines.slice(-LOG_MAX).join('\n'); } 
  function install(){ var el=document.getElementById('log'); if(!el) return; var mo=new MutationObserver(clamp); mo.observe(el,{childList:true,subtree:true,characterData:true}); clamp(); } 
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install(); 
})();

// Safe tip fallbacks if UI hasn't attached yet
if(!window.hideTip) window.hideTip = function(){ var t=document.getElementById('tooltip'); if(t) t.style.display='none'; };
if(!window.showTip) window.showTip = function(){};

// Hook init after DOM ready and after UI exports are available
function init(){ try{ if(typeof render==='function') render(); }catch(e){ addLog('Init error: '+e.message); } }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
