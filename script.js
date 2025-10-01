import { initSand, prepareEngraving, progressiveCarveStep, decayCarving } from './sand.js';

const fileInput = document.getElementById('imageInput');
const startGameBtn = document.getElementById('startGameBtn');
const revealProgressEl = document.getElementById('revealProgress');
const carveBoxEl = document.getElementById('carveBox');
const fileNameLabel = document.getElementById('fileNameLabel');
const saveImageBtn = document.getElementById('saveImageBtn');
let uploadedImage = null;
let carvingActive = false;
let totalNeededClicks = 96;
let clicksDone = 0;
let currentFraction = 0;
let decayLastTs = performance.now();
let hasCompletedOneCarve = false;

const floatWords = ["swallow","glup","gulp","scritch"];

function hideSaveButton(){
  saveImageBtn.classList.add('hidden');
  saveImageBtn.setAttribute('aria-hidden','true');
  saveImageBtn.disabled = true;
}
function showSaveButton(){
  if(!hasCompletedOneCarve) return;
  saveImageBtn.classList.remove('hidden');
  saveImageBtn.removeAttribute('aria-hidden');
  saveImageBtn.disabled = false;
}

hideSaveButton();

function handleFile(e){
  const file = e.target.files[0];
  hasCompletedOneCarve = false;
  hideSaveButton();
  if(!file) { startGameBtn.disabled = true; fileNameLabel.textContent='No file chosen'; return; }
  fileNameLabel.textContent = file.name;
  if(!file.type.startsWith('image/')) { alert('Please select an image file.'); e.target.value=''; startGameBtn.disabled=true; fileNameLabel.textContent='No file chosen'; return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => { uploadedImage = img; startGameBtn.disabled = false; };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
fileInput.addEventListener('change', handleFile);

initSand();

startGameBtn.addEventListener('click', () => {
  if(!uploadedImage) return;
  carvingActive = true;
  clicksDone = 0; currentFraction = 0;
  prepareEngraving(uploadedImage, 1.5);
  positionCarveBox();
  carveBoxEl.classList.remove('hidden');
  revealProgressEl.textContent = 'Progress: 0%';
  hideSaveButton();
});

window.addEventListener('click', (e) => {
  if(!carvingActive) return;
  if(!pointInCarveBox(e.clientX, e.clientY)) return;
  spawnFloatingWord(e.clientX, e.clientY);
  clicksDone++;
  currentFraction = Math.min(1, clicksDone / totalNeededClicks);
  progressiveCarveStep(currentFraction);
  updateProgress();
  if(currentFraction >= 1){
    carvingActive = false;
    carveBoxEl.classList.add('hidden');
    revealProgressEl.textContent = 'Carving complete!';
    hasCompletedOneCarve = true;
    showSaveButton();
  }
});

function spawnFloatingWord(clientX, clientY){
  const word = floatWords[Math.floor(Math.random()*floatWords.length)];
  const el = document.createElement('div');
  el.className = 'floating-word';
  el.textContent = word;
  const angle = (Math.random()*40 - 20);
  const dx = (Math.random()*40 - 20);
  const dy = - (60 + Math.random()*40);
  el.style.setProperty('--rot', angle+'deg');
  el.style.setProperty('--tx', dx+'px');
  el.style.setProperty('--ty', dy+'px');
  el.style.left = clientX + 'px';
  el.style.top = clientY + 'px';
  document.body.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 1100);
}

function positionCarveBox(){
  const box = window.__carveRect; if(!box) return;
  const sandRect = document.getElementById('sandCanvas').getBoundingClientRect();
  carveBoxEl.style.left = (sandRect.left + box.x) + 'px';
  carveBoxEl.style.top = (sandRect.top + box.y) + 'px';
  carveBoxEl.style.width = box.w + 'px';
  carveBoxEl.style.height = box.h + 'px';
}

function pointInCarveBox(px,py){
  const r = carveBoxEl.getBoundingClientRect();
  return px>=r.left && px<=r.right && py>=r.top && py<=r.bottom;
}

function updateProgress(){
  const pct = (currentFraction*100).toFixed(1);
  revealProgressEl.textContent = `Progress: ${pct}%`;
}

function decayLoop(ts){
  requestAnimationFrame(decayLoop);
  if(!carvingActive || currentFraction<=0 || currentFraction>=1) { decayLastTs = ts; return; }
  const dt = (ts - decayLastTs)/1000; decayLastTs = ts;
  const decayRate = 0.05;
  if(dt>0){
    currentFraction = Math.max(0, currentFraction - decayRate*dt);
    decayCarving(currentFraction);
    updateProgress();
  }
}
requestAnimationFrame(decayLoop);

function compositeSceneToDataURL(){
  if(!hasCompletedOneCarve) return null;
  const sandCanvas = document.getElementById('sandCanvas');
  const shoreCanvas = document.getElementById('shoreCanvas');
  const wavesCanvas = document.getElementById('wavesCanvas');
  const w = sandCanvas.width; const h = sandCanvas.height;
  const off = document.createElement('canvas');
  off.width = w; off.height = h; const ctx = off.getContext('2d');
  ctx.drawImage(sandCanvas,0,0);
  if(shoreCanvas) ctx.drawImage(shoreCanvas,0,0);
  if(wavesCanvas) ctx.drawImage(wavesCanvas,0,0, w, h);
  return off.toDataURL('image/png');
}

saveImageBtn.addEventListener('click', () => {
  if(!hasCompletedOneCarve) return;
  const url = compositeSceneToDataURL();
  if(!url) return;
  const link = document.createElement('a');
  link.download = 'carving.png';
  link.href = url;
  link.click();
});
