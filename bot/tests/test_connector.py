from datetime import date
import os

import pytest
from connector import AISBrowser, calendar_step
from portal import MAX_READS, QUERY_CAP, PlaywrightPortal, PortalReadError, load_env

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


def test_steps_back_when_the_visible_month_is_past_the_range():
    assert calendar_step(date(2027, 8, 1), date(2026, 12, 31)) == 'prev'
    assert calendar_step(date(2026, 11, 1), date(2026, 12, 31)) == 'next'


class _Option:
    def __init__(self, page):
        self.page = page

    def count(self):
        return 1 if self.page.phase == 0 else 0

    def click(self):
        self.page.events.append('programe')
        self.page.phase = 1

    @property
    def first(self):
        return self


class _EnterPage:
    def __init__(self):
        self.phase = 0
        self.clicks = 0
        self.events = []
        self.gone = None

    def locator(self, selector):
        if selector == FORM:
            return _Loc(self, lambda: self.phase >= 2)
        return _Loc(self, lambda: self.phase == 1)

    def get_by_text(self, pattern):
        return _Option(self)

    def wait_for_load_state(self, state):
        return None

    def goto(self, url, wait_until):
        self.gone = url


def test_clicks_schedule_option_then_enters():
    page = _EnterPage()
    AISBrowser(page, '123456').open_schedule()
    assert page.events == ['programe']
    assert page.clicks == 1
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


class _FillPage:
    def __init__(self, email_field=True):
        self.fills = []
        self.gone = None
        self.email_field = email_field

    def goto(self, url, wait_until):
        self.gone = url

    def wait_for_load_state(self, state):
        return None

    def evaluate(self, script):
        self.fills.append('scroll')

    def locator(self, selector):
        page = self
        present = self.email_field if selector == '#user_email' else True
        if selector == 'label':
            present = True

        class Field:
            def count(self):
                return 1 if present else 0

            def fill(self, value):
                page.fills.append(selector)

            def click(self):
                page.fills.append(selector)

            def check(self):
                page.fills.append(selector)

            def scroll_into_view_if_needed(self):
                return None

            def filter(self, has_text=None):
                return self

            @property
            def first(self):
                return self

        return Field()


def test_open_login_skips_fill_without_credentials():
    page = _FillPage()
    AISBrowser(page, '123456').open_login()
    assert page.fills == []
    assert page.gone.endswith('/users/sign_in')


def test_open_login_fills_when_credentials_are_passed():
    page = _FillPage()
    AISBrowser(page, '123456').open_login('a@b.c', 'secret')
    assert page.fills == ['scroll', '#user_email', '#user_password', 'label', 'input[name="commit"]']


class _CapBot:
    def open_schedule(self):
        return None

    def select_location(self, location):
        return None

    def visible_consulate_days(self):
        return []


def test_load_env_fills_missing_keys(tmp_path, monkeypatch):
    monkeypatch.delenv('VISA_EMAIL', raising=False)
    monkeypatch.delenv('VISA_PASSWORD', raising=False)
    monkeypatch.setenv('KEEP_ME', '1')
    env = tmp_path / '.env'
    env.write_text('VISA_EMAIL=a@b.c\nVISA_PASSWORD=secret\nKEEP_ME=no\n# skip\n', encoding='utf-8')
    load_env(env)
    assert os.environ['VISA_EMAIL'] == 'a@b.c'
    assert os.environ['VISA_PASSWORD'] == 'secret'
    assert os.environ['KEEP_ME'] == '1'


def test_sixth_read_stops():
    portal = PlaywrightPortal()
    portal._bot = _CapBot()
    for _ in range(MAX_READS):
        portal.read_visible_days('Monterrey')
    with pytest.raises(PortalReadError, match='tope de 5'):
        portal.read_visible_days('Monterrey')
    assert QUERY_CAP.startswith('Se llegó al tope')
