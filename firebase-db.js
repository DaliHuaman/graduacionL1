(function () {
  const config = window.FIEE_FIREBASE_CONFIG || {};
  const hasFirebaseConfig = Boolean(config.apiKey && !config.apiKey.includes("PEGAR_"));

  const notify = () => window.dispatchEvent(new Event("db_update"));
  const setCache = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const getCache = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (err) {
      return fallback;
    }
  };

  const offlineApi = {
    enabled: false,
    saveGraduates: async () => {},
    saveConfig: async () => {},
    savePadrinos: async () => {},
    saveEponym: async () => {}
  };

  if (!hasFirebaseConfig || !window.firebase?.firestore) {
    window.FIEE_DB = offlineApi;
    return;
  }

  firebase.initializeApp(config);
  const db = firebase.firestore();
  const graduatesRef = db.collection("graduates");
  const siteRef = db.collection("site").doc("settings");
  const padrinosRef = db.collection("site").doc("padrinos");
  const eponymRef = db.collection("site").doc("eponym");
  let remoteGraduateIds = new Set();

  async function ensureInitialDocs() {
    const [settingsSnap, padrinosSnap, eponymSnap] = await Promise.all([
      siteRef.get(),
      padrinosRef.get(),
      eponymRef.get()
    ]);

    if (!settingsSnap.exists && window.DEFAULT_CONFIG) {
      await siteRef.set(window.DEFAULT_CONFIG);
    }
    if (!padrinosSnap.exists && window.DEFAULT_PADRINOS) {
      await padrinosRef.set({ items: window.DEFAULT_PADRINOS });
    }
    if (!eponymSnap.exists && window.DEFAULT_EPONYM) {
      await eponymRef.set(window.DEFAULT_EPONYM);
    }
  }

  function listenToRemoteData() {
    graduatesRef.onSnapshot((snapshot) => {
      const graduates = [];
      remoteGraduateIds = new Set();
      snapshot.forEach((doc) => {
        remoteGraduateIds.add(doc.id);
        graduates.push({ id: doc.id, ...doc.data() });
      });
      graduates.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setCache("fiee_graduates", graduates);
      notify();
    }, (err) => {
      console.error("No se pudo sincronizar graduados con Firebase:", err);
    });

    siteRef.onSnapshot((doc) => {
      if (doc.exists) {
        setCache("fiee_config", { ...window.DEFAULT_CONFIG, ...doc.data() });
        notify();
      }
    });

    padrinosRef.onSnapshot((doc) => {
      if (doc.exists) {
        setCache("fiee_padrinos", doc.data().items || []);
        notify();
      }
    });

    eponymRef.onSnapshot((doc) => {
      if (doc.exists) {
        setCache("fiee_eponym", doc.data());
        notify();
      }
    });
  }

  window.FIEE_DB = {
    enabled: true,
    saveGraduates: async (graduates) => {
      const batch = db.batch();
      const nextIds = new Set();

      graduates.forEach((graduate) => {
        const id = graduate.id;
        if (!id) return;
        nextIds.add(id);
        batch.set(graduatesRef.doc(id), graduate, { merge: true });
      });

      remoteGraduateIds.forEach((id) => {
        if (!nextIds.has(id)) {
          batch.delete(graduatesRef.doc(id));
        }
      });

      await batch.commit();
    },
    saveConfig: async (data) => siteRef.set(data, { merge: true }),
    savePadrinos: async (data) => padrinosRef.set({ items: data }, { merge: true }),
    saveEponym: async (data) => eponymRef.set(data, { merge: true })
  };

  ensureInitialDocs()
    .then(listenToRemoteData)
    .catch((err) => {
      console.error("No se pudo iniciar Firebase:", err);
      window.FIEE_DB = offlineApi;
    });
})();
