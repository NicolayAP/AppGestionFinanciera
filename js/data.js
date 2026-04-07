/**
 * FinTrack – Capa de datos en MEMORIA
 * js/data.js
 *
 * Todos los datos se guardan en arreglos en memoria.
 * Los datos se pierden al recargar la página (sin persistencia).
 */

/* ─────────────────────────────────────
   ARREGLOS PRINCIPALES EN MEMORIA
───────────────────────────────────── */

// Arreglo de gastos registrados
var gastos = [];

// Arreglo de presupuestos (uno por mes)
var presupuestos = [];

// Contador para IDs únicos
var contadorId = 1;


/* ─────────────────────────────────────
   CATEGORÍAS PREDEFINIDAS
───────────────────────────────────── */
var categorias = [
  { id: "comida",     label: "Comida",      emoji: "🍔", color: "#f87171" },
  { id: "transporte", label: "Transporte",  emoji: "🚗", color: "#fbbf24" },
  { id: "ocio",       label: "Ocio",        emoji: "🎮", color: "#a78bfa" },
  { id: "salud",      label: "Salud",       emoji: "💊", color: "#34d399" },
  { id: "educacion",  label: "Educación",   emoji: "📚", color: "#38bdf8" },
  { id: "hogar",      label: "Hogar",       emoji: "🏠", color: "#fb923c" },
  { id: "ropa",       label: "Ropa",        emoji: "👕", color: "#e879f9" },
  { id: "servicios",  label: "Servicios",   emoji: "💡", color: "#67e8f9" },
  { id: "deporte",    label: "Deporte",     emoji: "🏋️", color: "#86efac" },
  { id: "otro",       label: "Otro",        emoji: "📦", color: "#94a3b8" }
];


/* ─────────────────────────────────────
   FUNCIONES DE GASTOS
───────────────────────────────────── */

/**
 * Agrega un gasto al arreglo en memoria
 * @param {string} desc       - Descripción del gasto
 * @param {number} monto      - Monto del gasto
 * @param {string} fecha      - Fecha en formato YYYY-MM-DD
 * @param {string} categoria  - ID de la categoría
 * @param {string} nota       - Nota opcional
 * @returns {object} El gasto creado
 */
function agregarGasto(desc, monto, fecha, categoria, nota) {
  var nuevoGasto = {
    id:        contadorId,
    desc:      desc,
    monto:     monto,
    fecha:     fecha,
    categoria: categoria,
    nota:      nota || ""
  };
  gastos.push(nuevoGasto);
  contadorId++;
  return nuevoGasto;
}

/**
 * Elimina un gasto del arreglo por su ID
 * @param {number} id - ID del gasto a eliminar
 */
function eliminarGasto(id) {
  for (var i = 0; i < gastos.length; i++) {
    if (gastos[i].id === id) {
      gastos.splice(i, 1);
      return true;
    }
  }
  return false;
}

/**
 * Retorna todos los gastos del arreglo
 * @returns {Array} Copia del arreglo de gastos
 */
function obtenerGastos() {
  return gastos;
}

/**
 * Filtra gastos por mes (formato YYYY-MM)
 * @param {string} yearMonth - Ej: "2025-03"
 * @returns {Array} Gastos de ese mes
 */
function obtenerGastosPorMes(yearMonth) {
  var resultado = [];
  for (var i = 0; i < gastos.length; i++) {
    if (gastos[i].fecha && gastos[i].fecha.indexOf(yearMonth) === 0) {
      resultado.push(gastos[i]);
    }
  }
  return resultado;
}


/* ─────────────────────────────────────
   FUNCIONES DE PRESUPUESTO
───────────────────────────────────── */

/**
 * Guarda o actualiza el presupuesto de un mes
 * @param {string} mes        - Formato YYYY-MM
 * @param {number} ingreso    - Ingreso mensual
 * @param {Array}  limites    - Arreglo de {categoriaId, limite}
 */
function guardarPresupuesto(mes, ingreso, limites) {
  // Buscar si ya existe presupuesto para ese mes
  for (var i = 0; i < presupuestos.length; i++) {
    if (presupuestos[i].mes === mes) {
      presupuestos[i].ingreso = ingreso;
      presupuestos[i].limites = limites;
      return presupuestos[i];
    }
  }
  // Si no existe, agregar al arreglo
  var nuevo = { mes: mes, ingreso: ingreso, limites: limites };
  presupuestos.push(nuevo);
  return nuevo;
}

/**
 * Obtiene el presupuesto de un mes específico
 * @param {string} mes - Formato YYYY-MM
 * @returns {object|null}
 */
function obtenerPresupuesto(mes) {
  for (var i = 0; i < presupuestos.length; i++) {
    if (presupuestos[i].mes === mes) {
      return presupuestos[i];
    }
  }
  return null;
}

/**
 * Obtiene el límite de una categoría dentro de un presupuesto
 * @param {Array}  limites     - Arreglo de límites del presupuesto
 * @param {string} categoriaId - ID de la categoría
 * @returns {number} El límite o 0 si no está definido
 */
function obtenerLimiteCategoria(limites, categoriaId) {
  for (var i = 0; i < limites.length; i++) {
    if (limites[i].categoriaId === categoriaId) {
      return limites[i].limite;
    }
  }
  return 0;
}


/* ─────────────────────────────────────
   FUNCIONES DE CATEGORÍAS
───────────────────────────────────── */

/**
 * Busca una categoría por su ID
 * @param {string} id
 * @returns {object} La categoría o la última (Otro) si no existe
 */
function obtenerCategoria(id) {
  for (var i = 0; i < categorias.length; i++) {
    if (categorias[i].id === id) {
      return categorias[i];
    }
  }
  return categorias[categorias.length - 1];
}
