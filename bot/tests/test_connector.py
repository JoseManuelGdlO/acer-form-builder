from connector import AISBrowser
from portal import PlaywrightPortal

FORM = '#appointments_consulate_appointment_facility_id'


class _Loc:
    def __init__(self, page, present):
        self.page = page
        self.present = present

    def count(self):
        return 1 if self.present() else 0

    def click(self):
        self.page.clicks += 1
        self.page.phase += 1

    def wait_for(self, timeout):
        if not self.present():
            raise TimeoutError('form')

    @property
    def first(self):
        return self


class _Page:
    def __init__(self, links=True):
        self.clicks = 0
        self.phase = 0
        self.links = links
        self.gone = None

    def locator(self, selector):
        if selector == FORM:
            return _Loc(self, lambda: self.phase >= 2)
        return _Loc(self, lambda: self.links and self.phase < 2)

    def wait_for_load_state(self, state):
        return None

    def goto(self, url, wait_until):
        self.gone = url
        self.phase = 2


def test_clicks_through_to_the_calendar_form():
    page = _Page()
    AISBrowser(page, '123456').open_schedule()
    assert page.clicks == 2
    assert page.gone is None


def test_opens_the_form_directly_when_there_is_no_link():
    page = _Page(links=False)
    AISBrowser(page, '123456').open_schedule()
    assert page.clicks == 0
    assert page.gone.endswith('/schedule/123456/appointment')


class _LoginPage:
    def __init__(self, url, email=1):
        self.url = url
        self.email = email

    def locator(self, selector):
        class _Count:
            def count(_self):
                return self.email
        return _Count()


def test_login_counts_when_the_form_is_gone():
    portal = PlaywrightPortal()
    portal._page = _LoginPage('https://ais.usvisa-info.com/es-mx/niv/users/sign_in', email=0)
    assert portal.session_started() is True
    portal._page = _LoginPage('https://ais.usvisa-info.com/es-mx/niv/users/sign_in', email=1)
    assert portal.session_started() is False
