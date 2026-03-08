const fs = require("fs");
const path = require("path");

/**
 * Guarda errores en logs/app.log
 * @param {string} nivel - 'info', 'warn' o 'error'
 * @param {string} mensaje - Descripción del suceso
 */
const logger = (nivel, mensaje) => {
  const rutaLog = path.join(__dirname, "../../logs/app.log");
  const timestamp = new Date().toLocaleString();

  // Formato dinamico
  const linea = `[${timestamp}] [${nivel.toUpperCase()}]: ${mensaje}\n`;

  // Escribir en el archivo
  fs.appendFile(rutaLog, linea, (err) => {
    if (err) console.error("No se pudo escribir en el archivo de logs:", err);
  });
};

module.exports = { logger };
