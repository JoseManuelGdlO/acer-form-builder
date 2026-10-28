"""Interactive one-account validation. Does not auto-submit without explicit opt-in."""
import argparse
from datetime import date
from playwright.sync_api import sync_playwright
from connector import AISBrowser, FACILITIES


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--schedule-id', required=True)
    p.add_argument('--location', choices=FACILITIES, required=True)
    p.add_argument('--current-date', type=date.fromisoformat, required=True)
    p.add_argument('--earliest', type=date.fromisoformat, required=True)
    p.add_argument('--latest', type=date.fromisoformat, required=True)
    args = p.parse_args()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        bot = AISBrowser(page, args.schedule_id)
        bot.open_login()
        input('Inicia sesión manualmente, resuelve verificaciones y presiona ENTER aquí... ')
        bot.open_schedule()
        bot.select_location(args.location)
        dates = [d for d in bot.visible_consulate_days() if args.earliest <= d <= args.latest and d < args.current_date]
        print('Fechas visibles candidatas (NO confirmadas):', [d.isoformat() for d in dates])
        print('La búsqueda completa de horarios CAS/consulado requiere validar la UI actual.')
        input('Presiona ENTER para cerrar... ')
        browser.close()

if __name__ == '__main__':
    main()
