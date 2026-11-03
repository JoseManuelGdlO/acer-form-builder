"""AIS browser workflow based on inspected legacy UI selectors.
No undocumented HTTP endpoints, CAPTCHA bypass, or stealth techniques.
Selectors require validation against the current live portal.
"""
from dataclasses import dataclass
from datetime import date
from typing import Optional
from urllib.parse import quote
import re

BASE = 'https://ais.usvisa-info.com/es-mx/niv'
FACILITIES = {
    'Ciudad Juarez': ('65', '76'), 'Guadalajara': ('66', '77'),
    'Hermosillo': ('67', '78'), 'Matamoros': ('68', '79'),
    'Merida': ('69', '81'), 'Mexico City': ('70', '82'),
    'Monterrey': ('71', '83'), 'Nogales': ('72', '84'),
    'Nuevo Laredo': ('73', '85'), 'Tijuana': ('74', '88'),
}

@dataclass(frozen=True)
class Appointment:
    consulate_date: date
    consulate_time: str
    asc_date: date
    asc_time: str
    consulate: str


def eligible(slot: Appointment, current: Optional[date], earliest: date, latest: date) -> bool:
    in_window = earliest <= slot.consulate_date <= latest and slot.asc_date <= slot.consulate_date
    if current is None:
        return in_window
    return in_window and slot.consulate_date < current


class PortalChanged(RuntimeError):
    pass


_SCHEDULE_OPTION = re.compile(r'programe la cita|reprogramar cita', re.I)


def calendar_step(shown, latest):
    return 'prev' if shown > latest else 'next'


def in_window(day, earliest, latest, current):
    if not earliest <= day <= latest:
        return False
    return current is None or day < current


class AISBrowser:
    def __init__(self, page, schedule_id: str):
        if not re.fullmatch(r'\d+', schedule_id):
            raise ValueError('schedule_id must contain digits only')
        self.page = page
        self.schedule_id = schedule_id

    def open_login(self, email='', password=''):
        self.page.goto(BASE + '/users/sign_in', wait_until='domcontentloaded')
        form = self.page.locator('#user_email')
        if not email or not password or not form.count():
            return
        self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        form.scroll_into_view_if_needed()
        form.fill(email)
        self.page.locator('#user_password').fill(password)
        terms = self.page.locator('label').filter(has_text=re.compile(r'he le[ií]do y comprendido', re.I))
        if terms.count():
            terms.first.click()
        else:
            self.page.locator('#policy_confirmed').check()
        self.page.locator('input[name="commit"]').click()
        self.page.wait_for_load_state('domcontentloaded')

    def open_schedule(self):
        form = self.page.locator('#appointments_consulate_appointment_facility_id')
        link = self.page.locator('a.button.primary[href*="/schedule/"], a[href*="/appointment"]')
        for _ in range(4):
            if form.count():
                break
            if link.count():
                link.first.click()
            elif hasattr(self.page, 'get_by_text') and self.page.get_by_text(_SCHEDULE_OPTION).count():
                # shortcut: the first match is the accordion title, the next pass enters the link
                self.page.get_by_text(_SCHEDULE_OPTION).first.click()
            else:
                break
            self.page.wait_for_load_state('domcontentloaded')
        if not form.count():
            self.page.goto(f'{BASE}/schedule/{quote(self.schedule_id)}/appointment', wait_until='domcontentloaded')
        form.wait_for(timeout=20000)

    def select_location(self, location: str):
        if location not in FACILITIES:
            raise ValueError('Unknown location')
        consulate, asc = FACILITIES[location]
        self.page.locator('#appointments_consulate_appointment_facility_id').select_option(consulate)
        return consulate, asc

    def visible_consulate_days(self) -> list[date]:
        """Read only days visible in the official datepicker; no private endpoints."""
        self.page.locator('#appointments_consulate_appointment_date_input a[href="#select"]').click()
        return self._open_days()

    def pick_day_in_range(self, earliest, latest, current=None):
        """Click the earliest open day in the saved window. Does not submit."""
        self.page.locator('#appointments_consulate_appointment_date_input a[href="#select"]').click()
        for _ in range(24):
            shown = self._shown_month()
            if shown is None or calendar_step(shown, latest) == 'next':
                break
            if not self._step('prev'):
                break
        found = []
        for _ in range(24):
            hits = [day for day in self._open_days() if in_window(day, earliest, latest, current)]
            if hits:
                target = min(hits)
                self._click_open_day(target)
                return sorted(set(found + hits))
            if not self._step('next'):
                break
        return []

    def _open_days(self):
        days = self.page.locator('#ui-datepicker-div td[data-handler="selectDay"]')
        output = set()
        for i in range(days.count()):
            cell = days.nth(i)
            month = cell.get_attribute('data-month')
            year = cell.get_attribute('data-year')
            day_text = cell.locator('a').first.text_content() if cell.locator('a').count() else None
            if month is not None and year and day_text and day_text.strip().isdigit():
                output.add(date(int(year), int(month) + 1, int(day_text.strip())))
        return sorted(output)

    def _shown_month(self):
        cell = self.page.locator('#ui-datepicker-div td[data-year]').first
        if not cell.count():
            return None
        year = cell.get_attribute('data-year')
        month = cell.get_attribute('data-month')
        if year is None or month is None:
            return None
        return date(int(year), int(month) + 1, 1)

    def _step(self, direction):
        button = self.page.locator(f'#ui-datepicker-div a[data-handler="{direction}"]')
        if not button.count():
            return False
        button.first.click()
        return True

    def _click_open_day(self, day):
        cell = self.page.locator(
            f'#ui-datepicker-div td[data-handler="selectDay"][data-month="{day.month - 1}"][data-year="{day.year}"] a'
        ).filter(has_text=re.compile(rf'^\s*{day.day}\s*$'))
        if not cell.count():
            raise PortalChanged('Date not found within allowed calendar navigation')
        cell.first.click()

    def choose_calendar_date(self, field_id: str, desired: date, max_month_moves=24):
        self.page.locator(f'#{field_id}_input a[href="#select"]').click()
        for _ in range(max_month_moves + 1):
            cell = self.page.locator(
                f'#ui-datepicker-div td[data-handler="selectDay"][data-month="{desired.month-1}"][data-year="{desired.year}"] a'
            ).filter(has_text=re.compile(rf'^\s*{desired.day}\s*$'))
            if cell.count():
                cell.first.click()
                return
            next_button = self.page.locator('#ui-datepicker-div a[data-handler="next"]')
            if not next_button.count():
                raise PortalChanged('Desired date not visible; calendar navigation unavailable')
            next_button.first.click()
        raise PortalChanged('Date not found within allowed calendar navigation')

    def select_appointment(self, appointment: Appointment):
        consulate_id, asc_id = FACILITIES[appointment.consulate]
        self.page.locator('#appointments_consulate_appointment_facility_id').select_option(consulate_id)
        self.choose_calendar_date('appointments_consulate_appointment_date', appointment.consulate_date)
        self.page.locator('#appointments_consulate_appointment_time').select_option(appointment.consulate_time)
        self.page.locator('#appointments_asc_appointment_facility_id').select_option(asc_id)
        self.choose_calendar_date('appointments_asc_appointment_date', appointment.asc_date)
        self.page.locator('#appointments_asc_appointment_time').select_option(appointment.asc_time)

    def submit_and_verify(self, appointment: Appointment, authorized: bool = False) -> dict:
        if not authorized:
            raise PermissionError('Explicit authorization required for automatic submission')
        button = self.page.locator('#appointments_submit')
        if not button.is_enabled():
            raise PortalChanged('Submit button disabled; do not override portal controls')
        button.click()
        self.page.wait_for_load_state('domcontentloaded')
        text = self.page.locator('body').inner_text()
        # Conservative verification: date AND explicit confirmation reference required.
        match = re.search(r'(?:confirmation|confirmaci[oó]n)\s*(?:number|n[uú]mero|#|:)?\s*[:#-]?\s*([A-Z0-9-]{6,})', text, re.I)
        confirmed = bool(match and appointment.consulate_date.isoformat() in text)
        return {'confirmed': confirmed, 'reference': match.group(1) if confirmed else None,
                'status': 'confirmed' if confirmed else 'requires_manual_verification'}
