const Imap = require("node-imap");
const { simpleParser } = require("mailparser");
const imapConfig = require("../config/imapConfig");
const fs = require("fs");
const path = require("path");

// ===== UTILS =====
const { guardarEnExcel } = require("../utils/excelHandler");
const { logger } = require("../utils/logger");

const imap = new Imap(imapConfig);

// ===== FILTROS =====
const FILTRO_REMITENTE = "andy@ntecweb.es"; // El correo del remitente
//const FILTRO_ASUNTO = "Tu código de verificación"; // El asunto del correo a buscar

const leerUltimosCorreos = () => {
  return new Promise((resolve, reject) => {
    // ----- 1. CONEXION Y APERTURA -----
    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err, box) => {
        if (err) {
          logger("error", `Error al abrir INBOX: ${err.message}`);
          return reject(err);
        }

        // --- 2. BUSQUEDA POR "NO LEIDO" -----
        imap.search(["UNSEEN", ["FROM", FILTRO_REMITENTE]], (err, results) => {
          if (err) {
            logger("error", `Error en la busqueda: ${err.message}`);
            return reject(err);
          }

          if (!results || !results.length) {
            console.log("No hay correos nuevos");
            imap.end();
            return resolve([]);
          }

          // ----- 3. LECTURA (SE MARCAN COMO LEIDOS) -----
          const f = imap.fetch(results, { bodies: "", markSeen: true });
          const promesasMensajes = [];

          f.on("message", (msg, seqno) => {
            const promesaMensaje = new Promise((resolveMsg) => {
              msg.on("body", (stream) => {
                simpleParser(stream, async (err, parsed) => {
                  if (err) {
                    logger("error", `Error al parsear: ${err.message}`);
                    return resolveMsg();
                  }

                  // ----- 4. EXTRACCION -----
                  const textoParaBuscar = parsed.text.replace(/\s+/g, " ");

                  // ===== REGEX =====
                  const regexGlobal =
                    /Código Presvet:\s*(\d+)\s*Número Receta:\s*([A-Z0-9-]+)/gi;

                  let match;
                  const hallazgos = [];

                  // --- Buscar todas las coincidencias ---
                  while ((match = regexGlobal.exec(textoParaBuscar)) !== null) {
                    hallazgos.push({
                      presvet: match[1],
                      receta: match[2],
                    });
                  }

                  // ----- 5. ESCRITURA -----
                  if (hallazgos.length > 0) {
                    try {
                      const rutaArchivo = path.join(
                        __dirname,
                        "../../data/codigos.txt",
                      );

                      for (const item of hallazgos) {
                        // ESCRIBIR EN TXT
                        const linea = `Fecha: ${new Date().toLocaleString()} | Presvet: ${item.presvet} | Receta: ${item.receta}\n`;
                        fs.appendFileSync(rutaArchivo, linea);

                        // ESCRIBIR EN EXCEL
                        await guardarEnExcel({
                          asunto: parsed.subject,
                          fecha: new Date().toLocaleString(),
                          presvet: item.presvet,
                          receta: item.receta,
                        });
                      }

                      console.log(
                        `✅ [${seqno}] Procesados ${hallazgos.length} códigos de este correo.`,
                      );
                    } catch (e) {
                      logger("error", `Error escribiendo datos: ${e.message}`);
                    }
                  } else {
                    console.log(
                      `[${seqno}] Sin códigos válidos en: ${parsed.subject}`,
                    );
                  }
                  resolveMsg();
                });
              });
            });
            promesasMensajes.push(promesaMensaje);
          });

          f.once("error", (err) => {
            logger("error", `Error en el fetch: ${err.message}`);
            reject(err);
          });

          f.once("end", async () => {
            await Promise.all(promesasMensajes);
            console.log("Lectura y marcado como leído finalizado.");
            imap.end();
            resolve();
          });
        });
      });
    });

    imap.once("error", (err) => {
      logger("error", `Error crítico de conexión IMAP: ${err.message}`);
      reject(err);
    });

    imap.connect();
  });
};

module.exports = { leerUltimosCorreos };
