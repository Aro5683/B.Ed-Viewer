const DB_NAME = "pdf-cache";
const STORE = "files";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePDF(url, blob) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(blob, url);
}

async function getPDF(url) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");
  return new Promise(resolve => {
    const req = tx.objectStore(STORE).get(url);
    req.onsuccess = () => resolve(req.result);
  });
}

async function loadPDF(url) {
  let cached = await getPDF(url);

  if (cached) {
    console.log("Loaded from cache");
    return URL.createObjectURL(cached);
  }

  const res = await fetch(url);
  const blob = await res.blob();
  await savePDF(url, blob);

  console.log("Downloaded and cached");
  return URL.createObjectURL(blob);
}
