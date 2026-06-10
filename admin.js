/* ==========================================================================
   ADMINISTRATOR DASHBOARD SCRIPT - ADMIN.JS
   ========================================================================== */

let isAdminAuthenticated = false;
let myChart1 = null;
let myChart2 = null;

// --- INICIALIZAR PANEL DE ADMINISTRACIÓN ---
function initAdminPanel() {
  isAdminAuthenticated = sessionStorage.getItem("fiee_admin_authenticated") === "true";
  
  const loginView = document.getElementById("admin-login-view");
  const dashboardView = document.getElementById("admin-dashboard-view");
  
  if (!loginView || !dashboardView) return;
  
  // Si el usuario actual de la app no es admin, no dejarlo pasar.
  if (!currentUser || currentUser.role !== "admin") {
    loginView.style.display = "block";
    dashboardView.style.display = "none";
    const userLabel = currentUser ? `<strong>${currentUser.name}</strong>` : "ninguna cuenta";
    loginView.innerHTML = `
      <div class="admin-login-card" style="border-color: var(--color-uni-crimson);">
        <div class="admin-login-icon"><i data-lucide="shield-alert"></i></div>
        <h3 class="admin-login-title">Acceso Denegado</h3>
        <p class="admin-login-desc">Tu sesión actual (${userLabel}) no tiene privilegios de administrador.</p>
        <button class="btn" onclick="window.location.hash='#inicio'">Volver al Inicio</button>
      </div>
    `;
    lucide.createIcons();
    return;
  }
  
  if (isAdminAuthenticated) {
    loginView.style.display = "none";
    dashboardView.style.display = "block";
    
    // Cargar toda la lógica del dashboard
    renderAdminMetrics();
    renderVerificationQueue();
    renderConfigPanel();
    renderGraduatesAdminList();
    renderHonorsAdminForm();
    setTimeout(drawCharts, 100); // Dar tiempo a que renderice el DOM
  } else {
    loginView.style.display = "block";
    dashboardView.style.display = "none";
    renderAdminLoginForm();
  }
}

// Escuchar cambios de sesión rápidos del header
window.addEventListener("admin_session_change", initAdminPanel);

// --- RENDERIZAR LOGIN FORM ---
function renderAdminLoginForm() {
  const loginView = document.getElementById("admin-login-view");
  if (!loginView) return;
  
  loginView.innerHTML = `
    <div class="admin-login-overlay">
      <div class="admin-login-card">
        <div class="admin-login-icon">
          <i data-lucide="lock"></i>
        </div>
        <h3 class="admin-login-title">Caja de la Promoción</h3>
        <p class="admin-login-desc">Ingresa la clave de administrador para verificar recibos, administrar graduados y configurar las fases de pago.</p>
        
        <form id="admin-login-form" onsubmit="handleAdminLogin(event)">
          <div class="form-group mb-2" style="text-align:left;">
            <label class="form-label" for="admin-pass">Contraseña de Acceso:</label>
            <input type="password" id="admin-pass" class="form-input" placeholder="Ingresa la clave de administrador" required autofocus>
          </div>
          <button type="submit" class="btn-admin-login">Autenticar Panel</button>
        </form>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function handleAdminLogin(e) {
  e.preventDefault();
  const passInput = document.getElementById("admin-pass");
  if (!passInput) return;
  
  const config = getConfig();
  const password = passInput.value;
  
  if (password === config.adminPassword) {
    sessionStorage.setItem("fiee_admin_authenticated", "true");
    isAdminAuthenticated = true;
    showToast("Autenticación exitosa. Bienvenido Tesorero.", "success");
    initAdminPanel();
  } else {
    showToast("Contraseña incorrecta. Inténtelo de nuevo.", "error");
    passInput.value = "";
    passInput.focus();
  }
}

// --- CALCULO Y RENDERIZADO DE METRICAS (KPIs) ---
function renderAdminMetrics() {
  const graduates = getGraduates();
  const config = getConfig();
  
  let totalRecaudado = 0;
  let totalPendienteVerif = 0;
  let totalEgresados = graduates.length;
  let pendientesValidacionCount = 0;
  
  graduates.forEach(g => {
    if (g.payments) {
      g.payments.forEach(p => {
        if (p.status === "aprobado") {
          totalRecaudado += p.amount;
        } else if (p.status === "pendiente") {
          totalPendienteVerif += p.amount;
          pendientesValidacionCount++;
        }
      });
    }
  });
  
  // Calcular presupuesto total esperado
  document.getElementById("metric-recaudado").textContent = `S/ ${totalRecaudado.toFixed(2)}`;
  document.getElementById("metric-pendiente-verif").textContent = `S/ ${totalPendienteVerif.toFixed(2)}`;
  document.getElementById("metric-graduados").textContent = totalEgresados;
  document.getElementById("metric-verificaciones").textContent = pendientesValidacionCount;
}

// --- RENDERIZAR BANDEJA DE COMPROBANTES PENDIENTES ---
function renderVerificationQueue() {
  const tbody = document.getElementById("admin-verification-tbody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  const graduates = getGraduates();
  const config = getConfig();
  let pendingPayments = [];
  
  graduates.forEach(g => {
    if (g.payments) {
      g.payments.forEach(p => {
        if (p.status === "pendiente") {
          pendingPayments.push({
            gradId: g.id,
            gradName: g.name,
            payment: p
          });
        }
      });
    }
  });
  
  if (pendingPayments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="color: var(--color-text-muted); padding: 2rem;">
          <i data-lucide="check-circle-2" style="width:32px; height:32px; color:#28a745; margin-bottom:0.5rem;"></i>
          <p>No hay pagos pendientes de verificación. ¡Buen trabajo!</p>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }
  
  pendingPayments.forEach(item => {
    let phaseName = item.payment.phase;
    if (config.phases[item.payment.phase]) {
      phaseName = config.phases[item.payment.phase].name;
    }
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.gradName}</strong></td>
      <td>${phaseName}</td>
      <td class="text-gold" style="font-weight:bold;">S/ ${item.payment.amount.toFixed(2)}</td>
      <td>
        ${item.payment.receipt ? `<button class="btn-view-receipt" onclick="openReceiptViewer('${item.gradId}', '${item.payment.id}')">Ver captura</button>` : '<span style="color:var(--color-text-muted);">Sin captura</span>'}
      </td>
      <td>${item.payment.date}</td>
      <td>
        <div class="admin-action-btn-group">
          <button class="btn-approve" onclick="approvePayment('${item.gradId}', '${item.payment.id}')">
            <i data-lucide="check" style="width:14px; height:14px; display:inline; vertical-align:middle;"></i> Aprobar
          </button>
          <button class="btn-reject-modal" onclick="openRejectionDialog('${item.gradId}', '${item.payment.id}')">
            <i data-lucide="x" style="width:14px; height:14px; display:inline; vertical-align:middle;"></i> Rechazar
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  lucide.createIcons();
}

function openReceiptViewer(gradId, paymentId) {
  const graduates = getGraduates();
  const grad = graduates.find(g => g.id === gradId);
  const payment = grad?.payments?.find(p => p.id === paymentId);
  const modal = document.getElementById("receipt-viewer-modal");
  if (!grad || !payment || !modal) return;

  modal.querySelector(".modal-title").textContent = `Comprobante de ${grad.name}`;
  modal.querySelector(".modal-body").innerHTML = `
    <div class="receipt-viewer-body">
      <div class="receipt-image-box ${payment.receipt ? '' : 'no-receipt'}">
        ${payment.receipt ? `<img src="${payment.receipt}" alt="Comprobante de pago">` : '<span>No se adjuntó captura.</span>'}
      </div>
      <div class="receipt-data-box">
        <p><strong>Fase:</strong> ${getConfig().phases[payment.phase]?.name || payment.phase}</p>
        <p><strong>Monto:</strong> S/ ${payment.amount.toFixed(2)}</p>
        <p><strong>Fecha:</strong> ${payment.date}</p>
        <p><strong>Estado:</strong> ${payment.status}</p>
      </div>
    </div>
  `;
  modal.classList.add("active");
}

function approvePayment(gradId, paymentId) {
  const graduates = getGraduates();
  const gIndex = graduates.findIndex(g => g.id === gradId);
  
  if (gIndex !== -1) {
    const pIndex = graduates[gIndex].payments.findIndex(p => p.id === paymentId);
    if (pIndex !== -1) {
      graduates[gIndex].payments[pIndex].status = "aprobado";
      saveGraduates(graduates);
      showToast(`Pago aprobado para ${graduates[gIndex].name}.`, "success");
      
      // Actualizar paneles
      initAdminPanel();
    }
  }
}

// Dialogo de Rechazo de Pagos
let activeRejectGradId = "";
let activeRejectPaymentId = "";

function openRejectionDialog(gradId, paymentId) {
  activeRejectGradId = gradId;
  activeRejectPaymentId = paymentId;
  
  const modal = document.getElementById("rejection-modal");
  if (!modal) return;
  
  const graduates = getGraduates();
  const grad = graduates.find(g => g.id === gradId);
  const pay = grad?.payments.find(p => p.id === paymentId);
  
  modal.querySelector(".modal-title").textContent = "Rechazar Comprobante";
  modal.querySelector(".modal-body").innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.25rem;">
      <p style="font-size:0.9rem; color:var(--color-text-secondary);">
        Estás rechazando el comprobante de <strong>S/ ${pay?.amount.toFixed(2)}</strong> de <strong>${grad?.name}</strong>.
      </p>
      
      <div style="background:#000; padding:0.5rem; text-align:center; border-radius:4px; max-height:200px; overflow:auto;">
        <img src="${pay?.receipt || 'assets/qr_pago.jpg'}" style="max-width:100%; max-height:100%; object-fit:contain;">
      </div>
      
      <div class="form-group">
        <label class="form-label" for="rejection-reason-input">Motivo de Rechazo (se mostrará al estudiante):</label>
        <textarea id="rejection-reason-input" class="form-input" style="min-height:80px; font-family:var(--font-body);" placeholder="Ej. El número de operación no coincide, o la captura está borrosa."></textarea>
      </div>
    </div>
  `;
  
  modal.classList.add("active");
}

function closeRejectionModal() {
  document.getElementById("rejection-modal")?.classList.remove("active");
  activeRejectGradId = "";
  activeRejectPaymentId = "";
}

function submitRejection() {
  const reasonInput = document.getElementById("rejection-reason-input");
  const reason = reasonInput?.value.trim() || "Comprobante inválido o borroso.";
  
  const graduates = getGraduates();
  const gIndex = graduates.findIndex(g => g.id === activeRejectGradId);
  
  if (gIndex !== -1) {
    const pIndex = graduates[gIndex].payments.findIndex(p => p.id === activeRejectPaymentId);
    if (pIndex !== -1) {
      graduates[gIndex].payments[pIndex].status = "rechazado";
      graduates[gIndex].payments[pIndex].rejectionReason = reason;
      saveGraduates(graduates);
      showToast(`Pago rechazado para ${graduates[gIndex].name}.`, "error");
      
      closeRejectionModal();
      initAdminPanel();
    }
  }
}

// --- RENDERIZAR CONFIGURACIÓN DE FASES DE PAGO ---
function renderConfigPanel() {
  const config = getConfig();
  const container = document.getElementById("admin-config-container");
  if (!container) return;
  
  container.innerHTML = `
    <div class="config-card-box">
      <h3 class="qr-title"><i data-lucide="settings"></i> Control de Fases</h3>
      <p style="font-size:0.8rem; color:var(--color-text-muted); margin-bottom:1.5rem;">Activa las fases de pago para que estén disponibles en el portal de los graduados.</p>
      
      <ul class="config-list">
        <li class="config-item-row">
          <div class="config-item-info">
            <h5>Adelanto Inicial (S/ 25.00)</h5>
            <p>Cobro para separar la productora APG.</p>
          </div>
          <div class="switch-box">
            <input type="checkbox" id="phase-toggle-adelanto" ${config.phases.adelanto.enabled ? 'checked' : ''} onchange="togglePhase('adelanto', this.checked)">
            <label class="switch-slider" for="phase-toggle-adelanto"></label>
          </div>
        </li>
        <li class="config-item-row">
          <div class="config-item-info">
            <h5>Pago 20%</h5>
            <p>Primera cuota posterior al adelanto.</p>
          </div>
          <div class="switch-box">
            <input type="checkbox" id="phase-toggle-pago_20" ${config.phases.pago_20.enabled ? 'checked' : ''} onchange="togglePhase('pago_20', this.checked)">
            <label class="switch-slider" for="phase-toggle-pago_20"></label>
          </div>
        </li>
        <li class="config-item-row">
          <div class="config-item-info">
            <h5>Pago 50%</h5>
            <p>Pago principal de acuerdo con la propuesta APG.</p>
          </div>
          <div class="switch-box">
            <input type="checkbox" id="phase-toggle-pago_50" ${config.phases.pago_50.enabled ? 'checked' : ''} onchange="togglePhase('pago_50', this.checked)">
            <label class="switch-slider" for="phase-toggle-pago_50"></label>
          </div>
        </li>
        <li class="config-item-row">
          <div class="config-item-info">
            <h5>Pago 25%</h5>
            <p>El día de la Ceremonia en el teatro.</p>
          </div>
          <div class="switch-box">
            <input type="checkbox" id="phase-toggle-pago_25" ${config.phases.pago_25.enabled ? 'checked' : ''} onchange="togglePhase('pago_25', this.checked)">
            <label class="switch-slider" for="phase-toggle-pago_25"></label>
          </div>
        </li>
        <li class="config-item-row">
          <div class="config-item-info">
            <h5>Pago 5%</h5>
            <p>A la entrega de los materiales y anuario.</p>
          </div>
          <div class="switch-box">
            <input type="checkbox" id="phase-toggle-pago_5" ${config.phases.pago_5.enabled ? 'checked' : ''} onchange="togglePhase('pago_5', this.checked)">
            <label class="switch-slider" for="phase-toggle-pago_5"></label>
          </div>
        </li>
      </ul>
      
      <div style="margin-top:2rem; border-top:1px solid var(--border-glass); padding-top:1rem;">
        <h5 style="font-family:var(--font-title); font-size:0.9rem; margin-bottom:1rem;">Costos Globales de la Promoción:</h5>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="cfg-cost-ceremonia">Costo Ceremonia (S/):</label>
            <input type="number" id="cfg-cost-ceremonia" class="form-input" value="${config.totalCeremonia}" onchange="updateGlobalCost('totalCeremonia', this.value)">
          </div>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function togglePhase(phaseKey, isEnabled) {
  const config = getConfig();
  if (config.phases[phaseKey]) {
    config.phases[phaseKey].enabled = isEnabled;
    saveConfig(config);
    showToast(`Fase de pago "${config.phases[phaseKey].name}" ${isEnabled ? 'HABILITADA' : 'DESHABILITADA'}.`, "info");
    
    // Si la fase se habilita, avisar
    if (isEnabled) {
      showToast("Los graduados ahora pueden subir comprobantes para esta fase.", "success");
    }
  }
}

function updateGlobalCost(key, value) {
  const valFloat = parseFloat(value);
  if (isNaN(valFloat) || valFloat < 0) {
    showToast("Monto inválido.", "error");
    return;
  }
  
  const config = getConfig();
  config[key] = valFloat;
  saveConfig(config);
  showToast("Costos actualizados. Se recalcularán los saldos en el portal de graduados.", "success");
}

// --- RENDERIZAR TABLA DE GESTIÓN DE GRADUADOS Y ROLES ---
function renderGraduatesAdminList() {
  const tbody = document.getElementById("admin-graduates-tbody");
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  const graduates = getGraduates();
  const config = getConfig();
  
  graduates.forEach(g => {
    const totalDebido = config.totalCeremonia;
    const pagosAprobados = g.payments ? g.payments.filter(p => p.status === "aprobado") : [];
    const totalPagado = pagosAprobados.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalDebido - totalPagado;
    
    const tr = document.createElement("tr");
    
    // Definir botones de acción de rol (Promover / Demote)
    let roleActionBtn = "";
    if (currentUser?.id !== "dali-huaman") {
      roleActionBtn = `<span style="font-size:0.75rem; color:var(--color-text-muted);">Solo admin supremo</span>`;
    } else if (g.id === "dali-huaman") {
      roleActionBtn = `<span style="font-size:0.75rem; color:var(--color-text-muted);">Admin Principal</span>`;
    } else {
      if (g.role === "admin") {
        roleActionBtn = `
          <button class="btn" style="padding:0.25rem 0.5rem; font-size:0.75rem; border-color:var(--color-uni-crimson); color:var(--color-uni-crimson-glow);" onclick="toggleUserRole('${g.id}', 'student')">
            Quitar Admin
          </button>
        `;
      } else {
        roleActionBtn = `
          <button class="btn" style="padding:0.25rem 0.5rem; font-size:0.75rem; border-color:var(--color-elec-blue); color:var(--color-elec-blue-glow);" onclick="toggleUserRole('${g.id}', 'admin')">
            Hacer Admin
          </button>
        `;
      }
    }
    
    tr.innerHTML = `
      <td><strong>${g.name}</strong></td>
      <td>
        <span class="user-badge-role ${g.role}">${g.role === 'admin' ? 'Admin' : 'Estudiante'}</span>
      </td>
      <td>${g.code || 'Sin código'}</td>
      <td class="text-blue">S/ ${totalPagado.toFixed(2)}</td>
      <td class="${balance <= 0 ? 'text-green' : 'text-gold'}" style="color: ${balance <= 0 ? '#28a745' : ''}">S/ ${balance.toFixed(2)}</td>
      <td>
        <div style="display:flex; gap:8px; align-items:center;">
          ${roleActionBtn}
          ${currentUser?.id === 'dali-huaman' && g.id !== 'dali-huaman' ? `
            <button class="btn-reject-modal" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="deleteGraduate('${g.id}')">
              Eliminar
            </button>
          ` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleUserRole(userId, newRole) {
  if (currentUser?.id !== "dali-huaman") {
    showToast("Solo el administrador supremo puede modificar roles.", "error");
    return;
  }

  const graduates = getGraduates();
  const idx = graduates.findIndex(g => g.id === userId);
  
  if (idx !== -1) {
    graduates[idx].role = newRole;
    saveGraduates(graduates);
    showToast(`Rol de ${graduates[idx].name} cambiado a ${newRole === 'admin' ? 'Administrador' : 'Estudiante'}.`, "success");
    
    // Si el usuario actual es al que se le cambió el rol, actualizar navbar
    if (currentUser && currentUser.id === userId) {
      currentUser.role = newRole;
      sessionStorage.setItem("fiee_current_user", currentUser.id);
    }
    
    initAdminPanel();
  }
}

function deleteGraduate(userId) {
  if (currentUser?.id !== "dali-huaman") {
    showToast("Solo el administrador supremo puede eliminar usuarios.", "error");
    return;
  }

  if (confirm("¿Está seguro de que desea eliminar a este graduado del sistema? Todos sus datos y pagos se perderán.")) {
    const graduates = getGraduates();
    const filtered = graduates.filter(g => g.id !== userId);
    saveGraduates(filtered);
    showToast("Graduado eliminado correctamente.", "success");
    initAdminPanel();
  }
}

// --- CONFIGURACIÓN DE PADRINOS Y EPÓNIMO EN ADMIN ---
function renderHonorsAdminForm() {
  const padrinos = getPadrinos();
  const eponym = getEponym();
  
  padrinos.forEach(p => {
    const input = document.getElementById(`admin-input-padrino-${p.id}`);
    if (input) input.value = p.name;
  });
  
  const eponymNameInput = document.getElementById("admin-input-eponym-name");
  const eponymDescInput = document.getElementById("admin-input-eponym-desc");
  if (eponymNameInput) eponymNameInput.value = eponym.name;
  if (eponymDescInput) eponymDescInput.value = eponym.description;
}

async function saveHonorsAdmin(e) {
  e.preventDefault();
  const padrinos = getPadrinos();
  
  padrinos.forEach(p => {
    const input = document.getElementById(`admin-input-padrino-${p.id}`);
    if (input) p.name = input.value.trim() || "Por definir";
  });
  
  // Guardar o eliminar fotos de padrinos
  for (let i = 0; i < padrinos.length; i++) {
    const photoInput = document.getElementById(`admin-input-padrino-${padrinos[i].id}-photo`);
    const clearCheckbox = document.getElementById(`admin-clear-padrino-${padrinos[i].id}-photo`);
    
    if (clearCheckbox && clearCheckbox.checked) {
      padrinos[i].photo = "";
    } else if (photoInput && photoInput.files && photoInput.files[0]) {
      try {
        padrinos[i].photo = await fileToBase64(photoInput.files[0]);
      } catch (err) {
        console.error("Error al leer la foto del padrino:", err);
      }
    }
  }
  savePadrinos(padrinos);
  
  const eponymNameInput = document.getElementById("admin-input-eponym-name");
  const eponymDescInput = document.getElementById("admin-input-eponym-desc");
  const eponymPhotoInput = document.getElementById("admin-input-eponym-photo");
  const eponymClearCheckbox = document.getElementById("admin-clear-eponym-photo");
  
  const eponym = getEponym() || {};
  eponym.name = eponymNameInput?.value.trim() || "Por definir";
  eponym.description = eponymDescInput?.value.trim() || "";
  
  // Guardar o eliminar foto del epónimo
  if (eponymClearCheckbox && eponymClearCheckbox.checked) {
    eponym.photo = "";
  } else if (eponymPhotoInput && eponymPhotoInput.files && eponymPhotoInput.files[0]) {
    try {
      eponym.photo = await fileToBase64(eponymPhotoInput.files[0]);
    } catch (err) {
      console.error("Error al leer la foto del epónimo:", err);
    }
  }
  saveEponym(eponym);
  
  showToast("Información de Padrinos y Epónimo actualizada con éxito.", "success");
  
  // Limpiar inputs de archivo y desmarcar checkboxes
  padrinos.forEach(p => {
    const photoInput = document.getElementById(`admin-input-padrino-${p.id}-photo`);
    const clearCheckbox = document.getElementById(`admin-clear-padrino-${p.id}-photo`);
    if (photoInput) photoInput.value = "";
    if (clearCheckbox) clearCheckbox.checked = false;
  });
  if (eponymPhotoInput) eponymPhotoInput.value = "";
  if (eponymClearCheckbox) eponymClearCheckbox.checked = false;
  
  // Forzar actualización en el resto de la app
  window.dispatchEvent(new Event("db_update"));
}

// --- EXPORTAR REPORTES A CSV PARA EXCEL (CON TABLAS Y RESÚMENES) ---
function exportBoxToCSV() {
  const graduates = getGraduates();
  const config = getConfig();
  
  // 1. Calcular estadísticas globales para el encabezado del Excel
  let totalRecaudado = 0;
  let totalPendienteVal = 0;
  let totalEgresados = graduates.length;
  let egresadosAlDia = 0;
  let egresadosAdelanto = 0;
  let egresadosSinPagos = 0;
  
  graduates.forEach(g => {
    let userPaid = 0;
    if (g.payments) {
      g.payments.forEach(p => {
        if (p.status === "aprobado") totalRecaudado += p.amount;
        if (p.status === "pendiente") totalPendienteVal += p.amount;
      });
    }
    
    const status = getGraduatePaymentStatus(g, config);
    if (status === "completo") egresadosAlDia++;
    else if (status === "adelanto") egresadosAdelanto++;
    else egresadosSinPagos++;
  });
  
  // Armar la estructura del CSV
  let csvContent = "\uFEFF"; // UTF-8 BOM para soporte correcto de caracteres con tilde en Excel
  
  // Encabezado decorativo y resumen
  csvContent += "=========================================================\n";
  csvContent += "REPORTE DE CAJA - GRADUACION FIEE UNI 2026 - INGENIERIA ELECTRICA\n";
  csvContent += `Fecha del Reporte: ${new Date().toLocaleDateString('es-PE')} - ${new Date().toLocaleTimeString('es-PE')}\n`;
  csvContent += "Productora del Evento: APG Producciones\n";
  csvContent += "=========================================================\n\n";
  
  csvContent += "RESUMEN DE CAJA GENERAL\n";
  csvContent += `Métrica;Valor;Comentario\n`;
  csvContent += `Total Recaudado (Aprobado);S/ ${totalRecaudado.toFixed(2)};Monto real en caja\n`;
  csvContent += `Total Pendiente de Validar;S/ ${totalPendienteVal.toFixed(2)};Monto en revisión por recibos subidos\n`;
  csvContent += `Total de Graduados Registrados;${totalEgresados};Egresados participantes\n`;
  csvContent += `Graduados Al Dia (100%);${egresadosAlDia};Completaron su paquete\n`;
  csvContent += `Graduados con Adelanto (S/ 25);${egresadosAdelanto};Pagaron la separación inicial\n`;
  csvContent += `Graduados Sin Pagos Aprobados;${egresadosSinPagos};Aún no reportan adelanto\n\n`;
  
  // Tabla Detallada de Graduados
  csvContent += "PADRON DE PAGOS DETALLADO POR GRADUANDO\n";
  csvContent += "ID;Codigo UNI;Nombre Egresado;Nombre Estola (Bordado);Correo;Telefono;Cumpleaños;Total Debido;Total Pagado;Saldo Pendiente;Estado Caja;Pagos Registrados\n";
  
  graduates.forEach(g => {
    const totalDebido = config.totalCeremonia;
    const pagosAprobados = g.payments ? g.payments.filter(p => p.status === "aprobado") : [];
    const totalPagado = pagosAprobados.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalDebido - totalPagado;
    const status = getGraduatePaymentStatus(g, config);
    let statusText = "Sin Pagos";
    if (status === "completo") statusText = "Al Dia";
    else if (status === "adelanto") statusText = "Solo Adelanto";
    else if (status === "pendiente") statusText = "En Validacion";
    
    // Contar pagos
    const paymentsSummary = g.payments ? g.payments.map(p => `${p.phase.toUpperCase()}(S/${p.amount}-${p.status})`).join(" | ") : "Ninguno";
    
    csvContent += `"${g.id}";"${g.code || ''}";"${g.name}";"${g.fullName || g.name}";"${g.email}";"${g.phone || ''}";"${g.birthday || ''}";S/ ${totalDebido.toFixed(2)};S/ ${totalPagado.toFixed(2)};S/ ${balance.toFixed(2)};"${statusText}";"${paymentsSummary}"\n`;
  });
  
  csvContent += "\nLISTADO DE TRANSACCIONES REPORTADAS\n";
  csvContent += "Egresado;Fase Pago;Monto;Comprobante;Fecha Reporte;Estado;Notas\n";
  
  graduates.forEach(g => {
    if (g.payments) {
      g.payments.forEach(p => {
        const phaseName = config.phases[p.phase] ? config.phases[p.phase].name : p.phase;
        csvContent += `"${g.name}";"${phaseName}";S/ ${p.amount.toFixed(2)};"${p.receipt ? 'CAPTURA ADJUNTA' : 'SIN CAPTURA'}";"${p.date}";"${p.status.toUpperCase()}";"${p.comments || ''}"\n`;
      });
    }
  });
  
  // Descargar archivo
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Reporte_Caja_Promocion_FIEE_2026.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Reporte de caja exportado exitosamente a CSV.", "success");
}

// --- DIBUJAR GRÁFICOS (CHART.JS O FALLBACK CSS) ---
function drawCharts() {
  const ctx1 = document.getElementById("payments-status-chart");
  const ctx2 = document.getElementById("cash-balance-chart");
  const fallbackContainer = document.getElementById("charts-fallback");
  
  const graduates = getGraduates();
  const config = getConfig();
  
  // Recopilar datos
  let totalRecaudado = 0;
  let totalPendienteVal = 0;
  let totalEsperado = 0;
  
  let countAlDia = 0;
  let countSoloAdelanto = 0;
  let countSinPagos = 0;
  let countPendienteVal = 0;
  
  graduates.forEach(g => {
    const status = getGraduatePaymentStatus(g, config);
    if (status === "completo") countAlDia++;
    else if (status === "adelanto") countSoloAdelanto++;
    else if (status === "pendiente") countPendienteVal++;
    else countSinPagos++;
    
    totalEsperado += config.totalCeremonia;
    
    if (g.payments) {
      g.payments.forEach(p => {
        if (p.status === "aprobado") totalRecaudado += p.amount;
        if (p.status === "pendiente") totalPendienteVal += p.amount;
      });
    }
  });
  
  const totalFaltante = Math.max(0, totalEsperado - totalRecaudado - totalPendienteVal);
  
  // 1. Intentar renderizar con Chart.js si la librería está cargada
  if (window.Chart) {
    if (fallbackContainer) fallbackContainer.style.display = "none";
    
    // Destruir gráficos anteriores para evitar fugas/bugs
    if (myChart1) myChart1.destroy();
    if (myChart2) myChart2.destroy();
    
    // Gráfico 1: Distribución de Egresados
    if (ctx1) {
      ctx1.style.display = "block";
      myChart1 = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: ['Al Día', 'Solo Adelanto', 'En Validación', 'Sin Pagos'],
          datasets: [{
            data: [countAlDia, countSoloAdelanto, countPendienteVal, countSinPagos],
            backgroundColor: ['#28a745', '#ffbd59', '#17a2b8', '#dc3545'],
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#f8f9fa', font: { family: 'Plus Jakarta Sans', size: 10 } }
            }
          }
        }
      });
    }
    
    // Gráfico 2: Caja Financiera
    if (ctx2) {
      ctx2.style.display = "block";
      myChart2 = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: ['Recaudado', 'Validación', 'Por Cobrar'],
          datasets: [{
            label: 'Caja S/',
            data: [totalRecaudado, totalPendienteVal, totalFaltante],
            backgroundColor: ['rgba(40,167,69,0.75)', 'rgba(23,162,184,0.75)', 'rgba(155,17,30,0.75)'],
            borderColor: ['#28a745', '#17a2b8', '#9B111E'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#c5c8cc', font: { family: 'Plus Jakarta Sans', size: 9 } }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#c5c8cc', font: { family: 'Plus Jakarta Sans', size: 9 } }
            }
          }
        }
      });
    }
  } 
  // 2. Si Chart.js no se cargó, usar fallback CSS interactivo
  else {
    if (ctx1) ctx1.style.display = "none";
    if (ctx2) ctx2.style.display = "none";
    if (fallbackContainer) {
      fallbackContainer.style.display = "block";
      
      const pctRecaudado = totalEsperado > 0 ? (totalRecaudado / totalEsperado * 100) : 0;
      const pctPendiente = totalEsperado > 0 ? (totalPendienteVal / totalEsperado * 100) : 0;
      const pctFaltante = 100 - pctRecaudado - pctPendiente;
      
      fallbackContainer.innerHTML = `
        <div class="chart-representation">
          <div class="chart-bar-col">
            <span class="chart-bar-value">S/ ${totalRecaudado.toFixed(0)}</span>
            <div class="chart-bar-visual green" style="height: ${Math.max(10, pctRecaudado * 1.5)}px;"></div>
            <span class="chart-bar-label">Recaudado<br>(${pctRecaudado.toFixed(1)}%)</span>
          </div>
          <div class="chart-bar-col">
            <span class="chart-bar-value">S/ ${totalPendienteVal.toFixed(0)}</span>
            <div class="chart-bar-visual blue" style="height: ${Math.max(10, pctPendiente * 1.5)}px;"></div>
            <span class="chart-bar-label">Revisión<br>(${pctPendiente.toFixed(1)}%)</span>
          </div>
          <div class="chart-bar-col">
            <span class="chart-bar-value">S/ ${totalFaltante.toFixed(0)}</span>
            <div class="chart-bar-visual gold" style="height: ${Math.max(10, pctFaltante * 1.5)}px;"></div>
            <span class="chart-bar-label">Por Cobrar<br>(${pctFaltante.toFixed(1)}%)</span>
          </div>
        </div>
      `;
    }
  }
}

// Vincular formulario de padrinos
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("admin-honors-form")?.addEventListener("submit", saveHonorsAdmin);
});
