require("isomorphic-fetch");
const { Client } = require("@microsoft/microsoft-graph-client");
const { guardarEnExcel } = require("../utils/excelHandler");
const { logger } = require("../utils/logger");
const { enviarEmailError } = require("../utils/sendMail");
const {
  yaFueProcesado,
  marcarComoProcesado,
} = require("../utils/processedIds");
const graphConfig = require("../config/graphConfig");

// ============================================================
//  CONFIG
// ============================================================
const FILTRO_REMITENTE = process.env.FILTRO_REMITENTE;
const TOP = parseInt(process.env.TOP) || 50;
const DIAS_ATRAS = parseInt(process.env.DIAS_ATRAS) || 5;

// ============================================================
//  AUTH
// ============================================================
const getAccessToken = async () => {
  const url = `https://login.microsoftonline.com/${process.env.GRAPH_TENANT_ID}/oauth2/v2.0/token`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.GRAPH_CLIENT_ID,
      client_secret: process.env.GRAPH_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
    }),
  });
  const data = await response.json();
  if (!data.access_token) {
    throw new Error(`Error obteniendo token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
};

const client = Client.initWithMiddleware({
  authProvider: { getAccessToken },
});

// ============================================================
//  HELPERS
// ============================================================
const stripHtml = (html) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

/** Extrae pares Presvet/Receta de un fragmento */
const extraerPresvetReceta = (texto) => {
  const regex = /Código\s+Presvet:\s*(\d+)\s*Número\s+Receta:\s*([A-Z0-9-]+)/gi;
  const hallazgos = [];
  let match;
  while ((match = regex.exec(texto)) !== null) {
    hallazgos.push({ presvet: match[1], receta: match[2] });
  }
  return hallazgos;
};

/**
 * Extrae incidencias por Presvet de un fragmento.
 * Formato: "Código Presvet: XXXX Incidencia: descripción"
 * Devuelve { presvetId: textoIncidencia }
 */
const extraerIncidencias = (fragmento) => {
  const mapa = {};
  const regex = /Código\s+Presvet:\s*(\d+)\s*Incidencia:\s*([^\n\r]+)/gi;
  let match;
  while ((match = regex.exec(fragmento)) !== null) {
    mapa[match[1]] = match[2].trim();
  }
  return mapa;
};

/**
 * Detecta si un fragmento de texto de UN bloque de trabajo contiene incidencias.
 * Solo mira patrones dentro del fragmento, no en todo el correo.
 * Devuelve array de strings descriptivos, vacío si no hay error.
 */
const detectarErroresEnBloque = (fragmento) => {
  // La señal más fiable: sección explícita de incidencias del sistema Presvet
  const tieneSeccionIncidencias =
    /Se han generado las siguientes incidencias/i.test(fragmento);
  if (tieneSeccionIncidencias) {
    return ["Sección de incidencias detectada en este trabajo"];
  }

  // Patrones genéricos de error — solo si no es texto de instrucciones/saludo
  const patronesError = [
    /error/i,
    /fallo/i,
    /excepci[oó]n/i,
    /rechazad[ao]/i,
    /no\s+procesad[ao]/i,
    /inv[aá]lid[ao]/i,
  ];

  const errores = [];
  for (const patron of patronesError) {
    if (patron.test(fragmento)) {
      errores.push(`Patrón detectado: "${patron.source}"`);
    }
  }
  return errores;
};

/**
 * Divide el texto del correo en bloques por número de trabajo.
 * Cada bloque incluye:
 *   - numeroTrabajo
 *   - hallazgos: [{ presvet, receta }]
 *   - incidencias: { presvetId: textoIncidencia }
 *   - errores: [string]  ← solo los del propio bloque
 */
const extraerBloquesPorTrabajo = (texto) => {
  const bloques = [];
  const regexTrabajo = /El\s+trabajo\s+(\d+)\s+ha\s+finalizado/gi;
  const posiciones = [];
  let m;

  while ((m = regexTrabajo.exec(texto)) !== null) {
    posiciones.push({ index: m.index, numeroTrabajo: m[1] });
  }

  if (posiciones.length === 0) {
    const hallazgos = extraerPresvetReceta(texto);
    if (hallazgos.length > 0) {
      bloques.push({
        numeroTrabajo: "DESCONOCIDO",
        hallazgos,
        incidencias: extraerIncidencias(texto),
        errores: detectarErroresEnBloque(texto),
      });
    }
    return bloques;
  }

  for (let i = 0; i < posiciones.length; i++) {
    const inicio = posiciones[i].index;
    const fin = posiciones[i + 1]?.index ?? texto.length;
    const fragmento = texto.slice(inicio, fin);

    bloques.push({
      numeroTrabajo: posiciones[i].numeroTrabajo,
      hallazgos: extraerPresvetReceta(fragmento),
      incidencias: extraerIncidencias(fragmento),
      errores: detectarErroresEnBloque(fragmento),
    });
  }

  return bloques;
};

// ============================================================
//  ENDPOINT  (comentado hasta que este creado)
// ============================================================
/*
const ENDPOINT_URL = process.env.ENDPOINT_URL;

const enviarAlEndpoint = async ({ numeroTrabajo, codigoPresvet, codigoReceta }) => {
  const payload = {
    numeroTrabajo,    // ← ajustar nombres cuando llegue el contrato de API
    codigoPresvet,
    codigoReceta,
  };
  const response = await fetch(ENDPOINT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const texto = await response.text();
    throw new Error(`Endpoint respondió ${response.status}: ${texto}`);
  }
  const resultado = await response.json();
  console.log("Enviado al endpoint:", resultado);
  return resultado;
};
*/

// ============================================================
//  FUNCIÓN PRINCIPAL
// ============================================================
const leerUltimosCorreos = async () => {
  try {
    const fechaDesde = new Date();
    fechaDesde.setDate(fechaDesde.getDate() - DIAS_ATRAS);
    fechaDesde.setHours(0, 0, 0, 0);
    const fechaISO = fechaDesde.toISOString();

    const res = await client
      .api(`/users/${graphConfig.mailbox}/messages`)
      .header("Prefer", 'outlook.body-content-type="text"')
      .filter(
        `from/emailAddress/address eq '${FILTRO_REMITENTE}' and receivedDateTime ge ${fechaISO}`,
      )
      .top(TOP)
      .get();

    const mensajes = (res.value || []).sort(
      (a, b) => new Date(b.receivedDateTime) - new Date(a.receivedDateTime),
    );

    if (!mensajes.length) {
      console.log(
        `ℹ️  No hay correos de ${FILTRO_REMITENTE} en los últimos ${DIAS_ATRAS} días.`,
      );
      return;
    }

    console.log(`📬 ${mensajes.length} correo(s) encontrado(s).`);

    for (const msg of mensajes) {
      const msgId = msg.id;

      // ── Control de duplicados ──────────────────────────────────────────
      if (yaFueProcesado(msgId)) {
        console.log(`⏭️  Correo ya procesado, omitiendo: "${msg.subject}"`);
        continue;
      }
      // ──────────────────────────────────────────────────────────────────

      const texto = stripHtml(msg.body?.content || "");
      const asunto = msg.subject || "(sin asunto)";
      const fechaRecibido = msg.receivedDateTime;

      // Extrae bloques con detección de errores por bloque
      const bloques = extraerBloquesPorTrabajo(texto);
      const totalCodigos = bloques.reduce(
        (acc, b) => acc + b.hallazgos.length,
        0,
      );

      if (totalCodigos === 0) {
        logger(
          "warn",
          `Correo sin códigos reconocibles: "${asunto}" (${fechaRecibido})`,
        );
        console.log(`⚠️  Sin códigos en: "${asunto}"`);
        marcarComoProcesado(msgId);
        continue;
      }

      // Recoger trabajos con error para el email de alerta (solo los que realmente tienen error)
      const trabajosConError = bloques.filter((b) => b.errores.length > 0);

      if (trabajosConError.length > 0) {
        const descripcionErrores = trabajosConError
          .map((b) => {
            const detalleIncidencias = Object.entries(b.incidencias)
              .map(([presvet, texto]) => `Presvet ${presvet}: ${texto}`)
              .join("; ");
            return `Trabajo ${b.numeroTrabajo}: ${b.errores.join(", ")}${detalleIncidencias ? " → " + detalleIncidencias : ""}`;
          })
          .join("\n");

        logger(
          "warn",
          `Error detectado en correo "${asunto}":\n${descripcionErrores}`,
        );

        console.log(`📧 Enviando email de alerta para "${asunto}"...`);
        await enviarEmailError({
          asunto,
          fechaRecibido,
          descripcion: descripcionErrores,
        });
      }

      // Guardar filas en Excel
      for (const bloque of bloques) {
        const hayErrorEnBloque = bloque.errores.length > 0;

        for (const item of bloque.hallazgos) {
          const incidenciaPresvet = bloque.incidencias[item.presvet] || "";
          const detalleCompleto = [
            ...bloque.errores,
            incidenciaPresvet ? `Incidencia: ${incidenciaPresvet}` : "",
          ]
            .filter(Boolean)
            .join(" | ");

          await guardarEnExcel({
            asunto,
            fechaRecibido,
            numeroTrabajo: bloque.numeroTrabajo,
            presvet: item.presvet,
            receta: item.receta,
            tieneError: hayErrorEnBloque || !!incidenciaPresvet,
            detalleError: detalleCompleto,
          });

          // ── Envío al endpoint (descomentar cuando esté listo) ──────────
          // await enviarAlEndpoint({
          //   numeroTrabajo:  bloque.numeroTrabajo,
          //   codigoPresvet:  item.presvet,
          //   codigoReceta:   item.receta,
          // });
          // ───────────────────────────────────────────────────────────────
        }
      }

      const resumenTrabajos = bloques
        .map((b) => {
          const tag = b.errores.length > 0 ? " ⚠️" : "";
          return `Trabajo ${b.numeroTrabajo}: ${b.hallazgos.length} código(s)${tag}`;
        })
        .join(", ");

      console.log(
        `✅ ${totalCodigos} código(s) guardados. [${resumenTrabajos}]`,
      );

      // Marcar como procesado (anti-duplicados)
      marcarComoProcesado(msgId);

      // Marcar como leído en el buzón si no lo estaba
      if (!msg.isRead) {
        await client
          .api(`/users/${graphConfig.mailbox}/messages/${msgId}`)
          .update({ isRead: true });
      }
    }
  } catch (err) {
    logger("error", err.message);
    throw err;
  }
};

module.exports = { leerUltimosCorreos };
