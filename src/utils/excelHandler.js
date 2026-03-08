const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const guardarEnExcel = (datos) => {
  const rutaExcel = path.join(__dirname, "../../data/registros.xlsx");
  let libro;
  const nuevaFila = {
    Fecha: new Date().toLocaleString(),
    Asunto: datos.asunto,
    "Codigo Presvet": datos.presvet,
    "Numero Receta": datos.receta,
  };

  // Intentar leer el archivo si ya existe
  if (fs.existsSync(rutaExcel)) {
    libro = XLSX.readFile(rutaExcel);
    const nombreHoja = libro.SheetNames[0];
    const hoja = libro.Sheets[nombreHoja];

    // Convertimos a JSON para añadir la nueva fila
    const contenidoActual = XLSX.utils.sheet_to_json(hoja);
    contenidoActual.push(nuevaFila);

    // Nueva hoja con los datos actualizados
    const nuevaHoja = XLSX.utils.json_to_sheet(contenidoActual);
    libro.Sheets[nombreHoja] = nuevaHoja;
  } else {
    // Si no existe, crea de cero con la primera fila
    libro = XLSX.utils.book_new();
    const hoja = XLSX.utils.json_to_sheet([nuevaFila]);
    XLSX.utils.book_append_sheet(libro, hoja, "Codigos");
  }

  // Guardar el archivo
  XLSX.writeFile(libro, rutaExcel);
  console.log(
    "📊 Excel actualizado con Presvet y Receta en data/registros.xlsx",
  );
};

module.exports = { guardarEnExcel };
