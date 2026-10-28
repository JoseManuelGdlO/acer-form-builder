# Página local del monitor de citas

**Date:** 2026-10-26  
**Status:** Approved for implementation  
**Scope:** Pantalla en español para quien opera el monitor, servida por el bot en esta computadora

## Goal

Quien opera abre una página en el navegador, arma el grupo con un formulario y consulta fechas de una persona autorizada. No edita JSON ni usa la terminal para esas tareas. La página no confirma ni reprograma citas.

## Decisions

| Topic | Decision |
|-------|----------|
| Quién la usa | Quien opera el monitor de citas |
| Cómo entra el grupo | Formulario en pantalla. Sin subir archivos |
| Dónde vive | Proceso local del bot, solo en `127.0.0.1` |
| Guardado | `bot/data/group.json` más auditoría en `bot/data/audit.sqlite3` |
| Consulta | Una a la vez. Chromium visible, inicio de sesión manual, lectura de días visibles |
| Envío al portal | Fuera de esta página. No se llama al envío automático |

## Screen

Una sola página, en español, con tres zonas.

1. **Grupo.** Nombre del grupo, compartido por todas las personas. Máximo 50.
2. **Persona.** Identificador, número de cita (solo dígitos), consulado, cita actual, fecha más temprana, fecha más tardía y la casilla «Esta persona autorizó consultar su cita». Se puede editar o quitar. Con consentimiento el estado es «Lista para consultar». Sin consentimiento es «Falta autorización» y el botón de consulta queda apagado.
3. **Consulta.** «Consultar fechas» abre Chromium. La página pide iniciar sesión y pulsar «Ya inicié sesión». Luego muestra las fechas candidatas, o un aviso si no hay ninguna. Esas fechas no están confirmadas.

Los consulados de la lista son los que ya conoce el conector: Ciudad Juárez, Guadalajara, Hermosillo, Matamoros, Mérida, Ciudad de México, Monterrey, Nogales, Nuevo Laredo y Tijuana. En el archivo se guardan las claves que ya usa el motor (`Ciudad Juarez`, `Mexico City`, `Merida`, y el resto igual).

## Architecture

- `bot/group_store.py` guarda y valida el grupo. Reutiliza `Applicant` y `AuditStore`.
- `bot/session.py` lleva la consulta: abrir navegador, esperar el clic, leer días y filtrar por la ventana de fechas. El navegador entra por un objeto inyectable, para probar sin Chromium.
- `bot/portal.py` es el adaptador de Playwright. Traduce fallos del calendario a un error propio.
- `bot/web.py` sirve la página y el API solo en `127.0.0.1`, puerto `8765`.
- `bot/static/index.html` es la página. Usa las variables HSL de marca ya definidas en el proyecto, Urbanist para títulos y Epilogue para el texto.

El archivo del grupo puede ser la lista que ya lee el motor, o un objeto `{"group_id", "applicants"}` para no perder el nombre cuando todavía no hay personas. `manifest_rows()` devuelve la lista compatible con `load_applicants`.

No se guardan contraseñas, cookies ni tokens. La auditoría registra el estado de autorización y el resultado de la lectura.

## Errors

Mensajes en español, sin texto del portal:

- Nombre de grupo vacío
- Identificador vacío, repetido o persona inexistente
- Número de cita que no es solo dígitos
- Consulado fuera de la lista
- Fecha inválida, o la más temprana posterior a la más tardía
- Más de 50 personas
- Consulta sin autorización, o cuando ya hay otra abierta
- El navegador no abre, el calendario no se puede leer, o no hay fechas en el rango

En esos fallos de lectura no queda ninguna cita confirmada.

## Testing

Pruebas de agregar, editar, quitar, renombrar el grupo y validar, sin navegador. La consulta se prueba con un portal falso: filtro de fechas, falta de autorización, consulta duplicada, cierre y fallo de lectura. El API se prueba en `127.0.0.1` con un puerto efímero. Las pruebas actuales del motor se mantienen.

## How to open

Desde `bot`, con el entorno ya creado: `python web.py`. La terminal imprime `http://127.0.0.1:8765`. Chromium de Playwright tiene que estar instalado una vez para la consulta real.
