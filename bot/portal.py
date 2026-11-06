"""Playwright adapter. Manual login only; this module never submits the form."""
from pathlib import Path
import os

STORAGE = Path(__file__).resolve().parent / 'data' / 'storage_state.json'
ENV_FILE = Path(__file__).resolve().parent / '.env'
MAX_READS = 5
QUERY_CAP = 'Se llegó al tope de 5 consultas. No se confirmó ninguna cita.'


def load_env(path=ENV_FILE):
    if not Path(path).exists():
        return
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = value.strip().strip('"').strip("'")


class PortalReadError(RuntimeError):
    pass


class PlaywrightPortal:
    def __init__(self):
        self._playwright = None
        self._browser = None
        self._context = None
        self._page = None
        self._bot = None
        self._reads = 0

    def open(self, schedule_id):
        from connector import AISBrowser
        if self._browser is None:
            from playwright.sync_api import sync_playwright
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=False)
            kwargs = {}
            if STORAGE.exists():
                kwargs['storage_state'] = str(STORAGE)
            self._context = self._browser.new_context(**kwargs)
            self._page = self._context.new_page()
        self._bot = AISBrowser(self._page, schedule_id)

    def open_login(self):
        if self.session_started():
            return
        load_env()
        self._bot.open_login(os.environ.get('VISA_EMAIL', ''), os.environ.get('VISA_PASSWORD', ''))
        if self.session_started():
            self._save_state()

    def account_locked(self):
        return bool(self._bot is not None and self._bot.account_locked())

    def session_started(self):
        page = self._page
        if page is None:
            return False
        url = (page.url or '').split('?', 1)[0]
        if not url.startswith('http'):
            return False
        if 'sign_in' in url:
            return False
        if self._bot is not None and self._bot._wall_up():
            return False
        if page.locator('.swal2-container, .swal2-shown').count():
            return False
        return True

    def read_visible_days(self, location, earliest=None, latest=None, current=None):
        from playwright.sync_api import TimeoutError as PlaywrightTimeout
        from connector import PortalChanged
        if self._reads >= MAX_READS:
            raise PortalReadError(QUERY_CAP)
        self._reads += 1
        try:
            self._save_state()
            self._bot.open_schedule()
            self._bot.select_location(location)
            if earliest is not None and latest is not None:
                return self._bot.pick_day_in_range(earliest, latest, current)
            return self._bot.visible_consulate_days()
        except (PortalChanged, PlaywrightTimeout) as exc:
            raise PortalReadError('calendar') from exc

    def close(self):
        if self._browser is not None:
            self._browser.close()
            self._browser = None
        self._context = None
        self._page = None
        self._bot = None
        if self._playwright is not None:
            self._playwright.stop()
            self._playwright = None

    def _save_state(self):
        if self._context is None:
            return
        STORAGE.parent.mkdir(parents=True, exist_ok=True)
        self._context.storage_state(path=str(STORAGE))
