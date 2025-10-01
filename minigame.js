const overlay = document.getElementById('minigameOverlay');
const clickZone = document.getElementById('clickZone');
const progressBarInner = document.getElementById('progressBarInner');
const cancelBtn = document.getElementById('cancelGameBtn');

let progress = 0;
let active = false;
let decayRate = 0.12;
let gainPerClick = 0.05;
let lastTime = 0;
let successCallback = () => {};

export function initMinigame({ onSuccess }){
  successCallback = onSuccess;
  document.addEventListener('minigame:start', startGame);
  clickZone.addEventListener('click', handleClick);
  cancelBtn.addEventListener('click', endGame);
  requestAnimationFrame(loop);
}

function startGame(){
  progress = 0;
  active = true;
  overlay.classList.remove('hidden');
  lastTime = performance.now();
}

function endGame(){
  active = false;
  overlay.classList.add('hidden');
}

function handleClick(){
  if(!active) return;
  progress += gainPerClick * (0.8 + Math.random()*0.4);
  if(progress >= 1){
    progress = 1;
    successCallback();
    setTimeout(() => { endGame(); }, 350);
  }
  updateUI();
}

function loop(ts){
  requestAnimationFrame(loop);
  if(!active){ return; }
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;
  progress -= decayRate * dt;
  if(progress < 0) progress = 0;
  updateUI();
}

function updateUI(){
  progressBarInner.style.width = (progress*100).toFixed(1) + '%';
  if(progress === 1){
    progressBarInner.style.background = 'linear-gradient(90deg,#6dff9a,#b1ffd5)';
  } else {
    progressBarInner.style.background = 'linear-gradient(90deg,#ffcc66,#ffe7b1)';
  }
}
