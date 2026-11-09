from datetime import date
import os

import pytest
from connector import AISBrowser, STEP_DELAY_MS, TYPE_DELAY_MS, calendar_step, PortalChanged
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

    def wait_for(self, timeout=None, state=None):
        if not self.present():
            raise TimeoutError('form')

    def filter(self, has_text=None):
        return self

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
        if 'swal2' in selector or selector == 'button':
            return _Loc(self, lambda: False)
        return _Loc(self, lambda: self.links and self.phase < 2)

    @property
    def url(self):
        return self.gone or ''

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
        if 'swal2' in selector or selector == 'button':
            return _Loc(self, lambda: False)
        return _Loc(self, lambda: self.phase >= 1)

    def get_by_text(self, pattern):
        return _Option(self)

    def wait_for_load_state(self, state):
        return None

    def goto(self, url, wait_until):
        self.gone = url

    @property
    def url(self):
        return self.gone or ''


def test_clicks_schedule_option_then_enters():
    page = _EnterPage()
    AISBrowser(page, '123456').open_schedule()
    assert page.events == ['programe']
    assert page.clicks == 1
    assert page.gone is None


def test_opens_the_form_directly_when_there_is_no_link():
    page = _Page(links=False)
    page.gone = 'https://ais.usvisa-info.com/es-mx/niv/groups'
    AISBrowser(page, '123456').open_schedule()
    assert page.clicks == 0
    assert page.gone.endswith('/schedule/123456/appointment')


def test_open_schedule_does_not_open_appointment_from_home():
    page = _Page(links=False)
    page.gone = 'https://ais.usvisa-info.com/es-mx/niv'
    with pytest.raises(PortalChanged):
        AISBrowser(page, '123456').open_schedule()
    assert page.gone.endswith('/niv')


class _LoginPage:
    def __init__(self, url, email=1):
        self.url = url
        self.email = email

    def locator(self, selector):
        class _Count:
            def count(_self):
                if 'swal' in selector:
                    return 0
                return self.email
        return _Count()


def test_login_counts_when_the_form_is_gone():
    portal = PlaywrightPortal()
    portal._page = _LoginPage('https://ais.usvisa-info.com/es-mx/niv/users/sign_in', email=0)
    assert portal.session_started() is False
    portal._page = _LoginPage('https://ais.usvisa-info.com/es-mx/niv/groups', email=0)
    assert portal.session_started() is True
    portal._page = _LoginPage('https://ais.usvisa-info.com/es-mx/niv', email=0)
    assert portal.session_started() is False
    portal._page = _LoginPage('https://ais.usvisa-info.com/es-mx/niv/groups', email=1)
    assert portal.session_started() is False
    portal._page = _LoginPage('https://ais.usvisa-info.com/es-mx/niv/schedule/123456/appointment', email=0)
    assert portal.session_started() is True


class _FillPage:
    def __init__(self, email_field=True, ready=True, stuck=False, check_sticks=True):
        self.fills = []
        self.typed = {}
        self.values = {}
        self.checked = False
        self.ready = ready
        self.stuck = stuck
        self.check_sticks = check_sticks
        self.commits = 0
        self.notice = ''
        self.dialog = False
        self.pauses = []
        self.gone = None
        self.email_field = email_field

    def goto(self, url, wait_until):
        self.gone = url

    @property
    def url(self):
        return self.gone or ''

    def wait_for_load_state(self, state):
        return None

    def wait_for_timeout(self, ms):
        self.pauses.append(ms)

    def expect_navigation(self, timeout=None):
        class _Nav:
            def __enter__(_self):
                return _self

            def __exit__(_self, *_args):
                return False

        return _Nav()

    def evaluate(self, script):
        self.fills.append('scroll')

    def locator(self, selector):
        page = self
        present = self.email_field if selector == '#user_email' else True
        if selector == 'label':
            present = True

        class Field:
            def count(self):
                if '.alert' in selector or selector.startswith('body'):
                    return 1 if page.notice else 0
                if 'swal2' in selector:
                    return 1 if page.dialog else 0
                return 1 if present else 0

            def click(self, **_kwargs):
                if 'swal2' in selector:
                    page.dialog = False
                    page.fills.append('OK')
                    return
                if 'iCheck' in selector or 'icheckbox' in selector or selector == '#policy_confirmed':
                    if page.check_sticks:
                        page.checked = True
                if 'commit' in selector:
                    page.commits += 1
                    if page.stuck and page.commits == 1:
                        page.dialog = True
                        page.notice = 'You need to sign in or sign up before continuing.'
                    else:
                        page.gone = 'https://ais.usvisa-info.com/es-mx/niv/groups'
                        page.notice = ''
                        page.dialog = False
                if selector not in ('#user_email', '#user_password'):
                    page.fills.append(selector)

            def inner_text(self):
                return page.notice

            def fill(self, value):
                if value == '':
                    page.values[selector] = ''

            def wait_for(self, state=None, timeout=None):
                if 'swal2' in selector and not page.dialog and state != 'hidden':
                    raise TimeoutError('modal')
                return None

            def is_visible(self):
                return 'swal2' in selector and page.dialog

            def press_sequentially(self, value, delay=0):
                page.fills.append(selector)
                page.typed[selector] = (value, delay)
                page.values[selector] = value

            def check(self):
                page.checked = True
                page.fills.append(selector)

            def input_value(self):
                return page.values.get(selector, '') if page.ready else ''

            def is_checked(self):
                return page.ready and page.checked

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
    assert page.fills == [
        'scroll', '#user_email', '#user_password',
        '.iCheck-helper, .icheckbox', 'input[name="commit"]',
    ]
    assert page.typed == {
        '#user_email': ('a@b.c', TYPE_DELAY_MS),
        '#user_password': ('secret', TYPE_DELAY_MS),
    }
    assert page.pauses == [STEP_DELAY_MS, STEP_DELAY_MS, STEP_DELAY_MS]


def test_login_does_not_submit_when_policy_stays_unchecked():
    page = _FillPage(check_sticks=False)
    AISBrowser(page, '123456').open_login('a@b.c', 'secret')
    assert page.commits == 0
    assert 'input[name="commit"]' not in page.fills


def test_login_skips_policy_click_when_already_checked():
    page = _FillPage()
    page.checked = True
    AISBrowser(page, '123456').open_login('a@b.c', 'secret')
    assert page.commits == 1
    assert '.iCheck-helper, .icheckbox' not in page.fills


def test_open_login_clears_cookies_when_not_signed_in(monkeypatch):
    cleared = []
    portal = PlaywrightPortal()
    portal._context = type('Ctx', (), {'clear_cookies': lambda *a: cleared.append(True)})()
    portal._page = _LoginPage('https://ais.usvisa-info.com/es-mx/niv/users/sign_in', email=1)
    portal._bot = AISBrowser(_FillPage(), '123456')
    monkeypatch.setenv('VISA_EMAIL', 'a@b.c')
    monkeypatch.setenv('VISA_PASSWORD', 'secret')
    portal.open_login()
    assert cleared == [True]
    assert portal._bot.page.commits == 1


def test_open_login_keeps_cookies_when_already_signed_in():
    cleared = []
    portal = PlaywrightPortal()
    portal._context = type('Ctx', (), {'clear_cookies': lambda *a: cleared.append(True)})()
    portal._page = _LoginPage('https://ais.usvisa-info.com/es-mx/niv/groups', email=0)
    portal._bot = AISBrowser(_FillPage(), '123456')
    portal.open_login()
    assert cleared == []
    assert portal._bot.page.commits == 0


def test_login_button_waits_until_the_form_is_complete():
    page = _FillPage(ready=False)
    AISBrowser(page, '123456').open_login('a@b.c', 'secret')
    assert page.fills == ['scroll', '#user_email']
    assert 'label' not in page.fills
    assert 'input[name="commit"]' not in page.fills


def test_login_clicks_ok_and_does_not_submit_again():
    page = _FillPage(stuck=True)
    AISBrowser(page, '123456').open_login('a@b.c', 'secret')
    assert page.commits == 1
    assert page.fills.count('input[name="commit"]') == 1
    assert 'OK' in page.fills
    assert page.dialog is False
    assert page.gone.endswith('/users/sign_in')
    assert 'label' not in ''.join(page.fills)


def test_login_stops_when_the_account_is_locked():
    page = _FillPage()
    page.notice = 'Your account is locked until 06 November, 2026, 11:57:41 CST.'
    AISBrowser(page, '123456').open_login('a@b.c', 'secret')
    assert page.commits == 0
    assert AISBrowser(page, '123456').account_locked() is True


def test_closes_extra_privacy_tab():
    page = _FillPage(stuck=True)
    extra = type('Tab', (), {'closed': False})()
    extra.close = lambda: setattr(extra, 'closed', True)
    page.context = type('Ctx', (), {'pages': [page, extra]})()
    AISBrowser(page, '123456').open_login('a@b.c', 'secret')
    assert extra.closed is True


def test_opens_the_date_field_when_there_is_no_calendar_link():
    class Page:
        def __init__(self):
            self.clicks = []

        def locator(self, selector):
            page = self

            class Loc:
                def count(self):
                    return 0 if 'href="#select"' in selector else 1

                def click(self):
                    page.clicks.append(selector)

            return Loc()

    page = Page()
    AISBrowser(page, '123456')._open_datepicker()
    assert page.clicks == ['#appointments_consulate_appointment_date']


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
