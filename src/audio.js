// ------------------- Sound Engine -------------------
const Sound = {
  ensure(){ if(this.ctx) return; try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted?0:this.vol; this.master.connect(this.ctx.destination); }catch(e){ console.warn('Audio init failed', e); } },
Sound.load();
  // Sound UI
  v.value = Math.round(Sound.vol*100); m.checked = Sound.muted;
  v.oninput = (e)=>{ Sound.setVolume((+e.target.value)/100); };
  m.onchange = (e)=>{ Sound.setMuted(!!e.target.checked); };