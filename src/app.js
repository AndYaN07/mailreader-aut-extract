require("dotenv").config({ path: __dirname + "/../.env" });
const { leerUltimosCorreos } = require("./services/graphMailService");

console.log("Iniciando escaneo de correos...");

leerUltimosCorreos()
  .then(() => {
    console.log("✅ Proceso completado.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error fatal:", err);
    process.exit(1);
  });
