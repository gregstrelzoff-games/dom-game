function showTip(html, x, y){ tip.innerHTML = html; tip.style.display='block';

function hideTip(){ tip.style.display='none'; }

function cardTip(def){

function isChoiceOpen(){ return document.getElementById('choiceOverlay').classList.contains('show'); }

function closeChoiceOverlay(){

function syncLockFromOverlay(){ game.interactionLock = isChoiceOpen(); }

function playerCountsHTML(){

function openGainChoice(maxCost, actor, source){
  game.interactionLock = true; updateUndoUI();

function render(){
  syncLockFromOverlay();
  document.getElementById('actions').textContent = game.actions;
  document.getElementById('buys').textContent    = game.buys;
  document.getElementById('coins').textContent   = game.coins;
  document.getElementById('phase').textContent   = game.phase.charAt(0).toUpperCase()+game.phase.slice(1);