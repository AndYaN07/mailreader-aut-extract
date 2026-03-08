const { leerUltimosCorreos } = require("./services/mailService");

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
