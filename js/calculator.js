// Calculator module — returns a window DOM node when initCalculatorWindow() is called
export function initCalculatorWindow(){
  const win = document.createElement('div');
  win.className = 'window';
  win.style.left = '160px'; win.style.top = '120px';
  win.innerHTML = `
    <div class="titlebar" data-drag>
      <div class="controls">
        <div class="ball close" data-action="close"></div>
        <div class="ball min" data-action="minimize"></div>
        <div class="ball max" data-action="maximize"></div>
      </div>
      <div class="title">Calculator</div>
    </div>
    <div class="content" style="display:flex;align-items:center;justify-content:center;">
      <div class="calc" id="calcUI">
        <div class="calc-display">
          <div class="calc-sub"><div id="calc-base">HEX</div><div id="calc-binary" style="font-family:monospace;font-size:11px">00000000 00000000</div></div>
          <div id="calc-main" style="font-size:30px; font-family:monospace;">0x0</div>
        </div>
        <div class="keys">
          <div class="key" data-key="AND">AND</div>
          <div class="key" data-key="OR">OR</div>
          <div class="key" data-key="XOR">XOR</div>
          <div class="key op" data-key="/">÷</div>

          <div class="key" data-key="7">7</div>
          <div class="key" data-key="8">8</div>
          <div class="key" data-key="9">9</div>
          <div class="key op" data-key="*">×</div>

          <div class="key" data-key="4">4</div>
          <div class="key" data-key="5">5</div>
          <div class="key" data-key="6">6</div>
          <div class="key op" data-key="-">−</div>

          <div class="key" data-key="1">1</div>
          <div class="key" data-key="2">2</div>
          <div class="key" data-key="3">3</div>
          <div class="key op" data-key="+">+</div>

          <div class="key wide" data-key="0">0</div>
          <div class="key" data-key=".">.</div>
          <div class="key eq" data-key="=">=</div>
        </div>
      </div>
    </div>
  `;

  // Wire basic window buttons
  win.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const action = btn.dataset.action;
      if(action === 'close') win.remove();
      if(action === 'minimize') win.style.display = 'none';
      if(action === 'maximize'){
        if(!win._maxed){ win._prev = {left:win.style.left, top:win.style.top, width:win.style.width, height:win.style.height}; win.style.left='24px'; win.style.top='48px'; win.style.width='calc(100% - 48px)'; win.style.height='calc(100% - 120px)'; win._maxed = true;}
        else { if(win._prev) Object.assign(win.style, win._prev); win._maxed = false; }
      }
    });
  });

  // simple calculator logic (supports decimal arithmetic, displays hex and binary)
  const displayMain = win.querySelector('#calc-main');
  const displayBinary = win.querySelector('#calc-binary');
  const displayBase = win.querySelector('#calc-base');

  let state = {value: BigInt(0), input: '0', pendingOp: null, waiting: false, base:'HEX'};

  function render(){
    // Show as hex with 0x prefix and uppercase
    const hex = '0x' + state.value.toString(16).toUpperCase();
    displayMain.textContent = hex;
    // show 32-bit binary grouped by 8
    const bin = state.value >= 0 ? state.value.toString(2) : ( (BigInt.asUintN(32, state.value)).toString(2) );
    const b32 = bin.padStart(32,'0').replace(/(.{8})/g,'$1 ').trim();
    displayBinary.textContent = b32;
    displayBase.textContent = state.base;
  }

  function parseInput(str){
    // accept decimal or hex starting with 0x, else treat as decimal
    if(str.startsWith('0x') || str.startsWith('0X')) return BigInt('0x'+str.slice(2));
    if(str.includes('.')) {
      // decimal with fraction -> convert to integer by rounding
      return BigInt(Math.round(parseFloat(str)));
    }
    return BigInt(str);
  }

  function applyOp(op){
    if(state.pendingOp && !state.waiting){
      compute();
    }
    state.pendingOp = op === '=' ? null : op;
    state.waiting = true;
  }

  function compute(){
    const a = state.value;
    const b = parseInput(state.input || '0');
    let res = a;
    switch(state.pendingOp){
      case '+': res = a + b; break;
      case '-': res = a - b; break;
      case '*': res = a * b; break;
      case '/': res = b === BigInt(0) ? a : a / b; break;
      case 'AND': res = a & b; break;
      case 'OR': res = a | b; break;
      case 'XOR': res = a ^ b; break;
      default: res = b;
    }
    state.value = res;
    state.input = res.toString();
  }

  // keys
  win.querySelectorAll('.key').forEach(k=>{
    k.addEventListener('click', ()=>{
      const key = k.dataset.key;
      if(/^[0-9]$/.test(key)){
        if(state.waiting){ state.input = key; state.waiting=false; } else { state.input = (state.input === '0' ? key : state.input + key); }
        // reflect on value but keep as BigInt after parse
        try { state.value = parseInput(state.input); } catch(e){}
        render();
        return;
      }
      if(key === '.') {
        // ignore or treat as decimal separator; we'll not implement fractional BigInt — ignore
        return;
      }
      if(['+','-','*','/','AND','OR','XOR'].includes(key)){
        if(!state.pendingOp){ state.value = parseInput(state.input || '0'); }
        applyOp(key);
        state.input = state.value.toString();
        render();
        return;
      }
      if(key === '='){
        if(state.pendingOp){ compute(); state.pendingOp = null; state.waiting = true; render(); }
        return;
      }
    });
  });

  // initialize
  state.value = BigInt(0);
  state.input = '0';
  render();

  return win;
}
