// Minimal: Space toggles menu (weißes Page). Menü enthält Mixcloud iframe + overlay (pointer-events:none so clicks pass through).
// Behavior: when user clicks the iframe and playback starts, we detect via widget.events.play or getPosition polling.
// On detection: show "Play gedrückt", enable M to toggle play/pause, restore saved position (if any).
// Current position saved every second to localStorage under key derived from iframe.src.

const menuPanel = document.getElementById('menuPanel');
const mixIframe = document.getElementById('mixcloudPlayer');
const iframeOverlay = document.getElementById('iframeOverlay');
const overlayText = document.getElementById('overlayText');
const miniStatus = document.getElementById('miniStatus');

let menuOpen = false;
let widget = null;
let widgetReady = false;
let userInteracted = false; // set when playback is actually detected
let isPlaying = false;
let pendingSeekSeconds = null;
let _saveInterval = null;

const STORAGE_KEY = 'mixcloud_pos_' + encodeURIComponent(mixIframe.src);

// init widget
try{
  widget = Mixcloud.PlayerWidget(mixIframe);
  widget.ready.then(()=>{
    widgetReady = true;
    try{
      widget.events.play.on(()=>{ isPlaying = true; confirmPlay('widget.events.play'); });
      widget.events.pause.on(()=>{ isPlaying = false; });
      widget.events.ended.on(()=>{ localStorage.removeItem(STORAGE_KEY); miniStatus.textContent = 'Track beendet — gespeicherte Position gelöscht'; });
    }catch(e){ console.warn('events unavailable', e); }

    // load saved pos (pending) but don't seek yet
    const savedRaw = localStorage.getItem(STORAGE_KEY);
    const saved = savedRaw ? parseFloat(savedRaw) : 0;
    if (saved && !Number.isNaN(saved) && saved > 0){ pendingSeekSeconds = saved; console.log('pending saved pos', pendingSeekSeconds); }

    // start periodic saving (will no-op until widget.getPosition works)
    startSavingPositionEverySecond();
  }).catch(err=>console.warn('widget.ready rejected', err));
}catch(e){ console.warn('widget init failed', e); }

// Toggle menu with Space
document.addEventListener('keydown', (e)=>{
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
  if (e.code === 'Space'){
    e.preventDefault(); toggleMenu();
  } else if (e.key && e.key.toLowerCase() === 'm'){
    e.preventDefault(); if (userInteracted) togglePlayPause(); else alert('Bitte zuerst Play im Player drücken.');
  }
}, {passive:false});

function toggleMenu(){ menuOpen = !menuOpen; menuPanel.classList.toggle('open', menuOpen); menuPanel.setAttribute('aria-hidden', String(!menuOpen)); if(menuOpen){ miniStatus.textContent = 'Menü geöffnet — bitte in den Player klicken und Play drücken.'; } else { miniStatus.textContent = 'Warte auf Interaktion…'; } }

// Detect clicks in iframe area: capture-phase pointerdown/touchstart global, check coords against iframe rect
function onGlobalPointerDown(e){
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
  const rect = mixIframe.getBoundingClientRect();
  const x = (typeof e.clientX === 'number') ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX);
  const y = (typeof e.clientY === 'number') ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY);
  if (typeof x !== 'number' || typeof y !== 'number') return;
  if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom){
    // user clicked inside iframe area — start play detection
    startPlayDetection('pointerdown-in-iframe');
  }
}
document.addEventListener('pointerdown', onGlobalPointerDown, true);
document.addEventListener('touchstart', onGlobalPointerDown, true);

// iframe focus heuristic
try{ mixIframe.addEventListener('focus', ()=>{ startPlayDetection('iframe-focus'); }); }catch(e){}
window.addEventListener('blur', ()=>{ startPlayDetection('window-blur'); });

// Play detection: poll getPosition and listen to events.play
const PLAY_POLL_INTERVAL = 350; const PLAY_DETECT_TIMEOUT = 15000;
let _playDetectPoll = null; let _playDetectTimer = null; let _widgetPlayHandler = null;

function startPlayDetection(source){
  if (_playDetectPoll) return; // already running
  miniStatus.textContent = 'Erkenne Play (trigger: ' + source + ')';
  // attach widget event handler if available
  try{ if (widget && widget.events && widget.events.play && !_widgetPlayHandler){ _widgetPlayHandler = ()=> confirmPlay('widget.events.play'); widget.events.play.on(_widgetPlayHandler); } }catch(e){}

  const start = Date.now();
  _playDetectPoll = setInterval(async ()=>{
    if (!widgetReady) return;
    try{
      const pos = await widget.getPosition();
      if (typeof pos === 'number' && isFinite(pos) && pos > 0.5){ confirmPlay('getPosition>0.5s (poll)'); }
    }catch(err){}
    if (Date.now() - start > PLAY_DETECT_TIMEOUT){ stopPlayDetection(); miniStatus.textContent = 'Kein Play erkannt (timeout)'; }
  }, PLAY_POLL_INTERVAL);
  _playDetectTimer = setTimeout(()=>stopPlayDetection(), PLAY_DETECT_TIMEOUT);
}
function stopPlayDetection(){ if (_playDetectPoll){ clearInterval(_playDetectPoll); _playDetectPoll = null; } if (_playDetectTimer){ clearTimeout(_playDetectTimer); _playDetectTimer = null; } }

async function confirmPlay(detectedVia){
  if (userInteracted) return;
  userInteracted = true; isPlaying = true;
  overlayText.textContent = 'Play gedrückt. Mit der Taste M kannst du nun die Musik an und aus machen.';
  miniStatus.textContent = 'Play gedrückt (detected via: ' + detectedVia + ')';
  // try restore saved position if any
  await tryPendingSeekAfterUserInteracted();
  stopPlayDetection();
}

// Resume / seek behavior
async function attemptSeek(seconds){ if (!widgetReady) return false; try{ const res = await widget.seek(seconds); if (res === false) return false; pendingSeekSeconds = null; return true; }catch(err){ return false; } }
async function tryPendingSeekAfterUserInteracted(){ if (!widgetReady) return; if (!pendingSeekSeconds) return; const ok = await attemptSeek(pendingSeekSeconds); if (ok) return; const start = Date.now(); const timeout = 10000; const poll = setInterval(async ()=>{ if (!widgetReady) return; try{ const pos = await widget.getPosition(); if (typeof pos === 'number' && isFinite(pos) && pos > 0.1){ const ok2 = await attemptSeek(pendingSeekSeconds); if (ok2){ clearInterval(poll); } } }catch(e){} if (Date.now()-start > timeout){ clearInterval(poll); } }, 600); }

// Periodically save position
function startSavingPositionEverySecond(){ if (_saveInterval) return; _saveInterval = setInterval(async ()=>{ if (!widgetReady) return; try{ const pos = await widget.getPosition(); if (typeof pos === 'number' && isFinite(pos)){ localStorage.setItem(STORAGE_KEY, String(Math.floor(pos))); } }catch(e){} }, 1000); }
function stopSavingPosition(){ if (_saveInterval){ clearInterval(_saveInterval); _saveInterval = null; } }

// Toggle play/pause via widget
async function togglePlayPause(){ if (!widgetReady) return; if (!userInteracted) return; try{ if (typeof widget.togglePlay === 'function'){ await widget.togglePlay(); return; } if (isPlaying) await widget.pause(); else await widget.play(); }catch(err){} }

// start saving once widget is ready and setup pending saved pos
(function initSavedPos(){ try{ const savedRaw = localStorage.getItem(STORAGE_KEY); const saved = savedRaw ? parseFloat(savedRaw) : 0; if (saved && !Number.isNaN(saved) && saved > 0){ pendingSeekSeconds = saved; console.log('pending saved pos', pendingSeekSeconds); } }catch(e){} })();

// Ensure saving is attempted once widget ready (set in widget.ready above)
// Expose unload cleanup
window.addEventListener('beforeunload', ()=>{ stopSavingPosition(); });
