# Extractor de códigos por correo (Microsoft Graph)
Proyecto Node.js que automatiza la lectura de correos y la extracción de códigos para generar un registro histórico.
## Qué hace actualmente
- Lee correos desde Microsoft 365 usando Graph API.
- Filtra por remitente y rango de días configurable.
- Extrae pares `Código Presvet` / `Número Receta`.
- Detecta incidencias y las marca en el Excel.
- Guarda resultados en un Excel diario dentro de `data/`.
- Evita duplicados con un registro local de IDs procesados.
- Envía notificación opcional por webhook cuando hay incidencias.
## Uso rápido
1. Instalar dependencias:
   - `npm install`
2. Crear `.env` a partir de `.env.example`.
3. Ejecutar:
   - `node src/app.js`
## Variables principales de entorno
- `GRAPH_TENANT_ID`
- `GRAPH_CLIENT_ID`
- `GRAPH_CLIENT_SECRET`
- `MAILBOX_USER`
- `FILTRO_REMITENTE`
- `TOP`
- `DIAS_ATRAS`
- `CLIQ_WEBHOOK_URL` (opcional)
## Seguridad
- No subas `.env` ni secretos reales.
- El repositorio ignora `data/`, `logs/`, `*.pdf` y otros archivos locales definidos en `.gitignore`.
- Usa siempre valores de ejemplo en `.env.example`.
## Nota de migración
Este proyecto fue migrado desde una implementación anterior basada en IMAP. La versión actual ya no usa IMAP para la lectura de correos; ahora utiliza Microsoft Graph API.
