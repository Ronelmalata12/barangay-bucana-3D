/** Self-contained, gesture-unlocked Web Audio siren; no audio downloads required. */
export function createAlarmAudio({button}) {
  let context, output, analyser, voices;
  let active=false, muted=false, disposed=false, unavailable=false;
  const AudioContext=window.AudioContext||window.webkitAudioContext;

  function publish() {
    const blocked=active&&!muted&&context?.state!=='running';
    button.setAttribute('aria-pressed',String(muted));
    button.setAttribute('aria-label',unavailable?'Alarm audio unavailable':muted?'Unmute alarm sound':blocked?'Enable alarm sound':'Mute alarm sound');
    button.title=button.getAttribute('aria-label');
    button.dataset.state=unavailable?'unavailable':muted?'muted':blocked?'blocked':'enabled';
    button.querySelector('.sound-slash').style.display=muted||unavailable?'':'none';
  }
  function stop() {
    if(!voices)return;
    const current=voices;voices=null;
    const now=context.currentTime;
    current.gain.gain.cancelScheduledValues(now);
    current.gain.gain.setTargetAtTime(0,now,0.015);
    current.tone.stop(now+0.08);current.sweep.stop(now+0.08);
    current.tone.onended=()=>{current.tone.disconnect();current.sweep.disconnect();current.depth.disconnect();current.gain.disconnect();};
  }
  function sync() {
    if(disposed)return;
    if(!active||muted||document.hidden||context?.state!=='running')stop();
    else if(!voices) {
      const tone=context.createOscillator(),sweep=context.createOscillator();
      const depth=context.createGain(),gain=context.createGain();
      tone.type='triangle';tone.frequency.value=720;
      sweep.type='sine';sweep.frequency.value=1.2;depth.gain.value=190;
      sweep.connect(depth);depth.connect(tone.frequency);
      tone.connect(gain);gain.connect(output);
      gain.gain.setValueAtTime(0,context.currentTime);
      gain.gain.linearRampToValueAtTime(0.09,context.currentTime+0.12);
      voices={tone,sweep,depth,gain};tone.start();sweep.start();
    }
    publish();
  }
  function unlock() {
    if(disposed||unavailable)return;
    if(!AudioContext){unavailable=true;publish();return;}
    try {
      if(!context) {
        context=new AudioContext();
        output=context.createGain();output.gain.value=0.65;
        analyser=context.createAnalyser();analyser.fftSize=2048;
        output.connect(analyser);analyser.connect(context.destination);
        context.addEventListener('statechange',sync);
      }
      if(context.state==='suspended')context.resume().then(sync).catch(()=>publish());
      else sync();
    } catch {unavailable=true;stop();publish();}
  }
  const gesture=event=>{if(event.isTrusted)unlock();};
  const toggle=()=>{muted=!muted;unlock();sync();};
  document.addEventListener('pointerdown',gesture,true);
  document.addEventListener('keydown',gesture,true);
  document.addEventListener('visibilitychange',sync);
  button.addEventListener('click',toggle);
  publish();
  return {
    setActive(value){active=Boolean(value);sync();},
    get active(){return active;},get muted(){return muted;},
    get playing(){return Boolean(voices);},get context(){return context;},get analyser(){return analyser;},
    dispose(){
      stop();disposed=true;
      document.removeEventListener('pointerdown',gesture,true);
      document.removeEventListener('keydown',gesture,true);
      document.removeEventListener('visibilitychange',sync);
      button.removeEventListener('click',toggle);
      context?.removeEventListener('statechange',sync);
      context?.close().catch(()=>{});
    },
  };
}
