require("isomorphic-fetch");

/**
 * Limpia el texto de la incidencia eliminando la firma del correo y texto legal.
 * Corta en el primer indicador de firma que encuentre.
 */
const limpiarTextoIncidencia = (texto) => {
  // Patrones que marcan el inicio de la firma / pie de correo
  const cortesFirma = [
    /Un saludo[,.]?\s*\n/i,
    /Un saludo[,.]?\s*$/im,
    /Atentamente[,.]?\s*\n/i,
    /Por favor no imprima/i,
    /Este mensaje y sus documentos/i,
    /\[cid:/i, // imagen embebida de firma
    /https?:\/\/.*firma/i, // URL de imagen de firma
  ];

  let indiceCorte = texto.length;

  for (const patron of cortesFirma) {
    const match = patron.exec(texto);
    if (match && match.index < indiceCorte) {
      indiceCorte = match.index;
    }
  }

  return texto.slice(0, indiceCorte).trim();
};

/**
 * Envía una notificación al canal de Zoho Cliq configurado en CLIQ_WEBHOOK_URL.
 * Si la variable no está definida, lo omite silenciosamente.
 *
 * @param {object} params
 * @param {string} params.asunto        - Asunto del correo original
 * @param {string} params.fechaRecibido - Fecha del correo original
 * @param {string} params.descripcion   - Detalle de los errores/incidencias
 */
const enviarEmailError = async ({ asunto, fechaRecibido, descripcion }) => {
  const webhookUrl = process.env.CLIQ_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log("ℹ️  CLIQ_WEBHOOK_URL no configurado, omitiendo notificación.");
    return;
  }

  const fecha = new Date(fechaRecibido).toLocaleString("es-ES");
  const descripcionLimpia = limpiarTextoIncidencia(descripcion);

  const texto =
    `⚠️ *INCIDENCIA PRESVET*\n` +
    `📧 Correo: *${asunto}*\n` +
    `📅 Fecha recibido: ${fecha}\n` +
    `📋 Detalle:\n${descripcionLimpia}`;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: texto }),
    });

    if (res.ok) {
      console.log("✅ Notificación enviada a Zoho Cliq");
    } else {
      const err = await res.text();
      console.error(`❌ Cliq webhook respondió ${res.status}: ${err}`);
    }
  } catch (err) {
    console.error(`❌ Error enviando a Cliq: ${err.message}`);
  }
};

module.exports = { enviarEmailError };
