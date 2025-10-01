import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

let renderer, scene, camera, mesh, startTime;

export function initWaves(){
  const canvas = document.getElementById('wavesCanvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  resize();

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#07202b', 0.36);

  camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0,1.3,3.2);

  const geometry = new THREE.PlaneGeometry(6,6, 140,140);
  const material = new THREE.MeshStandardMaterial({ color:'#0a4d66', roughness:0.85, metalness:0.05, flatShading:false });
  mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI/2;
  scene.add(mesh);

  const hemi = new THREE.HemisphereLight('#8fc9e8', '#03222c', 1.2);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight('#a8defa', 0.6);
  dir.position.set(2,4,2);
  scene.add(dir);

  startTime = performance.now();
  animate();
  window.addEventListener('resize', resize);
}

function resize(){
  if(!renderer) return;
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  if(camera){
    camera.aspect = rect.width/rect.height;
    camera.updateProjectionMatrix();
  }
}

function animate(){
  requestAnimationFrame(animate);
  const t = (performance.now() - startTime) * 0.001;
  if(mesh){
    const pos = mesh.geometry.attributes.position;
    for(let i=0; i<pos.count; i++){
      const x = pos.getX(i);
      const y = pos.getY(i);
      const wave = Math.sin(x*1.2 + t*1.4)*0.08 + Math.cos(y*1.5 + t*1.1)*0.06;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }
  renderer.render(scene, camera);
}
