"""Playwright adapter. Manual login only; this module never submits the form."""


class PortalReadError(RuntimeError):
    pass


class PlaywrightPortal:
    def __init__(self):
        self._playwright = None
        self._browser = None
        self._page = None
        self._bot = None

    def open(self, schedule_id):
        from connector import AISBrowser
        if self._browser is None:
            from playwright.sync_api import sync_playwright
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=False)
            self._page = self._browser.new_page()
        self._bot = AISBrowser(self._page, schedule_id)

    def open_login(self):
        self._bot.open_login()

    def read_visible_days(self, location):
        from playwright.sync_api import TimeoutError as PlaywrightTimeout
        from connector import PortalChanged
        try:
            self._bot.open_schedule()
            self._bot.select_location(location)
            return self._bot.visible_consulate_days()
        except (PortalChanged, PlaywrightTimeout) as exc:
            raise PortalReadError('calendar') from exc

    def close(self):
        if self._browser is not None:
            self._browser.close()
            self._browser = None
        self._page = None
        self._bot = None
        if self._playwright is not None:
            self._playwright.stop()
            self._playwright = None
