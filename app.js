'use strict';

// All music is synthesized here; no recordings or third-party songs are used.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const dialog = document.querySelector('#surprise');
const scrollArea = document.querySelector('.dialog-scroll');
let activeEnvelope = null;
let revealTimer = null;
let audioContext = null;
let musicBus = null;
let musicTimer = null;
let musicPlaying = false;
let musicEpoch = 0;
let musicRequested = false;

const symbols = [
  '<path d="M25 16Q40 8 55 16V41Q40 33 25 41ZM55 16Q70 8 85 16V41Q70 33 55 41ZM55 16V41M32 22L46 20M32 28L46 26M64 25Q70 16 76 25Q76 29 70 33Q64 29 64 25Z"/>',
  '<path d="M55 44V22M55 35Q36 22 35 34Q42 43 55 38M55 30Q75 17 75 28Q68 37 55 35M55 23C34 22 37 8 47 10C50-1 64-1 66 10C79 8 79 24 55 23ZM47 10Q55 27 66 10M49 15Q55 5 62 15"/>',
  '<path d="M29 11H79V43H29ZM35 11V5H84V36M35 36L46 25L55 32L65 21L75 36M59 18A4 4 0 1 0 59 10A4 4 0 1 0 59 18ZM76 35C80 26 92 31 87 39L76 49L65 39C60 31 72 26 76 35Z"/>'
];
const bow = `<svg class="bow" viewBox="0 0 260 125" aria-hidden="true"><defs><linearGradient id="satin" x2=".2" y2="1"><stop stop-color="#fbd3d5"/><stop offset=".3" stop-color="#e58c9c"/><stop offset=".55" stop-color="#f8bdc4"/><stop offset=".8" stop-color="#d77e91"/><stop offset="1" stop-color="#f3aab7"/></linearGradient><linearGradient id="tail" x2="1" y2=".3"><stop stop-color="#f4b1bc"/><stop offset=".4" stop-color="#e08c9e"/><stop offset=".66" stop-color="#ffced2"/><stop offset="1" stop-color="#df8b9b"/></linearGradient></defs><path d="M124 30C98 57 63 80 45 108L75 102L88 119Q113 73 137 42Z" fill="url(#tail)" stroke="#d995a1" stroke-width=".7"/><path d="M136 30C164 56 190 77 218 108L186 102L172 119Q150 71 123 42Z" fill="url(#tail)" stroke="#d995a1" stroke-width=".7"/><path d="M130 29C93 9 40-6 29 5C20 18 22 45 29 52C46 65 103 41 130 38Z" fill="url(#satin)" stroke="#f7c2c9"/><path d="M130 29C167 9 220-6 231 5C240 18 238 45 231 52C214 65 157 41 130 38Z" fill="url(#satin)" stroke="#f7c2c9"/><path d="M29 9C63 7 99 22 123 30M231 9C197 7 161 22 137 30" fill="none" stroke="#ffe2e3" opacity=".65"/><path d="M28 48Q64 57 123 35M232 48Q196 57 137 35" fill="none" stroke="#b9657b" opacity=".45"/><path d="M119 20Q130 15 141 20L142 45Q130 51 118 45Z" fill="url(#satin)"/></svg>`;
const seal = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="gold" x2=".6" y2="1"><stop stop-color="#fff3c4"/><stop offset=".25" stop-color="#dbac64"/><stop offset=".55" stop-color="#fff0b4"/><stop offset="1" stop-color="#a97739"/></linearGradient><radialGradient id="gem" cx=".35" cy=".2"><stop stop-color="#ffe0de"/><stop offset=".45" stop-color="#f4a8b3"/><stop offset="1" stop-color="#ce7189"/></radialGradient></defs><path d="M32 58C22 51 3 37 3 20C3 4 24 1 32 14C41 1 61 4 61 20C61 37 42 51 32 58Z" fill="url(#gold)" stroke="#b47f47"/><path d="M32 52C24 46 9 34 9 21C9 9 25 7 32 21C40 7 55 9 55 21C55 34 40 46 32 52Z" fill="url(#gem)" stroke="#fff0c7" stroke-width="1.6"/><path d="M14 21Q16 12 24 16" fill="none" stroke="#ffe5e1" stroke-width="2.3" stroke-linecap="round"/></svg>`;
const titles = ['Кўнглимдаги сўзлар','Сиз учун бир гул','Юрагим — сизники'];
const container = document.querySelector('.envelopes');
titles.forEach((title,index) => {
  const item = document.createElement('section');
  item.className = `envelope-item ${index===1?'pink':''}`;
  item.innerHTML = `<button class="envelope" data-letter="${index}" aria-label="${index+1}-конвертни очиш: ${title}" aria-haspopup="dialog" aria-expanded="false"><span class="env-body"></span><span class="env-slip" aria-hidden="true">♡</span><span class="env-folds"></span><span class="env-bottom"></span><span class="env-flap"><span class="flap-shape"></span><span class="env-emblem"><svg viewBox="0 0 110 55" aria-hidden="true">${symbols[index]}</svg></span></span><span class="env-ribbon"><span class="ribbon-band"></span>${bow}<span class="seal">${seal}</span></span></button><p class="env-caption"><span class="number">0${index+1}</span><span class="dot">✦</span><span>${title}</span></p>`;
  item.querySelector('button').addEventListener('click',()=>openLetter(index,item));
  container.append(item);
});

// Sparse motion stays at the margins so the letters remain easy to read.
for(let i=0;i<12;i++){
  const mote=document.createElement('span');
  mote.className=`drift ${i%3?'petal':'heart'}`;
  mote.textContent=i%3?'':'♡';
  mote.style.cssText=`--left:${i%2?89+(i%4)*2:(i%4)*3}%;--duration:${16+i%5*3}s;--delay:${-i*3}s;--size:${12+i%4*3}px`;
  document.querySelector('.ambient').append(mote);
}

function roseMarkup(){
  const petals=[[-42,-12,-38,.9],[-29,-32,25,.85],[34,-19,42,.9],[0,-43,0,.95],[-46,15,-70,1.15],[45,14,70,1.15],[-27,35,-35,1.05],[27,35,35,1.05],[0,40,0,1.1],[-19,-11,-35,.7],[20,-12,35,.7],[0,5,0,.65],[-10,-9,-30,.43],[10,-9,30,.43],[0,-9,0,.3]];
  return `<svg class="rose-svg" viewBox="0 0 340 325" aria-hidden="true"><defs><radialGradient id="halo"><stop stop-color="#f8cbd6" stop-opacity=".75"/><stop offset="1" stop-color="#fff5ef" stop-opacity="0"/></radialGradient><linearGradient id="stem" x2="1" y2="0"><stop stop-color="#42704e"/><stop offset=".5" stop-color="#8fa77a"/><stop offset="1" stop-color="#4a7250"/></linearGradient><linearGradient id="leaf" x2="1" y2="1"><stop stop-color="#a8ba87"/><stop offset=".45" stop-color="#739561"/><stop offset="1" stop-color="#456f50"/></linearGradient><radialGradient id="rosePetal" cx=".48" cy=".05" r=".95"><stop stop-color="#fff1e8"/><stop offset=".18" stop-color="#ffc4ce"/><stop offset=".55" stop-color="#ef94ad"/><stop offset=".85" stop-color="#d66a8e"/><stop offset="1" stop-color="#ad4c73"/></radialGradient><radialGradient id="roseHeart"><stop stop-color="#b84972"/><stop offset="1" stop-color="#ed91aa"/></radialGradient></defs><ellipse class="rose-halo" cx="170" cy="125" rx="150" ry="130" fill="url(#halo)"/><path class="stem" d="M166 299Q190 231 170 118" stroke="url(#stem)" stroke-width="6" fill="none" stroke-linecap="round"/><g class="rose-leaf"><path d="M177 232Q110 236 97 181Q154 168 177 232" fill="url(#leaf)"/><path d="M104 186L178 232M128 207L128 185M148 220L148 196" stroke="#c1ce9d" fill="none" stroke-width=".8"/></g><g class="rose-leaf right"><path d="M181 209Q234 205 240 154Q188 156 181 209" fill="url(#leaf)"/><path d="M235 160L181 209M219 178L234 180M203 192L220 194" stroke="#c1ce9d" fill="none" stroke-width=".8"/></g><g class="flower"><path d="M170 142L145 129L157 144L170 154L186 140L196 129Z" fill="#66855a"/><ellipse cx="170" cy="110" rx="26" ry="35" fill="url(#roseHeart)"/>${petals.map(([x,y,rotate,scale],i)=>`<g class="rose-petal" style="--bloom-delay:${.45+i*.09}s"><path d="M0 29C-58 6-42-39-12-31C0-39 32-37 41-16C52 8 19 25 0 29Z" transform="translate(${170+x} ${105+y}) rotate(${rotate}) scale(${scale})" fill="url(#rosePetal)" stroke="#ffd5d9" stroke-width=".65"/></g>`).join('')}<path d="M164 104Q153 90 171 91Q187 94 175 105Q164 112 164 100Q169 95 174 99" fill="none" stroke="#fbd1d7" stroke-width="2"/></g>${[[55,100],[275,85],[74,187],[262,207],[115,45],[225,38],[290,147],[54,241]].map(([x,y],i)=>`<path class="rose-sparkle" style="--sparkle-delay:${i*.4}s" d="M${x} ${y-5}Q${x} ${y} ${x+5} ${y}Q${x} ${y} ${x} ${y+5}Q${x} ${y} ${x-5} ${y}Q${x} ${y} ${x} ${y-5}"/>`).join('')}<path class="falling-petal" d="M207 116Q231 99 232 120Q220 139 207 116" fill="url(#rosePetal)"/><path class="falling-petal second" d="M128 100Q107 89 109 111Q123 125 128 100" fill="url(#rosePetal)"/></svg>`;
}

function openLetter(index,item){
  if(activeEnvelope || dialog.open) return;
  activeEnvelope=item;
  const button=item.querySelector('button');
  button.classList.add('opening');
  button.setAttribute('aria-expanded','true');
  document.querySelector('#announcement').textContent='Мактуб очилмоқда…';
  const template=document.querySelector(['#poem-template','#rose-template','#photo-template'][index]);
  scrollArea.replaceChildren(template.content.cloneNode(true));
  if(index===0){ let line=0; scrollArea.querySelectorAll('.poem p').forEach(p=>{p.innerHTML=p.innerHTML.split('<br>').map(text=>`<span class="verse-line" style="--line-delay:${line++*.14}s">${text}</span>`).join('');}); }
  if(index===1) scrollArea.querySelector('.rose-garden').innerHTML=roseMarkup();
  if(index===2){
    const musicButton=scrollArea.querySelector('#music-toggle');
    musicButton.addEventListener('click',()=> musicPlaying||musicRequested ? stopMusic() : startMusic());
    // Resume in the original tap, before any timers, for iOS and in-app browsers.
    startMusic(reducedMotion.matches?0:1.4);
  }
  revealTimer=setTimeout(()=>{
    revealTimer=null;
    dialog.showModal();
    document.body.style.overflow='hidden';
    scrollArea.scrollTop=0;
    item.classList.add('seen');
    document.querySelector('#announcement').textContent='Мактуб очилди';
    document.querySelector('.close').focus({preventScroll:true});
  },reducedMotion.matches?20:1450);
}
function closeLetter(){
  clearTimeout(revealTimer);revealTimer=null;
  stopMusic();
  if(dialog.open)dialog.close();
  document.body.style.overflow='';
  if(activeEnvelope){
    const button=activeEnvelope.querySelector('button');
    button.classList.remove('opening');
    button.setAttribute('aria-expanded','false');
    button.focus({preventScroll:true});
    activeEnvelope=null;
  }
  scrollArea.replaceChildren();
}
document.querySelector('.close').addEventListener('click',closeLetter);
dialog.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeLetter();if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeLetter();}});
dialog.addEventListener('cancel',e=>{e.preventDefault();closeLetter();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeEnvelope&&!dialog.open)closeLetter();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();});
window.addEventListener('pagehide',stopMusic);

function updateMusicButton(){
  const button=document.querySelector('#music-toggle');
  if(!button)return;
  button.setAttribute('aria-pressed',String(musicPlaying));
  button.querySelector('.music-label').textContent=musicPlaying?'Мусиқани ўчириш':'Мусиқани ёқиш';
}
async function startMusic(delay=0){
  if(musicPlaying||musicRequested)return;
  const epoch=++musicEpoch;musicRequested=true;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw new Error('Audio is unavailable');
    audioContext ||= new Audio();
    await audioContext.resume();
    if(epoch!==musicEpoch)return;
    if(audioContext.state!=='running')throw new Error('Audio did not start');
    musicBus=audioContext.createGain();musicBus.gain.value=.2;musicBus.connect(audioContext.destination);
    musicPlaying=true;musicRequested=false;updateMusicButton();
    let next=audioContext.currentTime+delay+.08,beat=0;
    const melody=[76,79,83,79,74,78,81,78,72,76,79,76,74,78,83,81,79,76,74,71,72,76,79,83,81,78,74,78,76,74,71,76];
    const chords=[[48,55,60,64],[50,57,62,66],[45,52,57,60],[43,50,55,59]];
    const note=(midi,time,length,level)=>{
      const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
      oscillator.type='sine';oscillator.frequency.value=440*2**((midi-69)/12);
      gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level,time+.025);gain.gain.exponentialRampToValueAtTime(.0001,time+length);
      oscillator.connect(gain);gain.connect(musicBus);oscillator.start(time);oscillator.stop(time+length+.05);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    };
    const schedule=()=>{
      if(!musicPlaying)return;
      while(next<audioContext.currentTime+.25){
        const chord=chords[Math.floor(beat/8)%4];
        note(chord[beat%4]+12,next,2,.2);
        if(beat%2===0)note(melody[(beat/2)%melody.length],next,2.8,.29);
        if(beat%8===0)note(chord[0],next,4,.16);
        next+=.43;beat++;
      }
    };
    schedule();musicTimer=setInterval(schedule,100);
  }catch{
    musicPlaying=false;musicRequested=false;updateMusicButton();
    const caption=document.querySelector('.music-caption');if(caption)caption.textContent='Куйни эшитиш учун тугмани босинг';
  }
}
function stopMusic(){
  ++musicEpoch;musicRequested=false;musicPlaying=false;
  clearInterval(musicTimer);musicTimer=null;
  if(musicBus){musicBus.disconnect();musicBus=null;}
  updateMusicButton();
}
