const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// Devuelve la ruta del excel del día actual: data/registros_2025-01-27.xlsx
const getRutaExcelHoy = () => {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  const nombreArchivo = `registros_${yyyy}-${mm}-${dd}.xlsx`;
  return path.join(__dirname, "../../data", nombreArchivo);
};

// Aplica formato rojo a toda la fila si tiene error
// columnas A..G (7 columnas)
const aplicarFormatoErrores = (ws, filaIndex) => {
  const columnas = ["A", "B", "C", "D", "E", "F", "G", "H"];
  for (const col of columnas) {
    const celda = `${col}${filaIndex}`;
    if (!ws[celda]) continue;
    ws[celda].s = {
      font: { color: { rgb: "CC0000" }, bold: true },
      fill: { patternType: "solid", fgColor: { rgb: "FFE0E0" } },
    };
  }
};

const guardarEnExcel = (datos) => {
  const rutaExcel = getRutaExcelHoy();

  // Asegurar que existe el directorio data/
  const dirData = path.dirname(rutaExcel);
  if (!fs.existsSync(dirData)) fs.mkdirSync(dirData, { recursive: true });

  // Orden de columnas:
  // Fecha Recibido | Fecha Registro | Asunto | Nº Trabajo | Codigo Presvet | Numero Receta | Error Detectado | Detalle Error
  const nuevaFila = {
    "Fecha Recibido": datos.fechaRecibido
      ? new Date(datos.fechaRecibido).toLocaleString("es-ES")
      : new Date().toLocaleString("es-ES"),
    "Fecha Registro": new Date().toLocaleString("es-ES"),
    Asunto: datos.asunto,
    "Numero de Trabajo": datos.numeroTrabajo || "DESCONOCIDO",
    "Codigo Presvet": datos.presvet,
    "Numero Receta": datos.receta,
    "Error Detectado": datos.tieneError ? "⚠️ SÍ" : "",
    "Detalle Error": datos.detalleError || "",
  };

  let wb;
  let contenidoActual = [];

  if (fs.existsSync(rutaExcel)) {
    // Archivo del día ya existe → añadir fila
    wb = XLSX.readFile(rutaExcel);
    const nombreHoja = wb.SheetNames[0];
    const hoja = wb.Sheets[nombreHoja];
    contenidoActual = XLSX.utils.sheet_to_json(hoja);
  } else {
    // Primer uso del día → libro nuevo
    wb = XLSX.utils.book_new();
  }

  contenidoActual.push(nuevaFila);

  // Reconstruir hoja
  const nuevaHoja = XLSX.utils.json_to_sheet(contenidoActual);

  // Ancho de columnas
  nuevaHoja["!cols"] = [
    { wch: 22 }, // Fecha Recibido
    { wch: 22 }, // Fecha Registro
    { wch: 40 }, // Asunto
    { wch: 18 }, // Numero de Trabajo  ← nueva
    { wch: 24 }, // Codigo Presvet
    { wch: 24 }, // Numero Receta
    { wch: 14 }, // Error Detectado
    { wch: 50 }, // Detalle Error
  ];

  // Pintar en rojo las filas con error (fila 1 = cabecera, datos desde fila 2)
  contenidoActual.forEach((fila, idx) => {
    if (fila["Error Detectado"] && fila["Error Detectado"].includes("SÍ")) {
      aplicarFormatoErrores(nuevaHoja, idx + 2);
    }
  });

  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(wb, nuevaHoja, "Codigos");
  } else {
    wb.Sheets[wb.SheetNames[0]] = nuevaHoja;
  }

  XLSX.writeFile(wb, rutaExcel);

  const nombreArchivo = path.basename(rutaExcel);
  console.log(
    `📊 Excel actualizado: data/${nombreArchivo} (${contenidoActual.length} registro(s))`,
  );
};

module.exports = { guardarEnExcel };
