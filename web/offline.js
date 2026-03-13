const DB_NAME = "pdf-cache";
const STORE = "pdfs";

function openDB() {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
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
  const cached = await getPDF(url);

  if (cached) {
    return URL.createObjectURL(cached);
  }

  const res = await fetch(url);
  const blob = await res.blob();
  await savePDF(url, blob);

  return URL.createObjectURL(blob);
}
