// Datos iniciales de la promoción para la inicialización del localStorage
const DEFAULT_GRADUATES = [
  {
    id: "dali-huaman",
    code: "20210390D",
    name: "Dali Huamán",
    fullName: "Dali Huamán",
    email: "dali.huaman.c@uni.pe",
    phone: "956659290",
    birthday: "2002-05-15",
    role: "admin",
    profilePhoto: "",
    payments: [
      {
        id: "p1",
        phase: "adelanto",
        amount: 25.00,
        status: "aprobado",
        date: "2026-06-01",
        transactionId: "TX-1002938",
        receipt: "assets/qr_pago.jpg", // placeholder o imagen base64
        comments: "Pago de separación inicial de la productora."
      }
    ]
  },
  {
    id: "jorge-chavez",
    code: "20210001A",
    name: "Jorge Chávez",
    fullName: "Jorge Antonio Chávez",
    email: "jorge.chavez@uni.pe",
    phone: "987654321",
    birthday: "2001-08-20",
    role: "student",
    profilePhoto: "",
    payments: [
      {
        id: "p2",
        phase: "adelanto",
        amount: 25.00,
        status: "aprobado",
        date: "2026-06-02",
        transactionId: "TX-9988771",
        receipt: "",
        comments: "Adelanto cancelado."
      },
      {
        id: "p3",
        phase: "pago_50",
        amount: 260.00,
        status: "pendiente",
        date: "2026-06-08",
        transactionId: "TX-4433221",
        receipt: "",
        comments: "Pago del 50%."
      }
    ]
  },
  {
    id: "ana-lopez",
    code: "20210002B",
    name: "Ana López",
    fullName: "Ana María López Rivera",
    email: "ana.lopez@uni.pe",
    phone: "912345678",
    birthday: "2003-01-10",
    role: "student",
    profilePhoto: "",
    payments: []
  },
  {
    id: "carlos-mendoza",
    code: "20210003C",
    name: "Carlos Mendoza",
    fullName: "Carlos Eduardo Mendoza Ruiz",
    email: "carlos.mendoza@uni.pe",
    phone: "955667788",
    birthday: "2002-11-30",
    role: "student",
    profilePhoto: "",
    payments: [
      {
        id: "p4",
        phase: "adelanto",
        amount: 25.00,
        status: "pendiente",
        date: "2026-06-09",
        transactionId: "TX-8877665",
        receipt: "",
        comments: "Por favor revisar el adelanto."
      }
    ]
  },
  {
    id: "maria-rodriguez",
    code: "20210004D",
    name: "María Rodríguez",
    fullName: "María Fernanda Rodríguez",
    email: "maria.rodriguez@uni.pe",
    phone: "933445566",
    birthday: "2002-03-25",
    role: "student",
    profilePhoto: "",
    payments: [
      {
        id: "p5",
        phase: "adelanto",
        amount: 25.00,
        status: "aprobado",
        date: "2026-06-03",
        transactionId: "TX-5544332",
        receipt: "",
        comments: "Pago realizado temprano por Yape."
      }
    ]
  },
  {
    id: "luis-sanchez",
    code: "20210005E",
    name: "Luis Sánchez",
    fullName: "Luis Alberto Sánchez Medina",
    email: "luis.sanchez@uni.pe",
    phone: "922883377",
    birthday: "2001-09-12",
    role: "student",
    profilePhoto: "",
    payments: []
  }
];

const DEFAULT_PADRINOS = [
  { id: 1, name: "Por definir", label: "Primer Padrino" },
  { id: 2, name: "Por definir", label: "Segundo Padrino" },
  { id: 3, name: "Por definir", label: "Tercer Padrino" }
];

const DEFAULT_EPONYM = {
  name: "Por definir",
  description: "El epónimo es el personaje ilustre de la ingeniería o ciencia que dará nombre a nuestra promoción. Se elegirá por consenso en los próximos meses."
};

const DEFAULT_CONFIG = {
  totalCeremonia: 520.00,
  phases: {
    adelanto: { name: "Adelanto Inicial", amount: 25.00, enabled: true },
    pago_20: { name: "Pago 20%", pct: 0.20, enabled: false },
    pago_50: { name: "Pago 50%", pct: 0.50, enabled: false },
    pago_25: { name: "Pago 25%", pct: 0.25, enabled: false },
    pago_5: { name: "Pago 5%", pct: 0.05, enabled: false }
  },
  adminPassword: "fiee2026",
  producerName: "APG Producciones",
  eventDate: "2026-09-25",
  eventLocation: "Gran Teatro de la UNI"
};

// Inicialización del almacenamiento local (localStorage)
function initLocalStorage() {
  if (!localStorage.getItem("fiee_graduates")) {
    localStorage.setItem("fiee_graduates", JSON.stringify(DEFAULT_GRADUATES));
  } else {
    const graduates = JSON.parse(localStorage.getItem("fiee_graduates")) || [];
    const migrated = graduates.map((g, index) => ({
      ...g,
      code: g.code || (g.id === "dali-huaman" ? "20210390D" : `20210${String(index + 1).padStart(3, "0")}A`),
      email: g.id === "dali-huaman" ? "dali.huaman.c@uni.pe" : g.email,
      phone: g.id === "dali-huaman" ? "956659290" : g.phone,
      profilePhoto: g.profilePhoto || "",
      payments: g.payments || []
    }));
    localStorage.setItem("fiee_graduates", JSON.stringify(migrated));
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
    config.totalCeremonia = Number(config.totalCeremonia || DEFAULT_CONFIG.totalCeremonia);
    config.phases = {
      adelanto: { ...DEFAULT_CONFIG.phases.adelanto, ...(config.phases?.adelanto || {}) },
      pago_20: { ...DEFAULT_CONFIG.phases.pago_20, ...(config.phases?.pago_20 || {}) },
      pago_50: { ...DEFAULT_CONFIG.phases.pago_50, ...(config.phases?.pago_50 || {}) },
      pago_25: { ...DEFAULT_CONFIG.phases.pago_25, ...(config.phases?.pago_25 || {}) },
      pago_5: { ...DEFAULT_CONFIG.phases.pago_5, ...(config.phases?.pago_5 || {}) }
    };
    config.adminPassword = config.adminPassword || DEFAULT_CONFIG.adminPassword;
    config.producerName = config.producerName || DEFAULT_CONFIG.producerName;
    config.eventDate = config.eventDate || DEFAULT_CONFIG.eventDate;
    config.eventLocation = config.eventLocation || DEFAULT_CONFIG.eventLocation;
    localStorage.setItem("fiee_config", JSON.stringify(config));
  }
}

// Ejecutar inicialización
initLocalStorage();
