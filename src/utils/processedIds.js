const fs = require("fs");
const path = require("path");

// Guarda los IDs en data/processed_ids.json
const RUTA = path.join(__dirname, "../../data/processed_ids.json");

/** Carga el conjunto de IDs ya procesados desde disco */
const cargarIds = () => {
  try {
    if (!fs.existsSync(RUTA)) return new Set();
    const contenido = fs.readFileSync(RUTA, "utf-8");
    return new Set(JSON.parse(contenido));
  } catch {
    return new Set();
  }
};

/** Persiste el conjunto de IDs en disco */
const guardarIds = (ids) => {
  const dir = path.dirname(RUTA);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(RUTA, JSON.stringify([...ids]), "utf-8");
};

/**
 * Devuelve true si el correo con este ID ya fue procesado en una ejecución anterior.
 * @param {string} msgId
 */
const yaFueProcesado = (msgId) => {
  const ids = cargarIds();
  return ids.has(msgId);
};

/**
 * Registra el ID del correo como procesado para que futuras ejecuciones lo omitan.
 * @param {string} msgId
 */
const marcarComoProcesado = (msgId) => {
  const ids = cargarIds();
  ids.add(msgId);
  guardarIds(ids);
};

module.exports = { yaFueProcesado, marcarComoProcesado };
