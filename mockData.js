// Datos iniciales de la promocion para la inicializacion del almacenamiento.
// La lista arranca vacia para que en GitHub Pages no aparezcan usuarios de prueba.
const DEFAULT_GRADUATES = [];

const DEFAULT_PADRINOS = [
  { id: 1, name: "Por definir", label: "Primer Padrino" },
  { id: 2, name: "Por definir", label: "Segundo Padrino" },
  { id: 3, name: "Por definir", label: "Tercer Padrino" }
];

const DEFAULT_EPONYM = {
  name: "Por definir",
  description: "El eponimo es el personaje ilustre de la ingenieria o ciencia que dara nombre a nuestra promocion. Se elegira por consenso en los proximos meses."
};

const DEFAULT_CONFIG = {
  totalCeremonia: 500.00,
  phases: {
    adelanto: { name: "Adelanto Inicial", amount: 25.00, enabled: true },
    pago_20: { name: "Firma de contrato 20%", pct: 0.20, amountOffset: 25.00, enabled: false },
    pago_50: { name: "Entrega de tarjetas 30%", pct: 0.30, enabled: false },
    pago_25: { name: "Previo a ceremonia 45%", pct: 0.45, enabled: false },
    pago_5: { name: "Entrega de anuarios y videos 5%", pct: 0.05, enabled: false }
  },
  adminPassword: "fiee2026",
  producerName: "PYB Producciones",
  eventDate: "2026-09-25",
  eventLocation: "Gran Teatro de la UNI"
};

window.DEFAULT_GRADUATES = DEFAULT_GRADUATES;
window.DEFAULT_PADRINOS = DEFAULT_PADRINOS;
window.DEFAULT_EPONYM = DEFAULT_EPONYM;
window.DEFAULT_CONFIG = DEFAULT_CONFIG;

function isFirebaseConfigured() {
  const apiKey = window.FIEE_FIREBASE_CONFIG?.apiKey || "";
  return Boolean(apiKey && !apiKey.includes("PEGAR_"));
}

// Inicializacion del almacenamiento local. Firebase lo usa como cache inmediata.
function initLocalStorage() {
  const seedVersion = localStorage.getItem("fiee_seed_version");
  const legacyDemoIds = new Set([
    "dali-huaman",
    "jorge-chavez",
    "ana-lopez",
    "carlos-mendoza",
    "maria-rodriguez",
    "luis-sanchez"
  ]);

  if (seedVersion !== "2" && isFirebaseConfigured()) {
    localStorage.setItem("fiee_graduates", JSON.stringify(DEFAULT_GRADUATES));
    localStorage.setItem("fiee_seed_version", "2");
  } else if (!localStorage.getItem("fiee_graduates")) {
    localStorage.setItem("fiee_graduates", JSON.stringify(DEFAULT_GRADUATES));
  } else {
    const graduates = JSON.parse(localStorage.getItem("fiee_graduates")) || [];
    const cleanedGraduates = graduates.filter((g) => !legacyDemoIds.has(g.id));
    const migrated = cleanedGraduates.map((g, index) => ({
      ...g,
      code: g.code || `20210${String(index + 1).padStart(3, "0")}A`,
      profilePhoto: g.profilePhoto || "",
      payments: g.payments || []
    }));
    localStorage.setItem("fiee_graduates", JSON.stringify(migrated));
    localStorage.setItem("fiee_seed_version", "2");
  }

  if (!localStorage.getItem("fiee_padrinos")) {
    localStorage.setItem("fiee_padrinos", JSON.stringify(DEFAULT_PADRINOS));
  }
  if (!localStorage.getItem("fiee_eponym")) {
    localStorage.setItem("fiee_eponym", JSON.stringify(DEFAULT_EPONYM));
  }
  if (!localStorage.getItem("fiee_config")) {
    localStorage.setItem("fiee_config", JSON.stringify(DEFAULT_CONFIG));
  } else {
    const config = JSON.parse(localStorage.getItem("fiee_config")) || {};
    const previousProducer = (config.producerName || "").toLowerCase();
    const isLegacyProducer = !previousProducer || previousProducer.includes("apg");
    config.totalCeremonia = isLegacyProducer ? DEFAULT_CONFIG.totalCeremonia : Number(config.totalCeremonia || DEFAULT_CONFIG.totalCeremonia);
    config.phases = {
      adelanto: { ...DEFAULT_CONFIG.phases.adelanto, ...(config.phases?.adelanto || {}) },
      pago_20: { ...DEFAULT_CONFIG.phases.pago_20, ...(config.phases?.pago_20 || {}) },
      pago_50: { ...DEFAULT_CONFIG.phases.pago_50, ...(config.phases?.pago_50 || {}) },
      pago_25: { ...DEFAULT_CONFIG.phases.pago_25, ...(config.phases?.pago_25 || {}) },
      pago_5: { ...DEFAULT_CONFIG.phases.pago_5, ...(config.phases?.pago_5 || {}) }
    };
    if (isLegacyProducer) {
      config.phases.pago_20 = { ...config.phases.pago_20, ...DEFAULT_CONFIG.phases.pago_20 };
      config.phases.pago_50 = { ...config.phases.pago_50, ...DEFAULT_CONFIG.phases.pago_50 };
      config.phases.pago_25 = { ...config.phases.pago_25, ...DEFAULT_CONFIG.phases.pago_25 };
      config.phases.pago_5 = { ...config.phases.pago_5, ...DEFAULT_CONFIG.phases.pago_5 };
    }
    config.adminPassword = config.adminPassword || DEFAULT_CONFIG.adminPassword;
    config.producerName = isLegacyProducer ? DEFAULT_CONFIG.producerName : config.producerName;
    config.eventDate = config.eventDate || DEFAULT_CONFIG.eventDate;
    config.eventLocation = config.eventLocation || DEFAULT_CONFIG.eventLocation;
    localStorage.setItem("fiee_config", JSON.stringify(config));
  }
}

initLocalStorage();

