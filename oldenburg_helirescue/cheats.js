/*

CHEATS
	Open the Console by pressing ~ on the keyboard.

	fillmeup: refills the fuel
	itsnooveryet: continue the game, if game over
	nostress: disables quests
	imthewinner: congratulations, you've won all the quests.
	imtherocketman: you can fly as high as you like. The higher you fly, the faster you go.
	portals: open wormholes near the hangar.
	
	// Colors
	
	nightmap: the map is colored in nightvision
	oldmap: the map is colored like an old map
	wintermap: icy winter colors
	wearefogged: foggy map
	resetcolors:  resets the colors of the map


*/

function applyFilterFromJson(jsonObj) {
	if (!jsonObj || !jsonObj.state) return;
	for (const [variable, cfg] of Object.entries(jsonObj.state)) {
	if (!variable || !cfg) continue;
	let value = cfg.value || '';
	if (cfg.suffix) {
	value += cfg.suffix;
	}
	document.documentElement.style.setProperty(variable, value);
	}
}

(function(){
  const consoleEl = document.getElementById('cheat-console');
  const inputEl = document.getElementById('console-input');
  const logEl = document.getElementById('console-log');

  const cheats = {

  'fillmeup': () => {
    fuel = 100;          // Tank sofort voll
    outOfFuel = false;   // sicherstellen, dass Motor wieder läuft
    updateFuelHUD();     // HUD-Update triggern
    alert('Tank wieder voll! 🚁⛽');
  },
  'itsnotoveryet': () => {
    // Tank auffüllen
    fuel = 100;
    outOfFuel = false;
    updateFuelHUD();

    // GameOver rückgängig machen
    window.gameOver = false;
    paused = false;
    controlsDisabled = false;

    // Overlay entfernen (falls sichtbar)
    const overlay = document.getElementById('gameOverOverlay');
    if (overlay) overlay.remove();

    alert('Weiter geht’s – Tank voll, Game Over rückgängig!');
  },
  
  // in deine cheats-Map einfügen
'nostress': () => {
  try {
    // cancel any scheduled next-quest
    if (window._nextQuestTimeout) { clearTimeout(window._nextQuestTimeout); window._nextQuestTimeout = null; }
    window._suppressNextQuest = true;

    // stop any game-over zoom/interval
    if (window._zoomEmergencyInterval) { clearInterval(window._zoomEmergencyInterval); window._zoomEmergencyInterval = null; }

    // stop and remove visual pulses/overlays for quests
    try { if (activeScenePulse) { activeScenePulse.stop(); activeScenePulse = null; } } catch(e){}
    try { if (activeHospitalPulse) { activeHospitalPulse.stop(); activeHospitalPulse = null; } } catch(e){}

    // clear quest data -> keine Quests mehr
    quests = [];
    currentQuestIndex = -1;
    currentQuest = null;
    questState = null;

    // update UI
    updateCompletedBox(0, 0);
    const qb = document.getElementById('questBox');
    if (qb) qb.textContent = 'Keine Quests (Cheat aktiviert)';
    showNavUI(false);
	qb.style.display = "none";
	document.getElementById("questContainer").style.display="none";

    // feedback
    if (typeof flashMessage === 'function') flashMessage('Cheat: Keine Quests mehr — enjoy! 🎉');
    else alert('Cheat: Keine Quests mehr — enjoy! 🎉');
  } catch (err) {
    console.error('nostress cheat failed', err);
    alert('Fehler beim Anwenden von "nostress": ' + (err && err.message ? err.message : err));
  }
},

'imthewinner': () => {
  try {
    // cancel any scheduled next-quest
    if (window._nextQuestTimeout) { clearTimeout(window._nextQuestTimeout); window._nextQuestTimeout = null; }
    window._suppressNextQuest = true;

    // stop any game-over zoom/interval
    if (window._zoomEmergencyInterval) { clearInterval(window._zoomEmergencyInterval); window._zoomEmergencyInterval = null; }

    // stop and remove visual pulses/overlays for current quest
    try { if (activeScenePulse) { activeScenePulse.stop(); activeScenePulse = null; } } catch(e){}
    try { if (activeHospitalPulse) { activeHospitalPulse.stop(); activeHospitalPulse = null; } } catch(e){}

    // mark all quests as completed (keine neue Quest starten)
    const total = Array.isArray(quests) ? quests.length : 0;
    currentQuest = null;
    questState = null;
    currentQuestIndex = total; // indicates all done

    // update UI: Completed x of x
    updateCompletedBox(total, total);
    const qb = document.getElementById('questBox');
    if (qb) qb.textContent = 'Alle Einsätze erledigt — Glückwunsch!';

    // hide nav and school other quest visuals
    showNavUI(false);

    // feedback
    if (typeof flashMessage === 'function') flashMessage('Alle Quests als erledigt markiert ✅');
    else alert('Alle Quests als erledigt markiert ✅');
  } catch (err) {
    console.error('imthewinner cheat failed', err);
    alert('Fehler beim Anwenden von "imthewinner": ' + (err && err.message ? err.message : err));
  }
},

// Extrem aggressive Rocket-Mode (sehr starke Beschleunigungs- & Brems-Skalierung)
'imtherocketman': () => {
  try {
    if (typeof map === 'undefined' || typeof GEARS === 'undefined') {
      alert('Rocketmode nicht verfügbar (map/GEARS fehlen).');
      return;
    }

    // Toggle: wenn aktiv -> restore
    if (window._rocketModeActive) {
	
	boostActive = false;
    window._disableBoost = false;   // Sperre wieder aufheben

		
	if (window._FUEL_CONFIG_ORIG && typeof FUEL_CONFIG !== 'undefined') {
	  try {
		FUEL_CONFIG.base     = window._FUEL_CONFIG_ORIG.base;
		FUEL_CONFIG.throttle = window._FUEL_CONFIG_ORIG.throttle;
		FUEL_CONFIG.speed    = window._FUEL_CONFIG_ORIG.speed;
		FUEL_CONFIG.boost    = window._FUEL_CONFIG_ORIG.boost;
	  } catch(e) {
		console.warn('Rocket-mode: Fehler beim Wiederherstellen des FUEL_CONFIG', e);
	  }
	  window._FUEL_CONFIG_ORIG = null;
	}

	// optional: RANGE_KM override entfernen, falls gesetzt
	if (typeof window._RANGE_KM_OVERRIDE !== 'undefined') {
	  window._RANGE_KM_OVERRIDE = undefined;
	}

	
      if (window._rocketInterval) { clearInterval(window._rocketInterval); window._rocketInterval = null; }

      if (window._GEARS_ORIG) {
        Object.keys(window._GEARS_ORIG).forEach(k => { GEARS[k] = window._GEARS_ORIG[k]; });
        window._GEARS_ORIG = null;
      }

      if (typeof window._ACCEL_ORIG !== 'undefined') { ACCEL = window._ACCEL_ORIG; window._ACCEL_ORIG = undefined; }
      if (typeof window._BRAKE_DECEL_ORIG !== 'undefined') { BRAKE_DECEL = window._BRAKE_DECEL_ORIG; window._BRAKE_DECEL_ORIG = undefined; }
      if (typeof window._BOOST_ACCEL_MULT_ORIG !== 'undefined') { BOOST_ACCEL_MULT = window._BOOST_ACCEL_MULT_ORIG; window._BOOST_ACCEL_MULT_ORIG = undefined; }

      if (typeof window._ZOOM_MIN_ORIG !== 'undefined') {
        try { ZOOM_MIN = window._ZOOM_MIN_ORIG; } catch(e){}
        try { if (typeof map.setMinZoom === 'function') map.setMinZoom(window._MAP_MINZOOM_ORIG); } catch(e){}
        window._ZOOM_MIN_ORIG = undefined;
        window._MAP_MINZOOM_ORIG = undefined;
      }

      window._rocketModeActive = false;
      if (typeof flashMessage === 'function') flashMessage('Rocket-Mode deaktiviert — Werte wiederhergestellt');
      else alert('Rocket-Mode deaktiviert — Werte wiederhergestellt');
      return;
    }

    // === Aktivieren: Originalwerte sichern ===
    window._rocketModeActive = true;
	window._disableBoost = true;      // Boost sperren
    window._GEARS_ORIG = Object.assign({}, GEARS);
    window._ACCEL_ORIG = (typeof ACCEL !== 'undefined') ? ACCEL : null;
    window._BRAKE_DECEL_ORIG = (typeof BRAKE_DECEL !== 'undefined') ? BRAKE_DECEL : null;
    window._BOOST_ACCEL_MULT_ORIG = (typeof BOOST_ACCEL_MULT !== 'undefined') ? BOOST_ACCEL_MULT : null;
    window._ZOOM_MIN_ORIG = (typeof ZOOM_MIN !== 'undefined') ? ZOOM_MIN : null;
    window._MAP_MINZOOM_ORIG = map.options && typeof map.options.minZoom !== 'undefined' ? map.options.minZoom : null;
	
	alert("🚀 I'm the rocketman!");
	
    // Erlaube extremes Hinauszoomen
    try { ZOOM_MIN = 0; } catch(e){ /* falls noch const */ }
    try { if (typeof map.setMinZoom === 'function') map.setMinZoom(0); } catch(e){}

    // ---------- EXTREM-TUNING (du wolltest "viel viel viel stärker") ----------
    // factorPerLevel: Basiswachstum pro Zoom-Level (größer = schneller)
    const factorPerLevel = 2.0;   // sehr stark (3x pro Level)
    // Exponenten: wie stark ACCEL/BRAKE skaliert werden relativ zur Speed-Multiplikation
    const accelExponent = 5.0;    // Beschleunigung ~ mult^5  (extrem)
    const brakeExponent = 10.0;   // Bremsen ~ mult^10    (noch extremer, damit stoppbar)
    const boostAccelExponent = 1.0; // Boost-Multiplikator moderat skalieren

    // Caps: verhindert numerische Überläufe / völlig unspielbare Werte.
    // Du kannst diese sehr großzügig erhöhen/senken.
    const MAX_ACCEL_MULT = 1e8;   // maximaler Faktor gegenüber original ACCEL
    const MAX_BRAKE_MULT = 1e12;  // maximaler Faktor gegenüber original BRAKE_DECEL
    const MAX_GEAR_MULT = 1e6;    // maximaler Faktor für GEARS

    const originalMinZoom = (typeof window._ZOOM_MIN_ORIG === 'number') ? window._ZOOM_MIN_ORIG : 15;

// innerhalb von 'imtherocketman' — vor dem Start des rocketInterval (oder in der Aktivierungs-Phase)
try {
  // --- Treibstoff: sehr langsamer Verbrauch (einfacher "großer Tank") ---
  if (typeof FUEL_CONFIG !== 'undefined') {
    // sichere Originalwerte (deep copy der Zahlen)
    window._FUEL_CONFIG_ORIG = {
      base: typeof FUEL_CONFIG.base === 'number' ? FUEL_CONFIG.base : 0.1,
      throttle: typeof FUEL_CONFIG.throttle === 'number' ? FUEL_CONFIG.throttle : 0.18,
      speed: typeof FUEL_CONFIG.speed === 'number' ? FUEL_CONFIG.speed : 0.002,
      boost: typeof FUEL_CONFIG.boost === 'number' ? FUEL_CONFIG.boost : 0.0
    };

    // extrem kleinen Verbrauch setzen (je kleiner = länger hält der Tank)
    // Feinjustierbar: z.B. 1e-4 bis 1e-7 — je kleiner, desto länger
    const consumptionScale = 1e-6; // << sehr, sehr langsam verbrauchend

    FUEL_CONFIG.base     = window._FUEL_CONFIG_ORIG.base     * consumptionScale;
    FUEL_CONFIG.throttle = window._FUEL_CONFIG_ORIG.throttle * consumptionScale;
    FUEL_CONFIG.speed    = window._FUEL_CONFIG_ORIG.speed    * consumptionScale;
    FUEL_CONFIG.boost    = window._FUEL_CONFIG_ORIG.boost    * consumptionScale;
  }

  // Falls du die "Reichweite" im HUD deutlich größer erscheinen lassen willst (optional),
  // kannst du hier zusätzlich ein Override-Flag setzen, das updateFuelHUD nutzt (falls du die HUD-Funktion anpasst).
  // window._RANGE_KM_OVERRIDE = (typeof RANGE_KM === 'number') ? RANGE_KM * 1000 : 50000;

  // Fülle den Tank sofort auf 100% (so startest du mit vollem „Mega-Tank“)
  if (typeof fuel !== 'undefined') {
    fuel = 100;
    outOfFuel = false;
    if (typeof updateFuelHUD === 'function') updateFuelHUD();
  }
} catch (e) {
  console.warn('Rocket-mode: Fehler beim Anpassen des Treibstoffs', e);
}


    // Interval: passt GEARS, ACCEL, BRAKE_DECEL, BOOST_ACCEL_MULT an
    window._rocketInterval = setInterval(() => {
      try {
        const curZoom = (typeof map.getZoom === 'function') ? map.getZoom() : originalMinZoom;
        const levelsOut = Math.max(0, Math.round(originalMinZoom - curZoom));

        // extrem schneller Wachstumsfaktor
        const mult = Math.pow(factorPerLevel, levelsOut);

        // --- GEARS: maxspeed pro Gang (gerundet), mit Cap ---
        Object.keys(window._GEARS_ORIG).forEach(k => {
          const val = window._GEARS_ORIG[k];
          if (typeof val === 'number') {
            const scaled = val * Math.min(Math.pow(mult, 1), MAX_GEAR_MULT); // gear linear zu mult, capped
            GEARS[k] = Math.max(1, Math.round(scaled));
          }
        });

        // --- ACCEL: VIEL stärker (exponentiell) ---
        if (typeof window._ACCEL_ORIG === 'number') {
          const accelScale = Math.pow(mult, accelExponent);
          const accelScaleCapped = Math.min(accelScale, MAX_ACCEL_MULT);
          ACCEL = window._ACCEL_ORIG * accelScaleCapped;
        }

        // --- BRAKE_DECEL: NOCH viel stärker (exponentiell) ---
        if (typeof window._BRAKE_DECEL_ORIG === 'number') {
          const brakeScale = Math.pow(mult, brakeExponent);
          const brakeScaleCapped = Math.min(brakeScale, MAX_BRAKE_MULT);
          BRAKE_DECEL = window._BRAKE_DECEL_ORIG * brakeScaleCapped;
        }

        // --- BOOST_ACCEL_MULT: moderat skalieren, aber cappen ---
        if (typeof window._BOOST_ACCEL_MULT_ORIG === 'number') {
          const bScale = Math.pow(mult, boostAccelExponent);
          BOOST_ACCEL_MULT = Math.min(window._BOOST_ACCEL_MULT_ORIG * bScale, 1e6);
        }

        // optional: update sichtbares MaxSpeed im HUD (schnellere Darstellung)
        try { document.getElementById('maxSpeed').textContent = Math.round(GEARS[currentGear] || 0); } catch(e){}

      } catch (err) {
        // ignore transient errors
        console.debug('rocket tick error', err);
      }
    }, 60); // schneller Tick für reaktive Anpassung

    if (typeof flashMessage === 'function') flashMessage('ROCKET MODE: ON — extreme Beschleunigung & SUPER-Bremsen!');
    else alert('ROCKET MODE: ON — extreme Beschleunigung & SUPER-Bremsen!');

  } catch (err) {
    console.error('imtherocketman error', err);
    alert('Fehler beim Aktivieren von Rocket-Mode: ' + (err && err.message ? err.message : err));
  }
},

'portals': () => {

const presetJson = {
      "created": "2025-09-25T19:34:29.048Z",
      "state": {
        "--map-hue": { "value": "314", "suffix": "deg" },
        "--map-sat": { "value": "1.5", "suffix": "" },
        "--map-contrast": { "value": "0.8", "suffix": "" },
        "--map-bright": { "value": "1.1", "suffix": "" },
        "--map-invert": { "value": "1", "suffix": "" },
        "--map-sepia": { "value": "0", "suffix": "" },
        "--map-gray": { "value": "0", "suffix": "" },
        "--map-blur": { "value": "0", "suffix": "px" },
        "--map-shadow-x": { "value": "0", "suffix": "px" },
        "--map-shadow-y": { "value": "0", "suffix": "px" },
        "--map-shadow-blur": { "value": "0", "suffix": "px" },
        "--map-shadow-color": { "value": "#416fb4", "suffix": "" },
        "undefined": { "value": "", "suffix": "" }
      }
    };

    applyFilterFromJson(presetJson);

  try {
    createPortalPairs(); // erzeugt Paare lokal <-> Welt (fügt Marker hinzu)
    // speichere Flag, damit man Portale später leicht entfernen kann
    window._portalsEnabled = true;
  } catch (err) {
    console.error('portale cheat failed', err);
    alert('Fehler beim Aktivieren von portale: ' + (err && err.message ? err.message : err));
  }
  
  
 try {
    // cancel any scheduled next-quest
    if (window._nextQuestTimeout) { clearTimeout(window._nextQuestTimeout); window._nextQuestTimeout = null; }
    window._suppressNextQuest = true;

    // stop any game-over zoom/interval
    if (window._zoomEmergencyInterval) { clearInterval(window._zoomEmergencyInterval); window._zoomEmergencyInterval = null; }

    // stop and remove visual pulses/overlays for quests
    try { if (activeScenePulse) { activeScenePulse.stop(); activeScenePulse = null; } } catch(e){}
    try { if (activeHospitalPulse) { activeHospitalPulse.stop(); activeHospitalPulse = null; } } catch(e){}

    // clear quest data -> keine Quests mehr
    quests = [];
    currentQuestIndex = -1;
    currentQuest = null;
    questState = null;
	
	currentQuest = { location: { lat: heliPos.lat + 1, lng: heliPos.lng + 1 } };
	
	// statt showNavUI(false); -> zwinge Navi auf STARTPOS, aber behalte currentQuest (Boost bleibt aktiv)
if(typeof forceNavTo === 'function'){
  forceNavTo(STARTPOS);
} else {
  forcedNavTarget = STARTPOS;
  showNavUI(true);
}

	questState = 'toScene';

    // update UI
    updateCompletedBox(0, 0);
    const qb = document.getElementById('questBox');
    if (qb) qb.textContent = 'Keine Quests (Cheat aktiviert)';
    //showNavUI(false);
	qb.style.display = "none";
	document.getElementById("questContainer").style.display="none";

    // feedback
    if (typeof flashMessage === 'function') flashMessage('Cheat: Keine Quests mehr — enjoy! 🎉');
    else alert('Cheat: Keine Quests mehr — enjoy! 🎉');
  } catch (err) {
    console.error('nostress cheat failed', err);
    alert('Fehler beim Anwenden von "nostress": ' + (err && err.message ? err.message : err));
  }
},

'removeportals': () => {
  if(window._portals && Array.isArray(window._portals)){
    window._portals.forEach(p=>{
      try{ if(p.a && p.a.marker) p.a.marker.remove(); }catch(e){}
      try{ if(p.b && p.b.marker) p.b.marker.remove(); }catch(e){}
    });
  }
  window._portals = [];
  window._portalsEnabled = false;
  flashMessage('Portale entfernt');
},


// Farben 

'nightmap': () => {
  try {
	const presetJson = {
		"created": "2025-09-25T19:34:29.048Z",
		"state": {
		"--map-hue": { "value": "314", "suffix": "deg", "type": "range" },
		"--map-sat": { "value": "1.5", "suffix": "", "type": "range" },
		"--map-contrast": { "value": "0.8", "suffix": "", "type": "range" },
		"--map-bright": { "value": "1.1", "suffix": "", "type": "range" },
		"--map-invert": { "value": "1", "suffix": "", "type": "range" },
		"--map-sepia": { "value": "0", "suffix": "", "type": "range" },
		"--map-gray": { "value": "0", "suffix": "", "type": "range" },
		"--map-blur": { "value": "0", "suffix": "px", "type": "range" },
		"--map-shadow-x": { "value": "0", "suffix": "px", "type": "range" },
		"--map-shadow-y": { "value": "0", "suffix": "px", "type": "range" },
		"--map-shadow-blur": { "value": "0", "suffix": "px", "type": "range" },
		"--map-shadow-color": { "value": "#416fb4", "suffix": "", "type": "color" },
		"undefined": { "value": "", "suffix": "", "type": "file" }
		}
	};

	applyFilterFromJson(presetJson);
	
	} catch (err) {
		console.error('night error', err);
		alert('Fehler beim Aktivieren von Night-Mode: ' + (err && err.message ? err.message : err));
	}
},

'oldmap': () => {
  try {
	const presetJson = {
  "created": "2025-09-25T19:14:41.766Z",
  "state": {
    "--map-hue": {
      "value": "45",
      "suffix": "deg",
      "type": "range"
    },
    "--map-sat": {
      "value": "4",
      "suffix": "",
      "type": "range"
    },
    "--map-contrast": {
      "value": "0.8",
      "suffix": "",
      "type": "range"
    },
    "--map-bright": {
      "value": "0.7",
      "suffix": "",
      "type": "range"
    },
    "--map-invert": {
      "value": "0",
      "suffix": "",
      "type": "range"
    },
    "--map-sepia": {
      "value": "1",
      "suffix": "",
      "type": "range"
    },
    "--map-gray": {
      "value": "0",
      "suffix": "",
      "type": "range"
    },
    "--map-blur": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-x": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-y": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-blur": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-color": {
      "value": "#000000",
      "suffix": "",
      "type": "color"
    },
    "undefined": {
      "value": "",
      "suffix": "",
      "type": "file"
    }
  }
};

	applyFilterFromJson(presetJson);
	
	} catch (err) {
		console.error('night error', err);
		alert('Fehler beim Aktivieren von Night-Mode: ' + (err && err.message ? err.message : err));
	}
},

'wintermap': () => {
  try {
	const presetJson = {
  "created": "2025-09-25T20:26:18.956Z",
  "state": {
    "--map-hue": {
      "value": "128",
      "suffix": "deg",
      "type": "range"
    },
    "--map-sat": {
      "value": "0.9",
      "suffix": "",
      "type": "range"
    },
    "--map-contrast": {
      "value": "1",
      "suffix": "",
      "type": "range"
    },
    "--map-bright": {
      "value": "1",
      "suffix": "",
      "type": "range"
    },
    "--map-invert": {
      "value": "0",
      "suffix": "",
      "type": "range"
    },
    "--map-sepia": {
      "value": "0",
      "suffix": "",
      "type": "range"
    },
    "--map-gray": {
      "value": "0",
      "suffix": "",
      "type": "range"
    },
    "--map-blur": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-x": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-y": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-blur": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-color": {
      "value": "#000000",
      "suffix": "",
      "type": "color"
    },
    "undefined": {
      "value": "",
      "suffix": "",
      "type": "file"
    }
  }
};

	applyFilterFromJson(presetJson);
	
	} catch (err) {
		console.error('night error', err);
		alert('Fehler beim Aktivieren von Night-Mode: ' + (err && err.message ? err.message : err));
	}
},

'wearefogged': () => {
  try {
	const presetJson = {
  "created": "2025-09-25T20:45:46.630Z",
  "state": {
    "--map-hue": {
      "value": "0",
      "suffix": "deg",
      "type": "range"
    },
    "--map-sat": {
      "value": "0",
      "suffix": "",
      "type": "range"
    },
    "--map-contrast": {
      "value": "0.1",
      "suffix": "",
      "type": "range"
    },
    "--map-bright": {
      "value": "1.1",
      "suffix": "",
      "type": "range"
    },
    "--map-invert": {
      "value": "0",
      "suffix": "",
      "type": "range"
    },
    "--map-sepia": {
      "value": "0.1",
      "suffix": "",
      "type": "range"
    },
    "--map-gray": {
      "value": "0",
      "suffix": "",
      "type": "range"
    },
    "--map-blur": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-x": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-y": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-blur": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-color": {
      "value": "#000000",
      "suffix": "",
      "type": "color"
    },
    "undefined": {
      "value": "",
      "suffix": "",
      "type": "file"
    }
  }
};

	applyFilterFromJson(presetJson);
	
	} catch (err) {
		console.error('night error', err);
		alert('Fehler beim Aktivieren von Night-Mode: ' + (err && err.message ? err.message : err));
	}
},

'resetcolors': () => {
  try {
	const presetJson = {
  "created": "2025-09-25T19:58:57.202Z",
  "state": {
    "--map-hue": {
      "value": "0",
      "suffix": "deg",
      "type": "range"
    },
    "--map-sat": {
      "value": "1",
      "suffix": "",
      "type": "range"
    },
    "--map-contrast": {
      "value": "1",
      "suffix": "",
      "type": "range"
    },
    "--map-bright": {
      "value": "1",
      "suffix": "",
      "type": "range"
    },
    "--map-invert": {
      "value": "0",
      "suffix": "",
      "type": "range"
    },
    "--map-sepia": {
      "value": "0",
      "suffix": "",
      "type": "range"
    },
    "--map-gray": {
      "value": "0",
      "suffix": "",
      "type": "range"
    },
    "--map-blur": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-x": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-y": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-blur": {
      "value": "0",
      "suffix": "px",
      "type": "range"
    },
    "--map-shadow-color": {
      "value": "#000000",
      "suffix": "",
      "type": "color"
    },
    "undefined": {
      "value": "",
      "suffix": "",
      "type": "file"
    }
  }
};

	applyFilterFromJson(presetJson);
	
	} catch (err) {
		console.error('night error', err);
		alert('Fehler beim Aktivieren von Night-Mode: ' + (err && err.message ? err.message : err));
	}
},
  

} // end of cheats

  window.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const isForm = active && (active.tagName==='INPUT' || active.tagName==='TEXTAREA' || active.isContentEditable);
    if (isForm && active !== inputEl) return;

    if (e.key === '~'){ e.preventDefault(); toggleConsole(); }
    if (e.key === 'Escape' && consoleEl.style.display !== 'none'){ hideConsole(); }
  });

  function toggleConsole(){ (consoleEl.style.display==='none'||consoleEl.style.display==='') ? showConsole() : hideConsole(); }
  function showConsole(){ consoleEl.style.display='block'; inputEl.value=''; inputEl.focus(); setTimeout(()=> consoleEl.scrollTop=consoleEl.scrollHeight,0); }
  function hideConsole(){ consoleEl.style.display='none'; }

  inputEl.addEventListener('keydown', (e) => {
    if(e.key==='Enter'){ e.preventDefault();
      const raw=inputEl.value||''; const text=raw.trim();
      appendLog('> '+raw);
      if(text && cheats.hasOwnProperty(text.toLowerCase())) cheats[text.toLowerCase()]();
      else if(text) appendLog('[Unbekannter Befehl] '+text);
      inputEl.value=''; setTimeout(()=> consoleEl.scrollTop=consoleEl.scrollHeight,0);
    }
  });

  function appendLog(text){ const node=document.createElement('div'); node.textContent=text; logEl.appendChild(node); }
  hideConsole();
})();