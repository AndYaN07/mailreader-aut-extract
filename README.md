# MailReader Automation: Extracción y Procesamiento IMAP de Datos Médicos

Este proyecto nace durante mi periodo de **FCT (Formación en Centros de Trabajo)** para el Grado Superior en **Desarrollo de Aplicaciones Multiplataforma (DAM)**. El objetivo principal es la transformación de un proceso administrativo manual en un flujo de trabajo automatizado y eficiente.

---

## 🚀 El Problema: Gestión Manual Ineficiente
En el entorno operativo de la empresa, la recepción de códigos y números de recetas médicas se gestionaba de forma artesanal:
* **Proceso:** El personal debía abrir cada correo, copiar manualmente los datos y pegarlos en registros externos.
* **Impacto:** Alto consumo de tiempo operativo, riesgo de errores tipográficos en códigos críticos y falta de un histórico centralizado fiable.

## 💡 La Solución: Automatización con Node.js
He desarrollado un script de automatización que actúa como un puente inteligente entre el servidor de correo y la persistencia de datos:
1.  **Monitoreo IMAP:** Conecta con la bandeja de entrada y filtra correos no leídos (`UNSEEN`).
2.  **Extracción Predictiva:** Identifica y extrae automáticamente `fecha`, `asunto`, `código` y `número de receta`.
3.  **Registro y Auditoría:** Vuelca la información en archivos Excel estructurados y genera logs de errores para garantizar la trazabilidad del proceso.

---

## 🛠️ Stack Tecnológico
* **Runtime:** `Node.js`
* **Protocolo:** `IMAP` (Librería para conexión segura con servidores de correo).
* **Gestión de Datos:** `ExcelJS` / `XLSX` para la manipulación de hojas de cálculo.
* **Entorno:** `dotenv` para la gestión segura de credenciales.

---

## ⚙️ Configuración del Sistema

Para replicar este entorno, es necesario crear un archivo `.env` en la raíz del proyecto:

| Variable | Función |
| :--- | :--- |
| `EMAIL_USER` | Cuenta de correo (Gmail/Outlook) |
| `EMAIL_PASS` | App Password (No usar contraseña principal) |
| `IMAP_HOST` | Host del servidor (ej: `imap.gmail.com`) |
| `IMAP_PORT` | Puerto de conexión (habitualmente `993`) |

> **NOTA DE SEGURIDAD:** Este proyecto está configurado para ignorar el archivo `.env` mediante `.gitignore`.

---

## 📊 Arquitectura de Automatización (Windows)

Para que el script funcione de forma autónoma en el servidor de la empresa, se implementó mediante el **Programador de Tareas de Windows**:

1.  **Script de Lote (`.bat`):** Se utiliza `bot_ex.bat` como disparador.
2.  **Persistencia:** Es vital configurar el campo **"Iniciar en"** con la ruta raíz del proyecto para que Node.js localice las dependencias y el entorno.
3.  **Robustez:** En caso de fallo crítico (ej. caída de red o actualización de librerías), el sistema genera automáticamente un log `.txt` detallando la excepción.

---

## 📈 Estado del Proyecto y Escalabilidad
Actualmente, el sistema cumple con la función de **Gestor de Históricos**. La arquitectura modular permite escalar hacia:
* **Microservicio de Notificaciones:** Envío automático de confirmaciones tras procesar una receta.
* **Filtros Avanzados:** Capacidad de segmentar por múltiples remitentes o palabras clave en el cuerpo del mensaje.

---

**Desarrollado como proyecto de FCT - 2º DAM** \
Anderson Guanche | 2026