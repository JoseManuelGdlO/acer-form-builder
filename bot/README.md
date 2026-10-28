# Visa Appointment Monitor — unificado

Implementación propia en **Python + Playwright**. Integra el prototipo de navegador del ZIP adquirido con conceptos generales de un monitor de citas (restricciones de fechas, selección de mejor oportunidad y auditoría). **No incorpora código del repositorio `jeangnc/us-visa-bot`** porque su licencia PolyForm Noncommercial no autoriza uso comercial sin licencia separada.

## Componentes

- `connector.py`: navegador Playwright, lectura de días visibles y métodos de selección/envío **pendientes de validación en el portal real**.
- `run.py`: prueba interactiva de **una sola cuenta**, inicio de sesión manual y lectura de días visibles; **no envía reprogramaciones**.
- `engine.py`: modelo de solicitantes, reglas de fechas, elección de oportunidad, registro SQLite y carga de grupos (máximo 50 por manifiesto).
- `groups.py`: prepara y valida un grupo, exige consentimiento registrado antes de considerar cada cuenta lista; **no genera tráfico al portal**.
- `applicants.example.json`: estructura ficticia de grupo.

## Página para quien opera

Desde esta carpeta, con el entorno ya creado:

```bash
source .venv/bin/activate
python web.py
```

La terminal muestra `http://127.0.0.1:8765`. Ábrela en el navegador. Ahí se arma el grupo y se consultan fechas. El inicio de sesión del portal sigue siendo manual, y la página no confirma ni reprograma la cita.

La primera vez que se vaya a consultar fechas:

```bash
python -m playwright install chromium
```

## Instalación

En esta Mac el comando es `python3`, no `python`.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m playwright install chromium
python -m pytest -q
```

Prueba del calendario con cuenta autorizada (requiere validar selectores actuales):

```bash
python run.py --schedule-id 123456 --location Monterrey --current-date 2027-08-20 --earliest 2026-11-01 --latest 2026-12-31
```

Preparación del grupo (sin conectarse al portal):

```bash
python groups.py --manifest applicants.example.json
```

## Limitaciones y pasos pendientes

1. **No se ha validado contra el portal real**, ni se conocen los límites y condiciones precisos de la autorización recibida.
2. `run.py` solo consulta días visibles. No enumera horarios ni combina CAS/consulado automáticamente.
3. La selección/envío en `connector.py` es experimental y no se activa desde el CLI; requiere verificación en cuenta de prueba y confirmación oficial.
4. Falta cola duradera de monitoreo, credenciales cifradas y aislamiento persistente de sesiones para 50 cuentas. `groups.py` **no** es un monitor concurrente.
5. Los identificadores de instalaciones y selectores heredados del ZIP pueden estar desactualizados.
6. No se implementa evasión de CAPTCHA, IP rotation ni acceso a endpoints internos no documentados.

## Licencias

La lógica de este proyecto es independiente; se utilizan ideas generales de monitoreo, sin copiar archivos del repositorio público con licencia no comercial. Revisar las licencias de dependencias antes de distribución.
