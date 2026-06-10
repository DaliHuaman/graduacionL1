/* ==========================================================================
   MAIN APPLICATION SCRIPT - APP.JS
   ========================================================================== */

// --- UTILERÍAS DE BASE DE DATOS (LOCALSTORAGE) ---
function getGraduates() {
  return JSON.parse(localStorage.getItem("fiee_graduates")) || [];
}

function saveGraduates(data) {
  localStorage.setItem("fiee_graduates", JSON.stringify(data));
  window.FIEE_DB?.saveGraduates(data).catch((err) => {
    console.error("No se pudo guardar graduados en Firebase:", err);
    showToast("No se pudo sincronizar con Firebase. Revisa la conexion o reglas.", "error");
  });
  // Disparar evento personalizado para actualizar paneles si es necesario
  window.dispatchEvent(new Event("db_update"));
}

function getConfig() {
  return JSON.parse(localStorage.getItem("fiee_config")) || {};
}

function saveConfig(data) {
  localStorage.setItem("fiee_config", JSON.stringify(data));
  window.FIEE_DB?.saveConfig(data).catch((err) => {
    console.error("No se pudo guardar configuracion en Firebase:", err);
    showToast("No se pudo sincronizar la configuracion con Firebase.", "error");
  });
  window.dispatchEvent(new Event("db_update"));
}

function getPadrinos() {
  return JSON.parse(localStorage.getItem("fiee_padrinos")) || [];
}

function savePadrinos(data) {
  localStorage.setItem("fiee_padrinos", JSON.stringify(data));
  window.FIEE_DB?.savePadrinos(data).catch((err) => {
    console.error("No se pudo guardar padrinos en Firebase:", err);
    showToast("No se pudo sincronizar padrinos con Firebase.", "error");
  });
  window.dispatchEvent(new Event("db_update"));
}

function getEponym() {
  return JSON.parse(localStorage.getItem("fiee_eponym")) || {};
}

function saveEponym(data) {
  localStorage.setItem("fiee_eponym", JSON.stringify(data));
  window.FIEE_DB?.saveEponym(data).catch((err) => {
    console.error("No se pudo guardar eponimo en Firebase:", err);
    showToast("No se pudo sincronizar el eponimo con Firebase.", "error");
  });
  window.dispatchEvent(new Event("db_update"));
}

// --- GESTIÓN DE SESIÓN DE USUARIO ---
let currentUser = null;

function normalizeUniCode(code) {
  return (code || "").trim().toUpperCase();
}

function isValidUniCode(code) {
  return /^[0-9]{8}[A-Z]$/.test(normalizeUniCode(code));
}

function isValidUniEmail(email) {
  return /^[^\s@]+@uni\.pe$/i.test((email || "").trim());
}

function makeGraduateId(code) {
  return `uni-${normalizeUniCode(code).toLowerCase()}`;
}

function isOwnerAccount(code, email) {
  return normalizeUniCode(code) === "20210390D" || (email || "").toLowerCase() === "dali.huaman.c@uni.pe";
}

function initSession() {
  const savedUserId = sessionStorage.getItem("fiee_current_user");
  const graduates = getGraduates();
  
  if (savedUserId) {
    currentUser = graduates.find(g => g.id === savedUserId) || null;
  }

  renderUserNavbarBadge();
}

function setCurrentUser(userId) {
  const graduates = getGraduates();
  const user = graduates.find(g => g.id === userId);
  if (user) {
    currentUser = user;
    sessionStorage.setItem("fiee_current_user", user.id);
    renderUserNavbarBadge();
    showToast(`Sesión cambiada a: ${user.name}`, "success");
    
    // Si estamos en el portal de pagos, refrescar vista
    if (window.location.hash === "#portal-pagos") {
      initPortalPagos();
    }
    // Si estamos en graduados, refrescar
    if (window.location.hash === "#graduados") {
      renderGraduatesList();
    }
    // Si es administrador y cambia a no admin, redirigir si está en #admin
    if (window.location.hash === "#admin" && currentUser.role !== "admin") {
      window.location.hash = "#inicio";
    }
    
    // Recargar la página de administración si está activa
    if (window.location.hash === "#admin") {
      window.dispatchEvent(new Event("admin_session_change"));
    }
  }
}

function logout() {
  sessionStorage.removeItem("fiee_current_user");
  sessionStorage.removeItem("fiee_admin_authenticated");
  currentUser = null;
  renderUserNavbarBadge();
  showToast("Sesión cerrada.", "info");
  window.location.hash = "#inicio";
}

// --- RENDERIZADO DE NAVBAR Y BADGES ---
function renderUserNavbarBadge() {
  const container = document.getElementById("user-navbar-status");
  if (!container) return;
  
  const adminNavItem = document.querySelector('nav a[href="#admin"]')?.closest("li");
  if (adminNavItem) {
    adminNavItem.style.display = currentUser?.role === "admin" ? "" : "none";
  }
  
  if (!currentUser) {
    container.innerHTML = `
      <button class="btn-portal-login" onclick="openLoginModal()">
        <i data-lucide="log-in"></i> Iniciar Sesión
      </button>
    `;
    lucide.createIcons();
    return;
  }
  
  container.innerHTML = `
    <div class="user-badge">
      <span class="user-badge-name">${currentUser.name || currentUser.code}</span>
      <span class="user-badge-role ${currentUser.role}">${currentUser.role === 'admin' ? 'Admin' : 'Estudiante'}</span>
      <button class="user-logout" onclick="logout()" title="Cerrar Sesión">
        <i data-lucide="log-out" style="width:16px; height:16px;"></i>
      </button>
    </div>
  `;
  lucide.createIcons();
}

function openLoginModal() {
  document.getElementById("login-modal")?.classList.add("active");
  setTimeout(() => document.getElementById("login-code")?.focus(), 50);
}

function closeLoginModal() {
  document.getElementById("login-modal")?.classList.remove("active");
  document.getElementById("login-form")?.reset();
}

function handleGraduateLogin(e) {
  e.preventDefault();
  const code = normalizeUniCode(document.getElementById("login-code")?.value);
  const email = (document.getElementById("login-email")?.value || "").trim().toLowerCase();

  if (!isValidUniCode(code)) {
    showToast("Ingresa un código UNI válido. Ejemplo: 20210390D.", "error");
    return;
  }

  if (!isValidUniEmail(email)) {
    showToast("El correo debe ser institucional y terminar en @uni.pe.", "error");
    return;
  }

  const graduates = getGraduates();
  let user = graduates.find(g => normalizeUniCode(g.code) === code || g.email.toLowerCase() === email);

  if (user && user.email.toLowerCase() !== email) {
    showToast("El código UNI ya está asociado a otro correo.", "error");
    return;
  }

  if (user && normalizeUniCode(user.code) !== code) {
    showToast("El correo UNI ya está asociado a otro código.", "error");
    return;
  }

  if (user && isOwnerAccount(code, email) && user.role !== "admin") {
    user.role = "admin";
    saveGraduates(graduates);
  }

  if (!user) {
    user = {
      id: makeGraduateId(code),
      code,
      name: email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      fullName: "",
      email,
      phone: "",
      birthday: "",
      role: isOwnerAccount(code, email) ? "admin" : "student",
      profilePhoto: "",
      payments: []
    };
    graduates.push(user);
    saveGraduates(graduates);
    showToast("Cuenta creada. Completa tus datos en Mi Portal.", "success");
  } else {
    showToast(`Bienvenido, ${user.name}.`, "success");
  }

  currentUser = user;
  sessionStorage.setItem("fiee_current_user", user.id);
  closeLoginModal();
  renderUserNavbarBadge();

  if (window.location.hash === "#portal-pagos") initPortalPagos();
  if (window.location.hash === "#graduados") renderGraduatesList();
}

// --- ENRUTADOR SIMPLE (SPA) ---
const pages = {
  inicio: document.getElementById("page-inicio"),
  proforma: document.getElementById("page-proforma"),
  graduados: document.getElementById("page-graduados"),
  "portal-pagos": document.getElementById("page-portal-pagos"),
  admin: document.getElementById("page-admin")
};

function router() {
  let hash = window.location.hash.substring(1) || "inicio";
  
  // Verificar si la página existe en nuestro mapeo, si no, ir a inicio
  if (!pages[hash]) {
    hash = "inicio";
    window.location.hash = "#inicio";
  }
  
  // Ocultar todas las páginas
  Object.keys(pages).forEach(key => {
    if (pages[key]) pages[key].classList.remove("active");
  });
  
  // Desactivar links activos en el nav
  document.querySelectorAll("nav ul li").forEach(li => li.classList.remove("active"));
  
  // Mostrar la página seleccionada y activar su link
  if (pages[hash]) {
    pages[hash].classList.add("active");
    const activeLink = document.querySelector(`nav a[href="#${hash}"]`);
    if (activeLink) {
      activeLink.parentElement.classList.add("active");
    }
  }
  
  // Inicialización específica de secciones
  if (hash === "graduados") {
    renderGraduatesList();
    renderHonorsList();
  } else if (hash === "portal-pagos") {
    initPortalPagos();
  } else if (hash === "admin") {
    if (typeof initAdminPanel === "function") {
      initAdminPanel();
    }
  }
  
  // Hacer scroll al inicio
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- NOTIFICACIONES TOAST ---
function showToast(message, type = "info") {
  const toast = document.getElementById("toast-notification");
  if (!toast) return;
  
  const iconContainer = toast.querySelector(".toast-icon");
  const msgContainer = toast.querySelector(".toast-message");
  
  // Limpiar clases previas
  iconContainer.className = "toast-icon " + type;
  
  // Poner icono correspondiente
  let iconName = "info";
  if (type === "success") iconName = "check-circle";
  if (type === "error") iconName = "alert-triangle";
  
  iconContainer.innerHTML = `<i data-lucide="${iconName}"></i>`;
  msgContainer.textContent = message;
  
  lucide.createIcons();
  
  // Mostrar toast animando desde abajo
  toast.classList.add("active");
  
  // Ocultar después de 4 segundos
  setTimeout(() => {
    toast.classList.remove("active");
  }, 4000);
}

// --- CONTADOR DINÁMICO (COUNTDOWN) ---
function startCountdown() {
  const config = getConfig();
  const targetDateStr = `${config.eventDate || '2026-09-25'}T18:00:00`; // 6:00 PM de la fecha asignada
  
  const timer = setInterval(() => {
    const targetDate = new Date(targetDateStr).getTime();
    const now = new Date().getTime();
    const difference = targetDate - now;
    
    const dSpan = document.getElementById("count-days");
    const hSpan = document.getElementById("count-hours");
    const mSpan = document.getElementById("count-minutes");
    const sSpan = document.getElementById("count-seconds");
    
    if (!dSpan) return; // Si salimos del dom, detener o ignorar
    
    if (difference <= 0) {
      clearInterval(timer);
      dSpan.textContent = "00";
      hSpan.textContent = "00";
      mSpan.textContent = "00";
      sSpan.textContent = "00";
      document.querySelector(".hero-subtitle").textContent = "¡LLEGÓ EL DÍA DE LA GRADUACIÓN!";
      return;
    }
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    dSpan.textContent = days.toString().padStart(2, "0");
    hSpan.textContent = hours.toString().padStart(2, "0");
    mSpan.textContent = minutes.toString().padStart(2, "0");
    sSpan.textContent = seconds.toString().padStart(2, "0");
  }, 1000);
}

// --- DETALLES DE PRODUCTORA DESDE MOCK / CONFIG ---
function renderProformaDetails() {
  const config = getConfig();
  const details = document.getElementById("proforma-details-summary");
  if (!details) return;
  
  // Rellenar dinámicamente algunos textos de la proforma
  document.getElementById("prod-name-lbl").textContent = config.producerName;
}

// --- RENDERIZADO DE GRADUADOS ---
function getGraduatePaymentStatus(grad, config) {
  if (!grad.payments || grad.payments.length === 0) return "nada";
  
  const approvedPayments = grad.payments.filter(p => p.status === "aprobado");
  const pendingPayments = grad.payments.filter(p => p.status === "pendiente");
  
  const hasApprovedAdelanto = approvedPayments.some(p => p.phase === "adelanto");
  
  // Calcular total requerido
  const totalRequired = config.totalCeremonia;
  const totalApprovedAmount = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
  
  if (totalApprovedAmount >= totalRequired) return "completo";
  if (hasApprovedAdelanto) return "adelanto";
  if (pendingPayments.length > 0) return "pendiente";
  
  return "nada";
}

function renderGraduatesList() {
  const grid = document.getElementById("graduates-grid");
  if (!grid) return;
  
  const graduates = getGraduates();
  const searchQuery = document.getElementById("search-grad-input")?.value.toLowerCase() || "";
  
  grid.innerHTML = "";
  
  const filtered = graduates.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery) || 
                          (g.fullName || "").toLowerCase().includes(searchQuery) ||
                          g.email.toLowerCase().includes(searchQuery) ||
                          (g.code || "").toLowerCase().includes(searchQuery);
    return matchesSearch;
  });
  
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="form-group span-2 text-center" style="grid-column: 1 / -1; padding: 3rem; color: var(--color-text-muted);">
        <i data-lucide="users-round" style="width:48px; height:48px; margin-bottom:1rem; opacity:0.5;"></i>
        <p>No se encontraron graduados que coincidan con la búsqueda.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }
  
  filtered.forEach(g => {
    const card = document.createElement("div");
    card.className = "graduate-card";
    card.onclick = () => openGraduateDetailModal(g.id);
    
    card.innerHTML = `
      <div class="graduate-card-pic">
        ${g.profilePhoto ? `<img src="${g.profilePhoto}" alt="${g.name}">` : `<i data-lucide="user"></i>`}
      </div>
      <div class="graduate-card-info">
        <h3 class="graduate-card-name">${g.name}</h3>
        <span class="graduate-card-code">${g.code || 'Código UNI pendiente'}</span>
        <span class="graduate-card-email">${g.email}</span>
        <p class="graduate-card-quote">${g.phone ? `Celular: ${g.phone}` : 'Datos de contacto por completar'}</p>
      </div>
    `;
    
    grid.appendChild(card);
  });
  
  lucide.createIcons();
}

// --- RENDERIZADO DE PADRINOS Y EPÓNIMO ---
function renderHonorsList() {
  const padrinos = getPadrinos();
  const eponym = getEponym();
  
  // Padrinos
  padrinos.forEach(p => {
    const nameEl = document.getElementById(`padrino-${p.id}-name`);
    if (nameEl) {
      nameEl.textContent = p.name;
      const cardEl = nameEl.closest(".honor-card");
      if (cardEl) {
        const picBox = cardEl.querySelector(".honor-pic-box");
        if (picBox) {
          if (p.photo) {
            picBox.innerHTML = `<img src="${p.photo}" alt="${p.name}">`;
          } else {
            picBox.innerHTML = `<i data-lucide="award"></i>`;
          }
        }
      }
    }
  });
  
  // Epónimo
  const eponymName = document.getElementById("eponym-name");
  const eponymDesc = document.getElementById("eponym-desc");
  if (eponymName) {
    eponymName.textContent = eponym.name;
    const eponymCard = eponymName.closest(".honor-card");
    if (eponymCard) {
      const picBox = eponymCard.querySelector(".honor-pic-box");
      if (picBox) {
        if (eponym.photo) {
          picBox.innerHTML = `<img src="${eponym.photo}" alt="${eponym.name}">`;
        } else {
          picBox.innerHTML = `<i data-lucide="landmark"></i>`;
        }
      }
    }
  }
  if (eponymDesc) eponymDesc.textContent = eponym.description;
  
  if (window.lucide) {
    lucide.createIcons();
  }
}

// --- MODALES: DETALLE DE GRADUADO ---
function openGraduateDetailModal(userId) {
  const graduates = getGraduates();
  const grad = graduates.find(g => g.id === userId);
  if (!grad) return;
  
  const modal = document.getElementById("graduate-detail-modal");
  if (!modal) return;
  
  const formattedBday = grad.birthday ? new Date(grad.birthday).toLocaleDateString("es-PE", { day: 'numeric', month: 'long' }) : "No especificado";
  
  modal.querySelector(".modal-title").textContent = `Perfil de Graduando`;
  
  const body = modal.querySelector(".modal-body");
  body.innerHTML = `
    <div class="grad-profile-view">
      <div class="grad-profile-pic-box">
        ${grad.profilePhoto ? `<img src="${grad.profilePhoto}" alt="${grad.name}">` : `<i data-lucide="user"></i>`}
      </div>
      <div class="grad-profile-details">
        <h3 class="grad-profile-name">${grad.name}</h3>
        <ul class="grad-detail-meta-list">
          <li class="grad-detail-meta-item"><strong>Código UNI:</strong> ${grad.code || 'No registrado'}</li>
          <li class="grad-detail-meta-item"><strong>Nombre Bordado (Estola):</strong> ${grad.fullName || 'No especificado'}</li>
          <li class="grad-detail-meta-item"><strong>Correo Institucional:</strong> ${grad.email}</li>
          <li class="grad-detail-meta-item"><strong>Teléfono:</strong> ${grad.phone || 'No registrado'}</li>
          <li class="grad-detail-meta-item"><strong>Cumpleaños:</strong> ${formattedBday}</li>
        </ul>
      </div>
    </div>
  `;
  
  modal.classList.add("active");
  lucide.createIcons();
}

function closeGraduateDetailModal() {
  document.getElementById("graduate-detail-modal")?.classList.remove("active");
}

// --- MODAL: AGREGAR GRADUADO ---
function openAddGraduateModal() {
  document.getElementById("add-graduate-modal")?.classList.add("active");
}

function closeAddGraduateModal() {
  document.getElementById("add-graduate-modal")?.classList.remove("active");
  document.getElementById("add-graduate-form")?.reset();
}

function submitNewGraduate(e) {
  e.preventDefault();
  const form = document.getElementById("add-graduate-form");
  if (!form) return;
  
  const graduates = getGraduates();
  const name = form["grad-name"].value.trim();
  const code = normalizeUniCode(form["grad-code"].value);
  const fullName = form["grad-fullname"].value.trim();
  const email = form["grad-email"].value.trim().toLowerCase();
  const phone = form["grad-phone"].value.trim();
  const birthday = form["grad-bday"].value;
  const role = form["grad-role"].value;
  
  // Validaciones básicas
  if (!name || !code || !email) {
    showToast("Por favor rellene los campos obligatorios.", "error");
    return;
  }

  if (!isValidUniCode(code)) {
    showToast("El código UNI debe tener el formato 20210390D.", "error");
    return;
  }

  if (!isValidUniEmail(email)) {
    showToast("El correo debe terminar en @uni.pe.", "error");
    return;
  }
  
  const id = makeGraduateId(code);
  
  // Verificar duplicado
  if (graduates.some(g => g.id === id || g.email.toLowerCase() === email || normalizeUniCode(g.code) === code)) {
    showToast("Ya existe un graduado con este código UNI o correo.", "error");
    return;
  }
  
  const newGrad = {
    id,
    code,
    name,
    fullName: fullName || name,
    email,
    phone,
    birthday,
    role,
    profilePhoto: "",
    payments: []
  };
  
  graduates.push(newGrad);
  saveGraduates(graduates);
  showToast(`Graduado ${name} registrado con éxito.`, "success");
  closeAddGraduateModal();
  renderGraduatesList();
  
  // Actualizar navbar por si el usuario se registró a sí mismo
  renderUserNavbarBadge();
}

// --- PORTAL DE PAGOS (GRADUADO) ---
let currentFileBase64 = "";

function initPortalPagos() {
  const graduates = getGraduates();
  const config = getConfig();
  
  const selector = document.getElementById("portal-user-select");
  const portalContent = document.getElementById("portal-active-view");
  const portalNoUser = document.getElementById("portal-no-user-view");
  
  if (!currentUser) {
    portalNoUser.style.display = "block";
    portalContent.style.display = "none";
    return;
  }
  
  portalNoUser.style.display = "none";
  portalContent.style.display = "grid";
  
  if (!currentUser.payments) currentUser.payments = [];

  // Cargar datos financieros del graduado logueado
  const totalDebido = config.totalCeremonia;
  const pagosAprobados = currentUser.payments.filter(p => p.status === "aprobado");
  const totalPagado = pagosAprobados.reduce((sum, p) => sum + p.amount, 0);
  const saldoPendiente = totalDebido - totalPagado;
  
  document.getElementById("portal-grad-name").textContent = currentUser.name;
  document.getElementById("portal-grad-email").textContent = currentUser.email;
  document.getElementById("portal-toast-status").textContent = "Paquete ceremonia APG";
  document.getElementById("portal-total-cost").textContent = `S/ ${totalDebido.toFixed(2)}`;
  document.getElementById("portal-total-paid").textContent = `S/ ${totalPagado.toFixed(2)}`;
  document.getElementById("portal-balance").textContent = `S/ ${saldoPendiente.toFixed(2)}`;
  
  // Renderizar la configuración del QR (QR del Admin)
  const qrImg = document.getElementById("portal-qr-image");
  if (qrImg) {
    qrImg.src = "assets/qr_pago.jpg"; // Copiado de QR-DALI
  }
  
  // Cargar selector de fases habilitadas
  const phaseSelect = document.getElementById("payment-phase-select");
  if (phaseSelect) {
    phaseSelect.innerHTML = "";
    
    // Validar qué fase tiene sentido pagar.
    // 1. Adelanto S/ 25:
    if (config.phases.adelanto.enabled) {
      const yaPagoAdelanto = currentUser.payments.some(p => p.phase === "adelanto" && (p.status === "aprobado" || p.status === "pendiente"));
      if (!yaPagoAdelanto) {
        phaseSelect.innerHTML += `<option value="adelanto">Fase 1: Adelanto Inicial (S/ 25.00)</option>`;
      }
    }
    
    // 2. Pago 20%
    if (config.phases.pago_20?.enabled) {
      const yaPago20 = currentUser.payments.some(p => p.phase === "pago_20" && (p.status === "aprobado" || p.status === "pendiente"));
      if (!yaPago20) {
        const monto20 = totalDebido * 0.20;
        phaseSelect.innerHTML += `<option value="pago_20">Fase 2: Pago 20% (S/ ${monto20.toFixed(2)})</option>`;
      }
    }
    
    // 3. Pago 50%
    if (config.phases.pago_50.enabled) {
      const yaPago50 = currentUser.payments.some(p => p.phase === "pago_50" && (p.status === "aprobado" || p.status === "pendiente"));
      if (!yaPago50) {
        const monto50 = totalDebido * 0.50;
        phaseSelect.innerHTML += `<option value="pago_50">Fase 3: Pago 50% (S/ ${monto50.toFixed(2)})</option>`;
      }
    }
    
    // 4. Pago 25%
    if (config.phases.pago_25.enabled) {
      const yaPago25 = currentUser.payments.some(p => p.phase === "pago_25" && (p.status === "aprobado" || p.status === "pendiente"));
      if (!yaPago25) {
        const monto25 = totalDebido * 0.25;
        phaseSelect.innerHTML += `<option value="pago_25">Fase 4: Pago 25% (S/ ${monto25.toFixed(2)})</option>`;
      }
    }
    
    // 5. Pago 5%
    if (config.phases.pago_5?.enabled) {
      const yaPago5 = currentUser.payments.some(p => p.phase === "pago_5" && (p.status === "aprobado" || p.status === "pendiente"));
      if (!yaPago5) {
        const monto5 = totalDebido * 0.05;
        phaseSelect.innerHTML += `<option value="pago_5">Fase 5: Pago 5% (S/ ${monto5.toFixed(2)})</option>`;
      }
    }
    
    if (phaseSelect.innerHTML === "") {
      phaseSelect.innerHTML = `<option value="" disabled selected>No hay fases de pago habilitadas o ya realizaste todos los pagos disponibles</option>`;
      document.getElementById("btn-submit-payment-btn").disabled = true;
    } else {
      document.getElementById("btn-submit-payment-btn").disabled = false;
      updatePaymentAmountField(); // Calcular el monto recomendado
    }
  }
  
  // Renderizar historial personal
  renderPersonalHistoryTable();
  
  // Cargar formulario de perfil (Edición)
  document.getElementById("edit-fullname").value = currentUser.fullName || currentUser.name;
  document.getElementById("edit-phone").value = currentUser.phone || "";
  document.getElementById("edit-bday").value = currentUser.birthday || "";
  const photoInput = document.getElementById("edit-photo");
  if (photoInput) photoInput.value = "";
}

function updatePaymentAmountField() {
  const phaseSelect = document.getElementById("payment-phase-select");
  const amountInput = document.getElementById("payment-amount-input");
  if (!phaseSelect || !amountInput) return;
  
  const phase = phaseSelect.value;
  const config = getConfig();
  const totalDebido = config.totalCeremonia;
  
  if (phase === "adelanto") {
    amountInput.value = 25.00;
  } else if (phase === "pago_20") {
    amountInput.value = (totalDebido * 0.20).toFixed(2);
  } else if (phase === "pago_50") {
    amountInput.value = (totalDebido * 0.50).toFixed(2);
  } else if (phase === "pago_25") {
    amountInput.value = (totalDebido * 0.25).toFixed(2);
  } else if (phase === "pago_5") {
    amountInput.value = (totalDebido * 0.05).toFixed(2);
  }
}

// Manejar carga de archivos para el recibo
function handleReceiptFileSelect(e) {
  const file = e.target.files[0];
  const preview = document.getElementById("receipt-file-preview");
  const previewImg = document.getElementById("receipt-preview-img");
  const areaText = document.getElementById("upload-area-text");
  
  if (!file) return;
  
  if (!file.type.startsWith("image/")) {
    showToast("Por favor, suba únicamente archivos de imagen (JPG, PNG).", "error");
    e.target.value = "";
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(event) {
    currentFileBase64 = event.target.result;
    previewImg.src = currentFileBase64;
    preview.style.display = "block";
    areaText.textContent = `Archivo cargado: ${file.name}`;
  };
  reader.readAsDataURL(file);
}

function submitPaymentReceipt(e) {
  e.preventDefault();
  if (!currentUser) return;
  
  const phaseSelect = document.getElementById("payment-phase-select");
  const amountInput = document.getElementById("payment-amount-input");
  
  const phase = phaseSelect.value;
  const amount = parseFloat(amountInput.value);
  
  if (!phase) {
    showToast("No hay una fase de pago válida seleccionada.", "error");
    return;
  }
  
  if (isNaN(amount) || amount <= 0) {
    showToast("Ingrese un monto de pago válido.", "error");
    return;
  }
  
  if (!currentFileBase64) {
    showToast("Debe subir una imagen del comprobante de pago.", "error");
    return;
  }
  
  const newPayment = {
    id: "pay-" + Date.now(),
    phase,
    amount,
    status: "pendiente",
    date: new Date().toISOString().split("T")[0],
    transactionId: "captura",
    receipt: currentFileBase64,
    comments: "Captura de comprobante subida por el graduado."
  };
  
  // Agregar al usuario actual en la base de datos de graduados
  const graduates = getGraduates();
  const index = graduates.findIndex(g => g.id === currentUser.id);
  
  if (index !== -1) {
    if (!graduates[index].payments) graduates[index].payments = [];
    graduates[index].payments.push(newPayment);
    saveGraduates(graduates);
    
    // Actualizar sesión actual localmente
    currentUser = graduates[index];
    
    showToast("Comprobante enviado con éxito. Esperando validación del tesorero.", "success");
    
    // Resetear formulario
    document.getElementById("payment-upload-form").reset();
    document.getElementById("receipt-file-preview").style.display = "none";
    document.getElementById("upload-area-text").textContent = "Arrastra la captura aquí o haz clic para buscar";
    currentFileBase64 = "";
    
    // Recargar interfaz
    initPortalPagos();
  }
}

function renderPersonalHistoryTable() {
  const tbody = document.getElementById("personal-history-tbody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  if (!currentUser.payments || currentUser.payments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center" style="color: var(--color-text-muted);">No tienes pagos registrados en el sistema.</td>
      </tr>
    `;
    return;
  }
  
  const config = getConfig();
  
  currentUser.payments.forEach(p => {
    let phaseName = p.phase;
    if (config.phases[p.phase]) {
      phaseName = config.phases[p.phase].name;
    }
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${phaseName}</strong></td>
      <td>S/ ${p.amount.toFixed(2)}</td>
      <td>${p.date}</td>
      <td>
        <span class="status-badge ${p.status}">${p.status}</span>
        ${p.status === 'rechazado' && p.rejectionReason ? `<span class="rejection-reason">Motivo: ${p.rejectionReason}</span>` : ''}
        ${p.receipt ? `<br><button class="btn-view-receipt" onclick="viewReceiptImage('${p.id}')">Ver Recibo</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function viewReceiptImage(paymentId) {
  const payment = currentUser.payments.find(p => p.id === paymentId);
  if (!payment || !payment.receipt) return;
  
  const modal = document.getElementById("receipt-viewer-modal");
  if (!modal) return;
  
  modal.querySelector(".modal-title").textContent = `Comprobante de Pago`;
  
  const body = modal.querySelector(".modal-body");
  body.innerHTML = `
    <div style="text-align:center; max-height:70vh; overflow:auto;">
      <img src="${payment.receipt}" style="max-width:100%; height:auto; border-radius:var(--border-radius-md);" alt="Recibo">
      <div style="margin-top:1rem; text-align:left; font-size:0.85rem; padding:1rem; background:rgba(255,255,255,0.02); border-radius:var(--border-radius-sm);">
        <p><strong>Monto:</strong> S/ ${payment.amount.toFixed(2)}</p>
        <p><strong>Operación:</strong> ${payment.transactionId}</p>
        <p><strong>Fecha Envío:</strong> ${payment.date}</p>
        <p><strong>Notas:</strong> ${payment.comments || 'Ninguna'}</p>
      </div>
    </div>
  `;
  
  modal.classList.add("active");
}

function closeReceiptViewerModal() {
  document.getElementById("receipt-viewer-modal")?.classList.remove("active");
}

// --- ACTUALIZACIÓN DE PERFIL DEL GRADUADO ---
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function submitProfileUpdate(e) {
  e.preventDefault();
  if (!currentUser) return;
  
  const fullName = document.getElementById("edit-fullname").value.trim();
  const phone = document.getElementById("edit-phone").value.trim();
  const birthday = document.getElementById("edit-bday").value;
  const photoFile = document.getElementById("edit-photo")?.files?.[0];
  
  if (!fullName) {
    showToast("El nombre completo para el bordado es obligatorio.", "error");
    return;
  }
  
  const graduates = getGraduates();
  const index = graduates.findIndex(g => g.id === currentUser.id);
  
  if (index !== -1) {
    graduates[index].fullName = fullName;
    graduates[index].phone = phone;
    graduates[index].birthday = birthday;
    if (photoFile) {
      if (!photoFile.type.startsWith("image/")) {
        showToast("La foto de perfil debe ser una imagen.", "error");
        return;
      }
      graduates[index].profilePhoto = await fileToBase64(photoFile);
    }
    
    saveGraduates(graduates);
    currentUser = graduates[index];
    
    showToast("Perfil de graduado actualizado correctamente.", "success");

    // Refrescar portal
    initPortalPagos();
    renderGraduatesList();
  }
}

// --- COPIAR INFORMACIÓN BANCARIA ---
function copyBankData(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("Copiado al portapapeles: " + text, "success");
  }).catch(err => {
    showToast("No se pudo copiar automáticamente.", "error");
  });
}

// --- ESCUCHAR ACTUALIZACIONES EXTERNAS (Sincronización Admin/App) ---
window.addEventListener("db_update", () => {
  // Cuando la base de datos local cambie desde el panel de admin, refrescar la sesión del usuario si cambia
  if (currentUser) {
    const graduates = getGraduates();
    const freshUser = graduates.find(g => g.id === currentUser.id);
    if (freshUser) {
      currentUser = freshUser;
    }
  }
  renderUserNavbarBadge();
  if (window.location.hash === "#graduados") {
    renderGraduatesList();
    renderHonorsList();
  }
  if (window.location.hash === "#portal-pagos") {
    initPortalPagos();
  }
});

// --- INICIALIZACIÓN GENERAL ---
document.addEventListener("DOMContentLoaded", () => {
  // Inicializar sesión
  initSession();
  
  // Configurar router y hash
  window.addEventListener("hashchange", router);
  router(); // Cargar la página inicial según el hash actual
  
  // Iniciar temporizador
  startCountdown();
  
  // Rellenar datos fijos de APG
  renderProformaDetails();
  
  // Vincular eventos de formulario
  document.getElementById("add-graduate-form")?.addEventListener("submit", submitNewGraduate);
  document.getElementById("login-form")?.addEventListener("submit", handleGraduateLogin);
  document.getElementById("payment-upload-form")?.addEventListener("submit", submitPaymentReceipt);
  document.getElementById("edit-profile-form")?.addEventListener("submit", submitProfileUpdate);
  
  // Manejo de drag and drop en área de carga
  const dragArea = document.getElementById("receipt-drag-area");
  const fileInput = document.getElementById("receipt-file-input");
  
  if (dragArea && fileInput) {
    dragArea.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleReceiptFileSelect);
    
    dragArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      dragArea.classList.add("dragover");
    });
    
    dragArea.addEventListener("dragleave", () => {
      dragArea.classList.remove("dragover");
    });
    
    dragArea.addEventListener("drop", (e) => {
      e.preventDefault();
      dragArea.classList.remove("dragover");
      
      const file = e.dataTransfer.files[0];
      if (file) {
        fileInput.files = e.dataTransfer.files;
        const event = { target: { files: e.dataTransfer.files } };
        handleReceiptFileSelect(event);
      }
    });
  }
});
