const DB_NAME = "pdf-cache";
const STORE = "pdfs";
const META = "meta";

/* OPEN DB */
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

/* GET FIFO ORDER LIST */
function getMetaList(meta) {
  return new Promise((resolve) => {
    const req = meta.get("order");
    req.onsuccess = () => resolve(req.result || []);
  });
}

/* SAVE PDF (FIFO LOGIC) */
async function savePDF(url, blob) {
  const db = await openDB();
  const tx = db.transaction([STORE, META], "readwrite");

  const store = tx.objectStore(STORE);
  const meta = tx.objectStore(META);

  let list = await getMetaList(meta);

  try {
    /* TRY SAVE */
    store.put(blob, url);

    /* ADD TO ORDER */
    list.push(url);
    meta.put(list, "order");

  } catch (e) {

    console.warn("Storage full, applying FIFO delete...");

    if (list.length > 0) {

      /* REMOVE OLDEST */
      const oldest = list.shift();
      store.delete(oldest);

      /* SAVE UPDATED LIST */
      meta.put(list, "order");

      /* SAVE AGAIN */
      store.put(blob, url);

      list.push(url);
      meta.put(list, "order");
    }
  }
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

/* MAIN LOADER */
async function loadPDF(url) {

  /* CHECK CACHE */
  const cached = await getPDF(url);

  if (cached) {
    console.log("📦 Loaded from cache:", url);
    return URL.createObjectURL(cached);
  }

  /* DOWNLOAD */
  console.log("🌐 Fetching PDF:", url);

  const res = await fetch(url);
  const blob = await res.blob();

  /* SAVE WITH FIFO */
  await savePDF(url, blob);

  return URL.createObjectURL(blob);
}
