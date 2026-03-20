const DB_NAME = "pdf-cache";
const STORE = "pdfs";
const META = "meta";

/* OPEN DATABASE */
function openDB() {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 2);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }

      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META);
      }
    };

    req.onsuccess = () => resolve(req.result);
  });
}

/* GET ORDER */
function getOrder(meta) {
  return new Promise((resolve) => {
    const req = meta.get("order");
    req.onsuccess = () => resolve(req.result || []);
  });
}

/* SAVE PDF (FIFO) */
async function savePDF(url, blob) {

  const db = await openDB();
  const tx = db.transaction([STORE, META], "readwrite");

  const store = tx.objectStore(STORE);
  const meta = tx.objectStore(META);

  let order = await getOrder(meta);

  const MAX_FILES = 30;

  if (order.length >= MAX_FILES) {
    const oldest = order.shift();
    store.delete(oldest);
  }

  store.put(blob, url);

  order.push(url);
  meta.put(order, "order");
}

/* GET PDF */
async function getPDF(url) {

  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");

  return new Promise((resolve) => {
    const req = tx.objectStore(STORE).get(url);
    req.onsuccess = () => resolve(req.result);
  });
}

/* LOAD PDF */
async function loadPDF(url) {

  const cached = await getPDF(url);

  /* ✅ OFFLINE CACHE */
  if (cached) {
    console.log("⚡ Loaded from cache");
    return URL.createObjectURL(cached);
  }

  /* ❌ NO INTERNET */
  if (!navigator.onLine) {
    document.getElementById("progressText").innerText = "Offline ❌";
    throw new Error("No internet");
  }

  console.log("🌐 Downloading...");

  const response = await fetch(url);

  const contentLength = +response.headers.get('Content-Length') || 0;

  const reader = response.body.getReader();

  let received = 0;
  let chunks = [];

  while (true) {

    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    received += value.length;

    /* PROGRESS UI */
    if (contentLength) {
      let percent = Math.round((received / contentLength) * 100);

      let el = document.getElementById("progressText");
      if (el) el.innerText = percent + "%";
    }

  }

  const blob = new Blob(chunks);

  await savePDF(url, blob);

  document.getElementById("progressText").innerText = "Saved Offline ✅";

  return URL.createObjectURL(blob);
}
