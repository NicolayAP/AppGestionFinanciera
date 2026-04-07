/**
 * FinTrack – Lógica principal de la aplicación
 * js/app.js
 *
 * Depende de: js/data.js (debe cargarse antes)
 */

/* ─────────────────────────────────────
   REGISTRO DEL SERVICE WORKER
───────────────────────────────────── */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js")
      .then(function (registro) {
        console.log("[SW] Registrado. Scope:", registro.scope);

        registro.addEventListener("updatefound", function () {
          var nuevoWorker = registro.installing;
          nuevoWorker.addEventListener("statechange", function () {
            if (nuevoWorker.state === "installed" && navigator.serviceWorker.controller) {
              mostrarToast("Nueva versión disponible. Recarga para actualizar.", "info");
            }
          });
        });
      })
      .catch(function (err) {
        console.error("[SW] Error al registrar:", err);
        mostrarToast("Service Worker no pudo registrarse.", "error");
      });
  });
}


/* ─────────────────────────────────────
   DETECCIÓN OFFLINE
───────────────────────────────────── */
function actualizarEstadoConexion() {
  var badge = document.getElementById("offline-badge");
  if (!navigator.onLine) {
    badge.classList.remove("hidden");
    mostrarToast("Sin conexión – la app funciona offline.", "info");
  } else {
    badge.classList.add("hidden");
  }
}

window.addEventListener("online",  actualizarEstadoConexion);
window.addEventListener("offline", actualizarEstadoConexion);


/* ─────────────────────────────────────
   VARIABLES DE ESTADO
───────────────────────────────────── */
var paginaActual  = "dashboard";
var categoriaSeleccionada = null;
var graficos = {};   // instancias de Chart.js activas


/* ─────────────────────────────────────
   NAVEGACIÓN SPA
───────────────────────────────────── */
function navegar(pagina) {
  // Ocultar todas las páginas
  var paginas = document.querySelectorAll(".page");
  for (var i = 0; i < paginas.length; i++) {
    paginas[i].classList.remove("active");
  }

  // Quitar activo de todos los links
  var links = document.querySelectorAll(".nav-link");
  for (var i = 0; i < links.length; i++) {
    links[i].classList.remove("active");
  }

  // Activar la página seleccionada
  var seccion = document.getElementById("page-" + pagina);
  if (seccion) {
    seccion.classList.add("active");
    paginaActual = pagina;
  }

  // Activar el link correspondiente
  var linkActivo = document.querySelector('.nav-link[data-page="' + pagina + '"]');
  if (linkActivo) linkActivo.classList.add("active");

  // Cerrar sidebar en móvil
  document.getElementById("sidebar").classList.remove("open");
  var overlay = document.getElementById("sidebar-overlay");
  if (overlay) overlay.classList.remove("active");

  // Renderizar el contenido de la página
  if (pagina === "dashboard")   renderizarDashboard();
  if (pagina === "historial")   renderizarHistorial();
  if (pagina === "graficos")    renderizarGraficos();
  if (pagina === "presupuesto") renderizarResumenPresupuesto();
}


/* ─────────────────────────────────────
   INICIALIZACIÓN
───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {

  // Crear overlay para móvil
  var overlay = document.createElement("div");
  overlay.id = "sidebar-overlay";
  document.body.appendChild(overlay);
  overlay.addEventListener("click", function () {
    document.getElementById("sidebar").classList.remove("open");
    overlay.classList.remove("active");
  });

  // Botón hamburguesa
  document.getElementById("menu-btn").addEventListener("click", function () {
    document.getElementById("sidebar").classList.toggle("open");
    overlay.classList.toggle("active");
  });

  // Eventos de navegación
  var linksNav = document.querySelectorAll(".nav-link");
  for (var i = 0; i < linksNav.length; i++) {
    linksNav[i].addEventListener("click", function (e) {
      e.preventDefault();
      navegar(this.dataset.page);
    });
  }

  // Construir componentes
  construirGridCategorias();
  construirInputsCategoriaPresupuesto();
  configurarFormularioGasto();
  configurarFormularioPresupuesto();
  configurarFiltrosHistorial();
  establecerFechasPorDefecto();
  actualizarEstadoConexion();
  renderizarDashboard();
});


/* ─────────────────────────────────────
   UTILIDADES
───────────────────────────────────── */

// Retorna el mes actual en formato YYYY-MM
function mesActual() {
  var hoy = new Date();
  var m = hoy.getMonth() + 1;
  return hoy.getFullYear() + "-" + (m < 10 ? "0" + m : "" + m);
}

// Formatea un número como moneda
function formatearDinero(n) {
  return "$" + Number(n).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Formatea fecha YYYY-MM-DD → DD/MM/YYYY
function formatearFecha(str) {
  if (!str) return "";
  var partes = str.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// Nombre del mes en español
function nombreMes(ym) {
  if (!ym) return "";
  var partes = ym.split("-");
  var nombres = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return nombres[parseInt(partes[1], 10) - 1] + " " + partes[0];
}

// Escapar HTML para evitar XSS
function escaparHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


/* ─────────────────────────────────────
   TOAST (notificaciones)
───────────────────────────────────── */
function mostrarToast(mensaje, tipo) {
  tipo = tipo || "info";
  var contenedor = document.getElementById("toast-container");
  var toast = document.createElement("div");
  toast.className = "toast " + tipo;
  toast.textContent = mensaje;
  contenedor.appendChild(toast);

  setTimeout(function () {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.4s";
  }, 2800);
  setTimeout(function () {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3300);
}


/* ─────────────────────────────────────
   FORMULARIO DE GASTO
───────────────────────────────────── */
function construirGridCategorias() {
  var grid = document.getElementById("category-grid");
  grid.innerHTML = "";

  for (var i = 0; i < categorias.length; i++) {
    var cat = categorias[i];
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cat-btn";
    btn.dataset.id = cat.id;
    btn.innerHTML = '<span class="cat-emoji">' + cat.emoji + '</span>' + cat.label;
    btn.addEventListener("click", (function(id) {
      return function() { seleccionarCategoria(id); };
    })(cat.id));
    grid.appendChild(btn);
  }
}

function seleccionarCategoria(id) {
  categoriaSeleccionada = id;
  var botones = document.querySelectorAll(".cat-btn");
  for (var i = 0; i < botones.length; i++) {
    if (botones[i].dataset.id === id) {
      botones[i].classList.add("selected");
    } else {
      botones[i].classList.remove("selected");
    }
  }
}

function establecerFechasPorDefecto() {
  var hoy = new Date().toISOString().split("T")[0];
  document.getElementById("gasto-fecha").value = hoy;
  var ym = mesActual();
  document.getElementById("budget-month").value = ym;
  document.getElementById("filter-month").value = ym;
}

function configurarFormularioGasto() {
  document.getElementById("btn-save-gasto").addEventListener("click", guardarGasto);
}

function guardarGasto() {
  var desc  = document.getElementById("gasto-desc").value.trim();
  var monto = parseFloat(document.getElementById("gasto-monto").value);
  var fecha = document.getElementById("gasto-fecha").value;
  var nota  = document.getElementById("gasto-nota").value.trim();
  var msg   = document.getElementById("form-msg");

  // Validaciones
  if (!desc) {
    mostrarMensaje(msg, "Agrega una descripción.", "error");
    return;
  }
  if (!monto || monto <= 0) {
    mostrarMensaje(msg, "El monto debe ser mayor a 0.", "error");
    return;
  }
  if (!fecha) {
    mostrarMensaje(msg, "Selecciona una fecha.", "error");
    return;
  }
  if (!categoriaSeleccionada) {
    mostrarMensaje(msg, "Elige una categoría.", "error");
    return;
  }

  // Agregar al arreglo en memoria
  agregarGasto(desc, monto, fecha, categoriaSeleccionada, nota);

  mostrarMensaje(msg, "✓ Gasto registrado correctamente.", "success");
  mostrarToast("Gasto guardado.", "success");

  // Limpiar formulario
  document.getElementById("gasto-desc").value  = "";
  document.getElementById("gasto-monto").value = "";
  document.getElementById("gasto-nota").value  = "";
  var botones = document.querySelectorAll(".cat-btn");
  for (var i = 0; i < botones.length; i++) {
    botones[i].classList.remove("selected");
  }
  categoriaSeleccionada = null;
}

function mostrarMensaje(el, texto, tipo) {
  el.textContent = texto;
  el.className = "form-msg " + tipo;
  el.classList.remove("hidden");
  setTimeout(function () { el.classList.add("hidden"); }, 4000);
}


/* ─────────────────────────────────────
   FORMULARIO DE PRESUPUESTO
───────────────────────────────────── */
function construirInputsCategoriaPresupuesto() {
  var contenedor = document.getElementById("budget-categories");
  contenedor.innerHTML = "";

  for (var i = 0; i < categorias.length; i++) {
    var cat = categorias[i];
    var fila = document.createElement("div");
    fila.className = "budget-cat-row";
    fila.innerHTML =
      '<div class="budget-cat-label">' +
        '<span class="cat-emoji">' + cat.emoji + '</span>' +
        '<span>' + cat.label + '</span>' +
      '</div>' +
      '<input type="number" id="budget-cat-' + cat.id + '" placeholder="0" min="0" step="1000" />';
    contenedor.appendChild(fila);
  }
}

function configurarFormularioPresupuesto() {
  document.getElementById("btn-save-budget").addEventListener("click", guardarPresupuestoForm);
}

function guardarPresupuestoForm() {
  var mes     = document.getElementById("budget-month").value;
  var ingreso = parseFloat(document.getElementById("budget-income").value) || 0;
  var msg     = document.getElementById("budget-msg");

  if (!mes) {
    mostrarMensaje(msg, "Selecciona un mes.", "error");
    return;
  }
  if (ingreso <= 0) {
    mostrarMensaje(msg, "Ingresa un ingreso mensual mayor a 0.", "error");
    return;
  }

  // Construir arreglo de límites por categoría
  var limites = [];
  for (var i = 0; i < categorias.length; i++) {
    var val = parseFloat(document.getElementById("budget-cat-" + categorias[i].id).value) || 0;
    if (val > 0) {
      limites.push({ categoriaId: categorias[i].id, limite: val });
    }
  }

  guardarPresupuesto(mes, ingreso, limites);
  mostrarMensaje(msg, "✓ Presupuesto guardado.", "success");
  mostrarToast("Presupuesto guardado.", "success");
  renderizarResumenPresupuesto();
}

function renderizarResumenPresupuesto() {
  var mes  = document.getElementById("budget-month").value || mesActual();
  var pres = obtenerPresupuesto(mes);
  var card = document.getElementById("budget-summary-card");
  var lista = document.getElementById("budget-summary-list");

  if (!pres) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");

  var gastosMes   = obtenerGastosPorMes(mes);
  var totalGasto  = 0;
  for (var i = 0; i < gastosMes.length; i++) {
    totalGasto += gastosMes[i].monto;
  }

  var html = "";
  html += '<div class="budget-summary-row"><span>Ingreso</span><span style="color:var(--success)">' + formatearDinero(pres.ingreso) + '</span></div>';
  html += '<div class="budget-summary-row"><span>Gasto total</span><span style="color:var(--danger)">' + formatearDinero(totalGasto) + '</span></div>';

  for (var i = 0; i < pres.limites.length; i++) {
    var lim = pres.limites[i];
    var cat = obtenerCategoria(lim.categoriaId);
    var gastado = 0;
    for (var j = 0; j < gastosMes.length; j++) {
      if (gastosMes[j].categoria === lim.categoriaId) {
        gastado += gastosMes[j].monto;
      }
    }
    var pct  = lim.limite > 0 ? Math.min((gastado / lim.limite) * 100, 100) : 0;
    var over = gastado > lim.limite;
    html += '<div class="budget-summary-row">' +
      '<span>' + cat.emoji + ' ' + cat.label + '</span>' +
      '<span>' + formatearDinero(gastado) + ' / ' + formatearDinero(lim.limite) + '</span>' +
      '<div class="budget-bar-wrap"><div class="budget-bar ' + (over ? "over" : "") + '" style="width:' + pct + '%"></div></div>' +
    '</div>';
  }

  lista.innerHTML = html;
}


/* ─────────────────────────────────────
   HISTORIAL
───────────────────────────────────── */
function configurarFiltrosHistorial() {
  var selectCat = document.getElementById("filter-cat");
  selectCat.innerHTML = '<option value="">Todas las categorías</option>';
  for (var i = 0; i < categorias.length; i++) {
    selectCat.innerHTML += '<option value="' + categorias[i].id + '">' +
      categorias[i].emoji + ' ' + categorias[i].label + '</option>';
  }

  selectCat.addEventListener("change", renderizarHistorial);
  document.getElementById("filter-month").addEventListener("change", renderizarHistorial);
  document.getElementById("btn-clear-filters").addEventListener("click", function () {
    document.getElementById("filter-cat").value   = "";
    document.getElementById("filter-month").value = mesActual();
    renderizarHistorial();
  });
}

function renderizarHistorial() {
  var filtroCat = document.getElementById("filter-cat").value;
  var filtroMes = document.getElementById("filter-month").value;
  var lista     = document.getElementById("historial-list");

  var resultado = filtroMes ? obtenerGastosPorMes(filtroMes) : obtenerGastos();

  if (filtroCat) {
    var filtrado = [];
    for (var i = 0; i < resultado.length; i++) {
      if (resultado[i].categoria === filtroCat) filtrado.push(resultado[i]);
    }
    resultado = filtrado;
  }

  // Mostrar más recientes primero
  var invertido = resultado.slice().reverse();

  if (invertido.length === 0) {
    lista.innerHTML = '<div class="empty-state">No hay gastos para este filtro.</div>';
    return;
  }

  var html = "";
  for (var i = 0; i < invertido.length; i++) {
    html += construirItemGasto(invertido[i]);
  }
  lista.innerHTML = html;

  // Eventos de eliminar
  var botones = lista.querySelectorAll(".expense-delete");
  for (var i = 0; i < botones.length; i++) {
    botones[i].addEventListener("click", (function(id) {
      return function() {
        eliminarGasto(id);
        mostrarToast("Gasto eliminado.", "info");
        renderizarHistorial();
        if (paginaActual === "dashboard") renderizarDashboard();
      };
    })(parseInt(botones[i].dataset.id)));
  }
}

function construirItemGasto(g) {
  var cat = obtenerCategoria(g.categoria);
  return '<div class="expense-item">' +
    '<div class="expense-icon" style="background:' + cat.color + '22;">' + cat.emoji + '</div>' +
    '<div class="expense-info">' +
      '<div class="expense-desc">' + escaparHtml(g.desc) + '</div>' +
      '<div class="expense-meta">' + cat.label + ' · ' + formatearFecha(g.fecha) +
        (g.nota ? ' · ' + escaparHtml(g.nota) : '') + '</div>' +
    '</div>' +
    '<div class="expense-amount">' + formatearDinero(g.monto) + '</div>' +
    '<button class="expense-delete" data-id="' + g.id + '" title="Eliminar">✕</button>' +
  '</div>';
}


/* ─────────────────────────────────────
   DASHBOARD
───────────────────────────────────── */
function renderizarDashboard() {
  var ym         = mesActual();
  var pres       = obtenerPresupuesto(ym);
  var gastosMes  = obtenerGastosPorMes(ym);

  var totalGasto = 0;
  for (var i = 0; i < gastosMes.length; i++) {
    totalGasto += gastosMes[i].monto;
  }

  var ingreso = pres ? pres.ingreso : 0;
  var balance = ingreso - totalGasto;
  var ahorro  = ingreso > 0 ? Math.max(0, Math.round((balance / ingreso) * 100)) : 0;

  document.getElementById("dashboard-month").textContent = nombreMes(ym);
  document.getElementById("kpi-income").textContent  = formatearDinero(ingreso);
  document.getElementById("kpi-expense").textContent = formatearDinero(totalGasto);
  document.getElementById("kpi-balance").textContent = formatearDinero(balance);
  document.getElementById("kpi-savings").textContent = ahorro + "%";

  renderizarGraficoCategoriasDB(gastosMes);
  renderizarGraficoPresupuestoVsRealDB(gastosMes, pres);
  renderizarListaReciente(gastosMes);
}

function renderizarListaReciente(gastosMes) {
  var lista   = document.getElementById("recent-list");
  var recents = gastosMes.slice().reverse().slice(0, 5);

  if (recents.length === 0) {
    lista.innerHTML = '<div class="empty-state">Sin gastos este mes.</div>';
    return;
  }

  var html = "";
  for (var i = 0; i < recents.length; i++) {
    html += construirItemGasto(recents[i]);
  }
  lista.innerHTML = html;

  var botones = lista.querySelectorAll(".expense-delete");
  for (var i = 0; i < botones.length; i++) {
    botones[i].addEventListener("click", (function(id) {
      return function() {
        eliminarGasto(id);
        mostrarToast("Gasto eliminado.", "info");
        renderizarDashboard();
      };
    })(parseInt(botones[i].dataset.id)));
  }
}


/* ─────────────────────────────────────
   GRÁFICOS
───────────────────────────────────── */
var opcionesBase = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#7c8ea8", font: { family: "DM Sans" } } }
  }
};

function destruirGrafico(id) {
  if (graficos[id]) {
    graficos[id].destroy();
    delete graficos[id];
  }
}

function renderizarGraficoCategoriasDB(gastosMes) {
  destruirGrafico("catDB");
  var ctx = document.getElementById("chartCategories").getContext("2d");

  // Sumar por categoría
  var totales = {};
  for (var i = 0; i < gastosMes.length; i++) {
    var cid = gastosMes[i].categoria;
    totales[cid] = (totales[cid] || 0) + gastosMes[i].monto;
  }

  var ids = Object.keys(totales);
  if (ids.length === 0) return;

  var labels  = [];
  var datos   = [];
  var colores = [];
  for (var i = 0; i < ids.length; i++) {
    var cat = obtenerCategoria(ids[i]);
    labels.push(cat.emoji + " " + cat.label);
    datos.push(totales[ids[i]]);
    colores.push(cat.color);
  }

  graficos.catDB = new Chart(ctx, {
    type: "doughnut",
    data: { labels: labels, datasets: [{ data: datos, backgroundColor: colores, borderWidth: 0 }] },
    options: Object.assign({}, opcionesBase, { cutout: "68%" })
  });
}

function renderizarGraficoPresupuestoVsRealDB(gastosMes, pres) {
  destruirGrafico("budgetDB");
  var ctx = document.getElementById("chartBudget").getContext("2d");
  if (!pres || !pres.limites || pres.limites.length === 0) return;

  var labels     = [];
  var presupuest = [];
  var gastado    = [];

  for (var i = 0; i < pres.limites.length; i++) {
    var lim = pres.limites[i];
    var cat = obtenerCategoria(lim.categoriaId);
    labels.push(cat.emoji + " " + cat.label);
    presupuest.push(lim.limite);

    var totalCat = 0;
    for (var j = 0; j < gastosMes.length; j++) {
      if (gastosMes[j].categoria === lim.categoriaId) totalCat += gastosMes[j].monto;
    }
    gastado.push(totalCat);
  }

  graficos.budgetDB = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        { label: "Presupuesto", data: presupuest, backgroundColor: "rgba(56,189,248,0.35)", borderColor: "#38bdf8", borderWidth: 1.5, borderRadius: 6 },
        { label: "Gasto real",  data: gastado,    backgroundColor: "rgba(248,113,113,0.45)", borderColor: "#f87171", borderWidth: 1.5, borderRadius: 6 }
      ]
    },
    options: Object.assign({}, opcionesBase, {
      scales: {
        x: { ticks: { color: "#7c8ea8" }, grid: { color: "#1e2d45" } },
        y: { ticks: { color: "#7c8ea8" }, grid: { color: "#1e2d45" } }
      }
    })
  });
}

function renderizarGraficos() {
  var todosGastos = obtenerGastos();
  var ym          = mesActual();
  var pres        = obtenerPresupuesto(ym);
  var gastosMes   = obtenerGastosPorMes(ym);

  renderizarGraficoMensual(todosGastos);
  renderizarGraficoComparativo(gastosMes, pres);
  renderizarGraficoDonut(gastosMes);
}

function renderizarGraficoMensual(todosGastos) {
  destruirGrafico("monthly");
  var ctx = document.getElementById("chartMonthly").getContext("2d");

  // Últimos 6 meses
  var hoy    = new Date();
  var meses  = [];
  for (var i = 5; i >= 0; i--) {
    var d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    var m = d.getMonth() + 1;
    meses.push(d.getFullYear() + "-" + (m < 10 ? "0" + m : "" + m));
  }

  var totales = [];
  for (var i = 0; i < meses.length; i++) {
    var total = 0;
    for (var j = 0; j < todosGastos.length; j++) {
      if (todosGastos[j].fecha && todosGastos[j].fecha.indexOf(meses[i]) === 0) {
        total += todosGastos[j].monto;
      }
    }
    totales.push(total);
  }

  var labels = [];
  for (var i = 0; i < meses.length; i++) {
    labels.push(nombreMes(meses[i]).split(" ")[0]);
  }

  graficos.monthly = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Gasto mensual",
        data: totales,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.12)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#38bdf8",
        pointRadius: 5
      }]
    },
    options: Object.assign({}, opcionesBase, {
      scales: {
        x: { ticks: { color: "#7c8ea8" }, grid: { color: "#1a2640" } },
        y: { ticks: { color: "#7c8ea8" }, grid: { color: "#1a2640" } }
      }
    })
  });
}

function renderizarGraficoComparativo(gastosMes, pres) {
  destruirGrafico("comparison");
  var ctx    = document.getElementById("chartComparison").getContext("2d");
  var labels = [];
  var presup = [];
  var gastado = [];

  for (var i = 0; i < categorias.length; i++) {
    var cat  = categorias[i];
    var lim  = pres ? obtenerLimiteCategoria(pres.limites, cat.id) : 0;
    var gast = 0;
    for (var j = 0; j < gastosMes.length; j++) {
      if (gastosMes[j].categoria === cat.id) gast += gastosMes[j].monto;
    }
    labels.push(cat.emoji + " " + cat.label);
    presup.push(lim);
    gastado.push(gast);
  }

  graficos.comparison = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        { label: "Presupuesto", data: presup,  backgroundColor: "rgba(56,189,248,0.4)",  borderColor: "#38bdf8", borderWidth: 1.5, borderRadius: 6 },
        { label: "Gasto real",  data: gastado, backgroundColor: "rgba(248,113,113,0.5)", borderColor: "#f87171", borderWidth: 1.5, borderRadius: 6 }
      ]
    },
    options: Object.assign({}, opcionesBase, {
      scales: {
        x: { ticks: { color: "#7c8ea8", font: { size: 11 } }, grid: { color: "#1a2640" } },
        y: { ticks: { color: "#7c8ea8" }, grid: { color: "#1a2640" } }
      }
    })
  });
}

function renderizarGraficoDonut(gastosMes) {
  destruirGrafico("donut");
  var ctx = document.getElementById("chartDonut").getContext("2d");

  var totales = {};
  for (var i = 0; i < gastosMes.length; i++) {
    var cid = gastosMes[i].categoria;
    totales[cid] = (totales[cid] || 0) + gastosMes[i].monto;
  }

  var ids = Object.keys(totales);
  if (ids.length === 0) return;

  var labels  = [];
  var datos   = [];
  var colores = [];
  for (var i = 0; i < ids.length; i++) {
    var cat = obtenerCategoria(ids[i]);
    labels.push(cat.emoji + " " + cat.label);
    datos.push(totales[ids[i]]);
    colores.push(cat.color);
  }

  graficos.donut = new Chart(ctx, {
    type: "doughnut",
    data: { labels: labels, datasets: [{ data: datos, backgroundColor: colores, borderWidth: 0 }] },
    options: Object.assign({}, opcionesBase, {
      cutout: "60%",
      plugins: {
        legend: { position: "right", labels: { color: "#e2e8f0", font: { family: "DM Sans", size: 13 } } }
      }
    })
  });
}
