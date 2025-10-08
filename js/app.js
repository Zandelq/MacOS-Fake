// Main app: window manager, dock wiring, clock, battery
import { initCalculatorWindow } from './calculator.js';

const desktop = document.getElementById('desktop');
const appsRoot = document.getElementById('apps-root');
let zTop = 20;

const PROXY_PREFIX = ''; 
// If you have an ultraviolet proxy endpoint, set it here, e.g.:
// const PROXY_PREFIX = 'https://ultraviolet.example.com/';
// The code will prefix navigation URLs with PROXY_PREFIX when non-empty.

document.querySelectorAll('.dock-icon').forEach(icon=>{
  icon.addEventListener('click', ()=> {
    const app = icon.dataset.app;
    if(app === 'calculator') openCalculator();
    if(app === 'browser') openBrowser();
  });
});

function openCalculator(){
  const win = initCalculatorWindow();
  appsRoot.appendChild(win);
  makeDraggable(win);
  bringToFront(win);
}

function openBrowser(){
  const win = createBrowserWindow();
  appsRoot.appendChild(win);
  makeDraggable(win);
  bringToFront(win);
}

function createBrowserWindow(){
  const win = document.createElement('div');
  win.className = 'window';
  win.style.left = '90px'; win.style.top = '80px';
  win.innerHTML = `
    <div class="titlebar" data-drag>
      <div class="controls">
        <div class="ball close" data-action="close"></div>
        <div class="ball min" data-action="minimize"></div>
        <div class="ball max" data-action="maximize"></div>
      </div>
      <div class="title">Safari</div>
    </div>
    <div class="content">
      <div class="browser-toolbar">
        <button class="btn" id="openNew">Open</button>
        <input class="url-input" id="urlInput" placeholder="example.com or https://example.com" />
        <button class="btn" id="goBtn">Go</button>
      </div>
      <iframe id="siteFrame" class="site" srcdoc="<div style='font-family:system-ui;padding:32px;color:#222'>Welcome — type a URL and press Go.</div>"></iframe>
    </div>
  `;
  // basic history
  win._hist = []; win._pos = -1;
  // wire buttons after attach
  setTimeout(()=>{
    const goBtn = win.querySelector('#goBtn');
    const urlInput = win.querySelector('#urlInput');
    const frame = win.querySelector('#siteFrame');
    goBtn.addEventListener('click', ()=> navigate(urlInput.value));
    urlInput.addEventListener('keydown', (e)=> { if(e.key === 'Enter') navigate(urlInput.value); });

    function normalize(u){
      u = u.trim(); if(!u) return '';
      if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
      return u;
    }
    function navigate(u){
      const n = normalize(u);
      if(!n) return;
      const final = PROXY_PREFIX ? (PROXY_PREFIX + encodeURIComponent(n)) : n;
      // Attempt to load in iframe; if blocked, user can open in new tab
      try {
        frame.src = final;
      } catch(e){
        window.open(final, '_blank');
      }
      // store history (local to this fake browser)
      win._hist = win._hist.slice(0, win._pos + 1);
      win._hist.push(final);
      win._pos = win._hist.length - 1;
    }
  }, 0);

  wireWindowButtons(win);
  return win;
}

/* Window utilities */
function bringToFront(win){
  zTop += 1; win.style.zIndex = zTop;
}
function makeDraggable(win){
  const bar = win.querySelector('[data-drag]');
  if(!bar) return;
  bar.addEventListener('mousedown', startDrag);
  bar.addEventListener('touchstart', startDrag, {passive:true});
  function startDrag(e){
    e.preventDefault();
    bringToFront(win);
    const rect = win.getBoundingClientRect();
    const startX = (e.touches ? e.touches[0].clientX : e.clientX);
    const startY = (e.touches ? e.touches[0].clientY : e.clientY);
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;
    function move(ev){
      const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);
      win.style.left = Math.max(8, cx - offsetX) + 'px';
      win.style.top = Math.max(48, cy - offsetY) + 'px';
    }
    function up(){ window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); }
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, {passive:true}); window.addEventListener('touchend', up);
  }
  // click to focus
  win.addEventListener('mousedown', ()=> bringToFront(win));
}

function wireWindowButtons(win){
  win.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const action = btn.dataset.action;
      if(action === 'close') win.remove();
      if(action === 'minimize') win.style.display = 'none';
      if(action === 'maximize') {
        if(!win._maxed){
          win._prev = {left:win.style.left, top:win.style.top, width:win.style.width, height:win.style.height};
          win.style.left = '24px'; win.style.top = '48px';
          win.style.width = `calc(100% - 48px)`; win.style.height = `calc(100% - 120px)`;
          win._maxed = true;
        } else {
          if(win._prev){ Object.assign(win.style, win._prev); }
          win._maxed = false;
        }
      }
    })
  });
}

/* Clock (America/Chicago) */
function startClock(){
  const el = document.getElementById('time');
  function tick(){
    const now = new Date();
    // Use Intl to get America/Chicago (Central US)
    const fmtTime = new Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false});
    el.textContent = fmtTime.format(now);
  }
  tick();
  setInterval(tick, 1000);
}
startClock();

/* Battery */
async function startBattery(){
  const el = document.getElementById('battery-pct');
  try {
    if('getBattery' in navigator){
      const bat = await navigator.getBattery();
      function update(){
        const pct = Math.round(bat.level * 100);
        el.textContent = pct + (bat.charging ? ' ⚡' : '');
      }
      bat.addEventListener('levelchange', update);
      bat.addEventListener('chargingchange', update);
      update();
    } else {
      el.textContent = 'unknown';
    }
  } catch(e){
    el.textContent = 'unknown';
  }
}
startBattery();

/* Expose bringToFront for other modules */
window.__fakeDesktop = {bringToFront};
