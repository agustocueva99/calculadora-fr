// ===============================
// CONFIGURACIÓN EDITABLE
// ===============================
const TASA_IESS = 0.0758;        // 7.58% anual
const TASA_COMPETENCIA = 0.04;   // 5.00% anual

let grafico = null;

// ===============================
// HELPERS
// ===============================
function fmtMoney(x) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(x);
}

function fmtPct(x) {
  return (x * 100).toFixed(2) + "%";
}

function parseDateLocal(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMonths(date, months) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setMonth(d.getMonth() + months);
  return d;
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function diffDays(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ===============================
// GENERAR APORTES
// ===============================
function generarAportes(sueldo, anios, fechaInicio) {
  if (isNaN(sueldo) || sueldo <= 0) {
    throw new Error("El sueldo debe ser mayor a 0.");
  }

  if (isNaN(anios) || anios < 3 || anios > 25) {
    throw new Error("Los años a proyectar deben estar entre 3 y 25.");
  }

  const nMeses = anios * 12;
  const aporteMensual = sueldo * 0.0833;
  const aportes = [];

  for (let i = 0; i < nMeses; i++) {
    const fechaAporte = addMonths(fechaInicio, i);

    aportes.push({
      nro_aporte: i + 1,
      fecha_aporte: fechaAporte,
      sueldo: sueldo,
      aporte: aporteMensual
    });
  }

  return aportes;
}

// ===============================
// PROYECCIÓN IESS
// Tasa fija editable
// ===============================
function proyectarIESS(sueldo, anios, fechaInicio, tasaAnual = TASA_IESS) {
  const aportes = generarAportes(sueldo, anios, fechaInicio);
  const fechaFin = endOfMonth(aportes[aportes.length - 1].fecha_aporte);

  let acumuladoAportes = 0;
  let acumuladoRendimiento = 0;
  let acumuladoTotal = 0;

  const detalle = aportes.map(a => {
    const diasHastaFin = diffDays(a.fecha_aporte, fechaFin) + 1;
    const factor = Math.pow(1 + tasaAnual, diasHastaFin / 365);
    const indice = factor - 1;
    const rendimiento = a.aporte * indice;
    const totalAporte = a.aporte + rendimiento;

    acumuladoAportes += a.aporte;
    acumuladoRendimiento += rendimiento;
    acumuladoTotal += totalAporte;

    return {
      nro_aporte: a.nro_aporte,
      fecha_aporte: a.fecha_aporte,
      sueldo: a.sueldo,
      aporte: a.aporte,
      indice: indice,
      rendimiento: rendimiento,
      total_aporte: totalAporte,
      acumulado_aportes: acumuladoAportes,
      acumulado_rendimiento: acumuladoRendimiento,
      acumulado_total: acumuladoTotal
    };
  });

  return {
    detalle,
    resumen: {
      total_aportado: acumuladoAportes,
      total_rendimiento: acumuladoRendimiento,
      total_final: acumuladoTotal
    },
    fecha_fin: fechaFin
  };
}

// ===============================
// PROYECCIÓN COMPETENCIA
// Metodología tipo ahorro programado
// Cada mes aporta el mismo valor del aporte FR
// Tasa fija anual 5%
// ===============================
function proyectarCompetenciaAhorroProgramado(sueldo, anios, fechaInicio, tasaAnual = TASA_COMPETENCIA) {
  const aportes = generarAportes(sueldo, anios, fechaInicio);
  const fechaFin = endOfMonth(aportes[aportes.length - 1].fecha_aporte);

  let acumuladoAportes = 0;
  let acumuladoRendimiento = 0;
  let acumuladoTotal = 0;

  const detalle = aportes.map(a => {
    const cuotaMensual = a.aporte; // mismo valor que el aporte FR
    const diasHastaFin = diffDays(a.fecha_aporte, fechaFin) + 1;
    const factor = Math.pow(1 + tasaAnual, diasHastaFin / 365);
    const rendimiento = cuotaMensual * (factor - 1);
    const totalAporte = cuotaMensual + rendimiento;

    acumuladoAportes += cuotaMensual;
    acumuladoRendimiento += rendimiento;
    acumuladoTotal += totalAporte;

    return {
      nro_aporte: a.nro_aporte,
      fecha_aporte: a.fecha_aporte,
      sueldo: a.sueldo,
      aporte: cuotaMensual,
      rendimiento: rendimiento,
      total_aporte: totalAporte,
      acumulado_aportes: acumuladoAportes,
      acumulado_rendimiento: acumuladoRendimiento,
      acumulado_total: acumuladoTotal
    };
  });

  return {
    detalle,
    resumen: {
      total_aportado: acumuladoAportes,
      total_rendimiento: acumuladoRendimiento,
      total_final: acumuladoTotal
    },
    fecha_fin: fechaFin
  };
}

// ===============================
// UI: TARJETAS
// ===============================
function llenarTarjetas(iess, comp, sueldo) {
  document.getElementById("tasa_iess_txt").textContent = fmtPct(TASA_IESS);
  document.getElementById("aporte_txt").textContent = fmtMoney(sueldo * 0.0833);
  document.getElementById("fecha_fin_txt").textContent = formatDate(iess.fecha_fin);

  document.getElementById("aportado_txt").textContent = fmtMoney(iess.resumen.total_aportado);
  document.getElementById("rendimiento_txt").textContent = fmtMoney(iess.resumen.total_rendimiento);
  document.getElementById("total_txt").textContent = fmtMoney(iess.resumen.total_final);

  document.getElementById("total_comp_txt").textContent = fmtMoney(comp.resumen.total_final);
  document.getElementById("ventaja_txt").textContent = fmtMoney(iess.resumen.total_final - comp.resumen.total_final);
}

// ===============================
// UI: TABLA
// ===============================
function llenarTabla(detalle) {
  const tbody = document.querySelector("#tabla tbody");
  tbody.innerHTML = "";

  detalle.forEach(row => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.nro_aporte}</td>
      <td>${formatDate(row.fecha_aporte)}</td>
      <td>${row.aporte.toFixed(2)}</td>
      <td>${row.rendimiento.toFixed(2)}</td>
      <td>${row.total_aporte.toFixed(2)}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ===============================
// UI: GRÁFICO
// ===============================
function dibujarGrafico(iess, comp) {
  const ctx = document.getElementById("grafico");

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(ctx, {
    type: "line",
    data: {
      labels: iess.detalle.map(x => formatDate(x.fecha_aporte)),
      datasets: [
        {
          label: "IESS",
          data: iess.detalle.map(x => x.acumulado_total),
          borderColor: "forestgreen",
          backgroundColor: "rgba(34, 139, 34, 0.10)",
          fill: false,
          tension: 0.15,
          borderWidth: 3
        },
        {
          label: "Competencia",
          data: comp.detalle.map(x => x.acumulado_total),
          borderColor: "gray",
          backgroundColor: "rgba(128, 128, 128, 0.10)",
          fill: false,
          tension: 0.15,
          borderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom"
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${fmtMoney(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              return fmtMoney(value);
            }
          }
        }
      }
    }
  });
}

// ===============================
// CONFIGURACIÓN INICIAL
// ===============================
function setFechaMinima() {
  const hoy = new Date();
  const txtHoy = formatDate(hoy);
  const fechaInput = document.getElementById("fecha_inicio");
  fechaInput.min = txtHoy;
  fechaInput.value = txtHoy;
}

function actualizarSliderAnios() {
  const slider = document.getElementById("anios");
  const out = document.getElementById("anios_valor");
  out.textContent = `${slider.value} años`;
}

function calcular() {
  try {
    document.getElementById("msg").textContent = "";

    const sueldo = parseFloat(document.getElementById("sueldo").value);
    const anios = parseInt(document.getElementById("anios").value, 10);
    const fechaInicioTxt = document.getElementById("fecha_inicio").value;

    if (!fechaInicioTxt) {
      throw new Error("Debe seleccionar una fecha de inicio.");
    }

    const fechaInicio = parseDateLocal(fechaInicioTxt);

    const iess = proyectarIESS(sueldo, anios, fechaInicio, TASA_IESS);
    const competencia = proyectarCompetenciaAhorroProgramado(sueldo, anios, fechaInicio, TASA_COMPETENCIA);

    llenarTarjetas(iess, competencia, sueldo);
    llenarTabla(iess.detalle);
    dibujarGrafico(iess, competencia);

  } catch (error) {
    document.getElementById("msg").textContent = "Error: " + error.message;
  }
}

// ===============================
// EVENTOS
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  setFechaMinima();
  actualizarSliderAnios();

  document.getElementById("anios").addEventListener("input", actualizarSliderAnios);
  document.getElementById("calcular").addEventListener("click", calcular);
});     