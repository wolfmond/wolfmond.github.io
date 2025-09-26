/* ----------------------
   Portale / Cheat "portale"
   Paste diesen Block:
   1) Die HELPER-Funktionen (generateLocalPortals, makePortalMarker, createPortalPairs, checkPortals)
      in einen Bereich mit anderen Hilfsfunktionen (z.B. direkt nach destinationPoint).
   2) Den 'portale' Eintrag in deiner cheats-Map (innerhalb const cheats = { ... }).
   3) In animate(): rufe checkPortals() auf, idealerweise kurz bevor checkQuestProgress() läuft.
   ---------------------- */

/* ====== Konstanten / state (füge oben bei anderen Konstanten ein) ====== */
const PORTAL_LOCAL_COUNT = 5;            // wie viele Portale lokal erzeugt werden
const LOCAL_PORTAL_GEN_RADIUS = 2000;    // Radius (m) um STARTPOS, in dem lokale Portale erzeugt werden
const PORTAL_MIN_DISTANCE = 800;         // Mindestabstand zwischen lokalen Portalen (m)
const PORTAL_TRIGGER_M = 40;             // Abstand (m) zum Auslösen / "Berühren"
const PORTAL_EJECT_DISTANCE = 100;       // nach Ankunft 100 m wegspringen
const PORTAL_COOLDOWN_MS = 1200;         // Sperre nach Teleport (ms)
const PORTAL_VIS_RADIUS_M = 30;          // Darstellung (circle radius in meters)

/* Welt-Punkte (Grönland, USA, Frankreich, Italien, Indien) */
const WORLD_PORTAL_POINTS = [
  [39.8283, -98.5795],   // USA (contin. center)
  [46.2276, 2.2137],     // Frankreich (centroid)
  [41.8719, 12.5674],    // Italien (centroid)
  [20.5937, 78.9629]     // Indien (centroid)
];

const PORTAL_FADE_MS = 5000; // 3s pro Phase

function wait(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Startet die Fade -> Teleport -> Unfade Sequenz.
 * newPosObj: ein Objekt wie { lat: ..., lng: ... } (toLatLngObj kompatibel)
 * bearing: heading nach Ankunft (deg)
 *
 * Die Funktion sorgt selbst dafür, dass nicht mehrere Teleports parallel laufen (window._portalTeleporting).
 */
async function startPortalTransition(newPosObj, bearing){
  if(window._portalTeleporting) return; // already running
  window._portalTeleporting = true;

  try{
    // 1) Steuerung sperren
    controlsDisabled = true;

    // 2) fade-in (zu schwarz)
    const overlay = document.getElementById('fadeOverlay');
    if(overlay) overlay.classList.add('active');

    // warte bis Fade-in komplett (2.5s)
    await wait(PORTAL_FADE_MS);

    // 3) Teleport durchführen (während schwarz)
    try {
      const newObj = toLatLngObj(newPosObj);
      if(newObj){
        heliPos = L.latLng(newObj.lat, newObj.lng);
        try { map.panTo(heliPos, { animate:false }); } catch(e){}
        headingDeg = bearing;
        speed = Math.min(Math.max(8, Math.abs(speed)), 18);
        window._portalBounceUntil = (performance.now()/1000) + 1.2;
      }
    } catch (err){
      console.warn('startPortalTransition: teleport failed', err);
    }
    flashMessage('Wurmlöcherschub! ✨');

    // 4) fade-out (von schwarz weg)
    if(overlay) overlay.classList.remove('active');
    await wait(PORTAL_FADE_MS);

  } finally {
    // 5) Steuerung wieder freigeben
    controlsDisabled = false;
    window._portalTeleporting = false;
  }
}
// -------------------------------------------------------------------------


/* ====== kleine Hilfsfunktionen (verwenden vorhandene destinationPoint / distanceMetersBetween) ====== */
function randomPointAroundLatLng(centerLatLng, maxRadiusMeters){
  // einfacher Zufallspunkt: zufällige Distanz + Bearing
  const b = Math.random() * 360;
  const r = Math.random() * maxRadiusMeters;
  return destinationPoint(centerLatLng[0], centerLatLng[1], r, b);
}

function makePortalMarker(latlng, label, color = '#0b8cff'){
  // inner first
  const inner = L.circleMarker(latlng, {
    radius: PORTAL_VIS_RADIUS_M,
    className: 'portal-inner',
    interactive: false
  }).addTo(map);

  const outer = L.circleMarker(latlng, {
    radius: PORTAL_VIS_RADIUS_M * 0.95,
    className: 'portal-outer',
    interactive: false
  }).addTo(map);

  outer.bindTooltip(label, { permanent: false, direction: 'top' });

  if(color){
    inner.setStyle({ fillColor: color, fillOpacity: 0.55, stroke: false });
  }

  return {
    outer, inner,
    remove(){ try{ outer.remove(); }catch(e){} try{ inner.remove(); }catch(e){} }
  };
}



function generateLocalPortals(center, count, radiusMeters, minDistMeters){
  // center kann Array oder L.LatLng sein
  const centerObj = toLatLngObj(center);
  if(!centerObj) return [];

  const arr = [];
  let attempts = 0;
  while(arr.length < count && attempts < count * 2000){
    const bearing = Math.random() * 360;
    const r = Math.random() * radiusMeters;
    const cand = destinationPoint(centerObj.lat, centerObj.lng, r, bearing); // returns L.latLng
    // sicherstellen, dass punkt gültig ist
    const candObj = toLatLngObj(cand);
    if(!candObj){ attempts++; continue; }

    let ok = true;
    for(const p of arr){
      if(distanceMetersBetween(candObj, p) < minDistMeters){ ok = false; break; }
    }
    if(ok) arr.push(candObj);
    attempts++;
  }
  return arr; // array of L.latLng-like objects
}

/* Das zentrale: Paare anlegen (lokal ↔ welt) */
function createPortalPairs(){
  // vorh. Portale entfernen
  if(window._portals && Array.isArray(window._portals)){
    window._portals.forEach(p=>{
      try{ if(p.a && p.a.marker) p.a.marker.remove(); }catch(e){}
      try{ if(p.b && p.b.marker) p.b.marker.remove(); }catch(e){}
    });
  }
  window._portals = [];

  // local erzeugen (STARTPOS muss existieren)
  const localPoints = generateLocalPortals(STARTPOS, PORTAL_LOCAL_COUNT, LOCAL_PORTAL_GEN_RADIUS, PORTAL_MIN_DISTANCE);

  // nimm so viele Weltpunkte wie lokalPoints (falls weniger Weltpunkte vorhanden sind, werden nur so viele Paare erstellt)
  const worldPoints = WORLD_PORTAL_POINTS.slice(0, Math.min(localPoints.length, WORLD_PORTAL_POINTS.length));

  const pairCount = Math.min(localPoints.length, worldPoints.length);
  if(pairCount === 0){
    flashMessage('Keine Portale erzeugt (zu wenige Punkte).');
    return;
  }

  for(let i=0;i<pairCount;i++){
    const aObj = toLatLngObj(localPoints[i]);
    const bObj = toLatLngObj(worldPoints[i]);

    if(!aObj || !bObj) continue;

    // Stelle sicher, dass wir L.LatLng-Objekte im Portal haben
    const aLatLng = L.latLng(aObj.lat, aObj.lng);
    const bLatLng = L.latLng(bObj.lat, bObj.lng);

    const ma = makePortalMarker(aLatLng, `Portal ${i+1} (A)`);
    const mb = makePortalMarker(bLatLng, `Portal ${i+1} (B)`, '#b41414');

    window._portals.push({
      id: 'portal-'+(i+1),
      a: { latlng: aLatLng, marker: ma },
      b: { latlng: bLatLng, marker: mb },
      _lastUsedA: 0,
      _lastUsedB: 0
    });
  }

  flashMessage(`Portale erzeugt: ${window._portals.length} Paare`);
}

/* checkPortals: wird in animate() aufgerufen */
function checkPortals(){
  if(!window._portals || !Array.isArray(window._portals)) return;
  const now = performance.now();

  for(const p of window._portals){
    if(!p) continue;
    // defensive: prüfen ob a und b vorhanden sind
    if(!p.a || !p.b) continue;

    const A = toLatLngObj(p.a.latlng);
    const B = toLatLngObj(p.b.latlng);
    if(!A || !B) continue;

    // A -> B
    if(now - (p._lastUsedA || 0) > PORTAL_COOLDOWN_MS){
      const dA = distanceMetersBetween(heliPos, A);
      if(dA <= PORTAL_TRIGGER_M){
        const bearing = Math.random() * 360;
        try {
          const newPos = destinationPoint(B.lat, B.lng, PORTAL_EJECT_DISTANCE, bearing);
          const newObj = toLatLngObj(newPos);
          if(newObj){
            // setze LastUsed direkt, damit nicht mehrfach getriggert wird
            p._lastUsedA = now;
            // starte die Fade/Teleport/Unfade-Sequenz (läuft asynchron)
            startPortalTransition(newObj, bearing);
            continue;
          }
        } catch (err){
          console.warn('Portal A->B teleport failed', err);
        }
      }
    }

    // B -> A
    if(now - (p._lastUsedB || 0) > PORTAL_COOLDOWN_MS){
      const dB = distanceMetersBetween(heliPos, B);
      if(dB <= PORTAL_TRIGGER_M){
        const bearing = Math.random() * 360;
        try {
          const newPos = destinationPoint(A.lat, A.lng, PORTAL_EJECT_DISTANCE, bearing);
          const newObj = toLatLngObj(newPos);
          if(newObj){
            p._lastUsedB = now;
            startPortalTransition(newObj, bearing);
            continue;
          }
        } catch (err){
          console.warn('Portal B->A teleport failed', err);
        }
      }
    }

  }
}
