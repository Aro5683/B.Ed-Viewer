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

/* GET ORDER LIST */
function getOrder(meta) {
  return new Promise((resolve) => {
    const req = meta.get("order");
    req.onsuccess = () => resolve(req.result || []);
  });
}

/* SAVE PDF WITH FIFO */
async function savePDF(url, blob) {

  const db = await openDB();
  const tx = db.transaction([STORE, META], "readwrite");

  const store = tx.objectStore(STORE);
  const meta = tx.objectStore(META);

  let order = await getOrder(meta);

  /* LIMIT (important for stability) */
  const MAX_FILES = 30;

  if (order.length >= MAX_FILES) {
    const oldest = order.shift(); // remove first
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

/* LOAD PDF (MAIN FUNCTION) */
async function loadPDF(url) {

  const cached = await getPDF(url);

  if (cached) {
    console.log("⚡ Loaded from cache");
    return URL.createObjectURL(cached);
  }

  console.log("🌐 Fetching PDF...");

  const response = await fetch(url);

  const blob = await response.blob();

  /* SAVE */
  await savePDF(url, blob);

  return URL.createObjectURL(blob);
}

const reader = response.body.getReader();
let received = 0;
const contentLength = +response.headers.get('Content-Length');

let chunks = [];

while(true){
  const {done, value} = await reader.read();
  if(done) break;

  chunks.push(value);
  received += value.length;

  let percent = Math.round((received / contentLength) * 100);
  document.getElementById("progressText").innerText = percent + "%";
}

const blob = new Blob(chunks);
