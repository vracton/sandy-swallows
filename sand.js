let sandCanvas, sandCtx, shoreCanvas, shoreCtx;
let noiseData;
let shoreAnimStart;

let carveBuffer = null;
let carveMaskAlpha = null;
let carveOrder = null;
let carveRect = null;

export function initSand(){
  sandCanvas = document.getElementById('sandCanvas');
  shoreCanvas = document.getElementById('shoreCanvas');
  sandCtx = sandCanvas.getContext('2d');
  shoreCtx = shoreCanvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  generateSand();
  shoreAnimStart = performance.now();
  requestAnimationFrame(drawShoreline);
}

function resize(){
  if(!sandCanvas) return;
  sandCanvas.width = sandCanvas.clientWidth;
  sandCanvas.height = sandCanvas.clientHeight;
  shoreCanvas.width = sandCanvas.width;
  shoreCanvas.height = sandCanvas.height;
  generateSand();
  carveBuffer = null; carveMaskAlpha = null; carveOrder = null; carveRect = null;
}

function generateSand(){
  const w = sandCanvas.width;
  const h = sandCanvas.height;
  const imgData = sandCtx.createImageData(w,h);
  const d = imgData.data;
  const baseColor = { r:218, g:198, b:160 };
  noiseData = new Float32Array(w*h);
  for(let y=0; y<h; y++){
    for(let x=0; x<w; x++){
      const i = (y*w + x);
      let n=0, amp=1, sum=0;
      for(let o=0;o<5;o++){
        n += perlinLike((x+1000)*0.01*amp, (y+2000)*0.01*amp)/amp;
        sum += 1/amp;
        amp *= 2.1;
      }
      n/=sum;
      noiseData[i]=n;
      const shade = (n-0.5)*42;
      let r = baseColor.r + shade;
      let g = baseColor.g + shade*0.9;
      let b = baseColor.b + shade*0.7;

      const grain = hash2(x,y);
      const grainAmt = (grain-0.5)*18;
      r += grainAmt; g += grainAmt; b += grainAmt;
      d[i*4+0] = clamp(r,0,255);
      d[i*4+1] = clamp(g,0,255);
      d[i*4+2] = clamp(b,0,255);
      d[i*4+3] = 255;
    }
  }
  sandCtx.putImageData(imgData,0,0);
}

function clamp(v,min,max){ return v<min?min:v>max?max:v; }

function perlinLike(x,y){
  const xi = Math.floor(x); const yi = Math.floor(y);
  let accum = 0; let scale = 1; let norm=0;
  for(let o=0;o<4;o++){
    const xf = x*scale; const yf=y*scale;
    const x0 = Math.floor(xf), y0=Math.floor(yf);
    const x1 = x0+1, y1=y0+1;
    const sx = xf - x0; const sy = yf - y0;
    const n00 = hash2(x0,y0);
    const n10 = hash2(x1,y0);
    const n01 = hash2(x0,y1);
    const n11 = hash2(x1,y1);
    const ix0 = lerp(n00,n10,smooth(sx));
    const ix1 = lerp(n01,n11,smooth(sx));
    const v = lerp(ix0,ix1,smooth(sy));
    accum += v / scale;
    norm += 1/scale;
    scale *= 2;
  }
  return accum / norm;
}
function hash2(x,y){
  let n = x*374761393 + y*668265263; n = (n^(n>>13))*1274126177; n = (n^(n>>16));
  return (n & 0xffff)/0xffff; // 0..1
}
function lerp(a,b,t){ return a + (b-a)*t; }
function smooth(t){ return t*t*(3-2*t); }

function drawShoreline(ts){
  const t = (ts - shoreAnimStart)*0.001;
  const w = shoreCanvas.width;
  const h = shoreCanvas.height;
  shoreCtx.clearRect(0,0,w,h);
  const bandHeight = Math.max(80, h*0.18);
  const flow = (t*60) % w;
  const grad = shoreCtx.createLinearGradient(0,0,0,bandHeight);
  grad.addColorStop(0,'rgba(10,77,102,0.55)');
  grad.addColorStop(0.35,'rgba(12,82,103,0.40)');
  grad.addColorStop(0.7,'rgba(30,70,70,0.15)');
  grad.addColorStop(1,'rgba(0,0,0,0)');
  shoreCtx.save();
  shoreCtx.globalCompositeOperation='lighter';
  shoreCtx.fillStyle = grad;

  shoreCtx.beginPath();
  const edgeY = bandHeight - 20;
  shoreCtx.moveTo(0,0);
  shoreCtx.lineTo(0,edgeY);
  for(let x=0;x<=w;x+=16){
    const y = edgeY + Math.sin((x*0.03)+t*2)*6 + Math.sin((x*0.11)-t*1.4)*3;
    shoreCtx.lineTo(x,y);
  }
  shoreCtx.lineTo(w,0);
  shoreCtx.closePath();
  shoreCtx.fill();
  shoreCtx.restore();

  shoreCtx.save();
  shoreCtx.globalCompositeOperation='screen';
  for(let i=0;i<6;i++){
    const y = 10 + i*bandHeight/7 + Math.sin(t*1.2 + i)*4;
    const lineGrad = shoreCtx.createLinearGradient(0,y, w,y);
    lineGrad.addColorStop(((flow/w)+0.1*i)%1,'rgba(180,220,255,0)');
    lineGrad.addColorStop(((flow/w)+0.1*i+0.02)%1,'rgba(200,240,255,0.35)');
    lineGrad.addColorStop(((flow/w)+0.1*i+0.055)%1,'rgba(180,220,255,0)');
    shoreCtx.fillStyle = lineGrad;
    shoreCtx.fillRect(0,y-2,w,4);
  }
  shoreCtx.restore();

  requestAnimationFrame(drawShoreline);
}

export function prepareEngraving(img, scaleMultiplier = 1, origin=null){
  const baseMaxW = sandCanvas.width * 0.5;
  const baseMaxH = sandCanvas.height * 0.5;
  let w = img.width, h = img.height;
  const scale = Math.min(1, baseMaxW / w, baseMaxH / h) * scaleMultiplier;
  w = Math.round(w*scale); h = Math.round(h*scale);

  let x, y;
  if(origin){
    x = Math.round(origin.x - w/2);
    y = Math.round(origin.y - h/2);
    x = Math.max(0, Math.min(sandCanvas.width - w, x));
    y = Math.max(0, Math.min(sandCanvas.height - h, y));
  } else {
    x = (sandCanvas.width - w)/2;
    y = (sandCanvas.height - h)/2;
  }
  carveRect = {x,y,w,h};
  window.__carveRect = carveRect;

  const temp = document.createElement('canvas');
  temp.width = w; temp.height = h; const tctx = temp.getContext('2d');
  tctx.drawImage(img,0,0,w,h);
  const src = tctx.getImageData(0,0,w,h); const d=src.data;
  const gray = new Float32Array(w*h);
  for(let i=0;i<w*h;i++) gray[i] = (d[i*4]*0.299 + d[i*4+1]*0.587 + d[i*4+2]*0.114)/255;
  for(let i=0;i<w*h;i++) gray[i] = Math.pow(gray[i],0.85);
  const sob = new Float32Array(w*h);
  const kx = [-1,0,1,-2,0,2,-1,0,1]; const ky = [-1,-2,-1,0,0,0,1,2,1];
  for(let yy=1; yy<h-1; yy++) for(let xx=1; xx<w-1; xx++){
    let gx=0, gy=0, idx=0; for(let ky2=-1; ky2<=1; ky2++) for(let kx2=-1; kx2<=1; kx2++){
      const g = gray[(yy+ky2)*w + (xx+kx2)]; gx += g * kx[idx]; gy += g * ky[idx]; idx++; }
    sob[yy*w+xx] = Math.sqrt(gx*gx + gy*gy);
  }
  let maxSob=0; for(let i=0;i<w*h;i++) if(sob[i]>maxSob) maxSob=sob[i];
  const height = new Float32Array(w*h);
  for(let i=0;i<w*h;i++){ const edge = maxSob? sob[i]/maxSob : 0; height[i] = gray[i]*0.55 + edge*0.45; }

  carveBuffer = sandCtx.getImageData(x,y,w,h); const cd = carveBuffer.data;
  for(let yy=1; yy<h-1; yy++) for(let xx=1; xx<w-1; xx++){
    const i = yy*w+xx; const hL=height[i-1], hR=height[i+1], hU=height[i-w], hD=height[i+w];
    const dx=hR-hL, dy=hD-hU, slope=(dx-dy); const baseIndex=i*4; const depth=height[i];
    const darken = depth*38;
    cd[baseIndex+0]=clamp(cd[baseIndex+0]-darken + slope*45,0,255);
    cd[baseIndex+1]=clamp(cd[baseIndex+1]-darken*0.9 + slope*40,0,255);
    cd[baseIndex+2]=clamp(cd[baseIndex+2]-darken*0.75 + slope*30,0,255);
  }
  carveBuffer = applyPostCarveEffects(carveBuffer, height, w,h);

  const cx = w/2, cy = h/2; const total = w*h;
  const arr = new Array(total);
  for(let i=0;i<total;i++){ const px=i%w, py=(i/w)|0; const dx=px-cx, dy=py-cy; const dist = Math.sqrt(dx*dx+dy*dy); const jitter = hash2(px,py)*8; arr[i]={i, dist: dist + jitter}; }
  arr.sort((a,b)=>a.dist-b.dist);
  carveOrder = new Uint32Array(total); for(let i=0;i<total;i++) carveOrder[i]=arr[i].i;
  carveMaskAlpha = new Uint8Array(total);
}

function applyPostCarveEffects(imageData, height, w,h){
  const data = imageData.data;
  const shadow = new Uint8ClampedArray(data.length);
  for(let i=0;i<w*h;i++){
    const val=height[i]; const a = Math.min(255, Math.max(0, val*255*0.55));
    shadow[i*4+0]=60; shadow[i*4+1]=50; shadow[i*4+2]=30; shadow[i*4+3]=a;
  }
  blurAlpha(shadow,w,h,1);
  blendMultiply(data, shadow);
  const hi = new Uint8ClampedArray(data.length);
  for(let i=0;i<w*h;i++){
    const val=height[i]; const a=Math.pow(val,1.2)*140; hi[i*4]=255; hi[i*4+1]=245; hi[i*4+2]=210; hi[i*4+3]=a; }
  blendScreen(data, hi);
  return new ImageData(data,w,h);
}

function blurAlpha(buf,w,h,r){
  const tmp = new Uint8ClampedArray(buf);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    let rs=0,gs=0,bs=0,as=0,count=0;
    for(let yy=-r; yy<=r; yy++){
      const ny=y+yy; if(ny<0||ny>=h) continue;
      for(let xx=-r; xx<=r; xx++){
        const nx=x+xx; if(nx<0||nx>=w) continue;
        const i=(ny*w+nx)*4; rs+=tmp[i]; gs+=tmp[i+1]; bs+=tmp[i+2]; as+=tmp[i+3]; count++;
      }
    }
    const o=(y*w+x)*4; buf[o]=rs/count; buf[o+1]=gs/count; buf[o+2]=bs/count; buf[o+3]=as/count;
  }
}
function blendMultiply(base, layer){
  for(let i=0;i<base.length;i+=4){ const a=layer[i+3]/255; if(a===0) continue; base[i]=base[i]*(1-a)+ (base[i]*layer[i]/255)*a; base[i+1]=base[i+1]*(1-a)+ (base[i+1]*layer[i+1]/255)*a; base[i+2]=base[i+2]*(1-a)+ (base[i+2]*layer[i+2]/255)*a; }
}
function blendScreen(base, layer){
  for(let i=0;i<base.length;i+=4){ const a=layer[i+3]/255; if(a===0) continue; base[i]=base[i]*(1-a)+ (255 - (255-base[i])*(255-layer[i])/255)*a; base[i+1]=base[i+1]*(1-a)+ (255 - (255-base[i+1])*(255-layer[i+1])/255)*a; base[i+2]=base[i+2]*(1-a)+ (255 - (255-base[i+2])*(255-layer[i+2])/255)*a; }
}

export function progressiveCarveStep(fraction){
  if(!carveBuffer || !carveOrder || !carveRect) return;
  fraction = Math.max(0, Math.min(1,fraction));
  const {x,y,w,h} = carveRect;
  const total = carveOrder.length;
  const revealCount = Math.floor(total * fraction);
  for(let idx=0; idx<revealCount; idx++){
    const pIndex = carveOrder[idx];
    if(carveMaskAlpha[pIndex]) continue;
    carveMaskAlpha[pIndex]=1;
    const px = pIndex % w; const py = (pIndex / w)|0;
    const srcI = pIndex*4;
    const base = sandCtx.getImageData(x+px,y+py,1,1);
    const bd = base.data; const cd = carveBuffer.data;
    bd[0]=cd[srcI]; bd[1]=cd[srcI+1]; bd[2]=cd[srcI+2]; bd[3]=255;
    sandCtx.putImageData(base,x+px,y+py);
  }
}

export function decayCarving(fraction){
  if(!carveBuffer || !carveOrder || !carveRect || !carveMaskAlpha) return;
  fraction = Math.max(0, Math.min(1,fraction));
  const {x,y,w,h} = carveRect; const total = carveOrder.length;
  const targetCount = Math.floor(total * fraction);
  let revealedCount = 0; for(let i=0;i<total;i++) if(carveMaskAlpha[carveOrder[i]]) revealedCount++;
  if(revealedCount <= targetCount) return;
  const toRemove = revealedCount - targetCount;
  for(let i=revealedCount-1; i>=revealedCount - toRemove; i--){
    const pIndex = carveOrder[i];
    if(!carveMaskAlpha[pIndex]) continue;
    carveMaskAlpha[pIndex]=0;
    const px = pIndex % w; const py = (pIndex / w)|0;
    //directly recompute base color at coordinate using noiseData
    const globalIndex = (py + y) * sandCanvas.width + (px + x);
    const baseN = noiseData[globalIndex];
    const baseColor = computeBaseSandColor(baseN);
    const imgData = sandCtx.createImageData(1,1);
    imgData.data[0]=baseColor.r; imgData.data[1]=baseColor.g; imgData.data[2]=baseColor.b; imgData.data[3]=255;
    sandCtx.putImageData(imgData, x+px, y+py);
  }
}
function computeBaseSandColor(n){
  const baseColor = { r:218, g:198, b:160 };
  const shade = (n-0.5)*42; let r = baseColor.r + shade; let g = baseColor.g + shade*0.9; let b = baseColor.b + shade*0.7;
  return {r:clamp(r,0,255), g:clamp(g,0,255), b:clamp(b,0,255)};
}

export function engraveImage(img){
  prepareEngraving(img);
  progressiveCarveStep(1);
}
