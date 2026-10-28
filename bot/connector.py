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


class AISBrowser:
    def __init__(self, page, schedule_id: str):
        if not re.fullmatch(r'\d+', schedule_id):
            raise ValueError('schedule_id must contain digits only')
        self.page = page
        self.schedule_id = schedule_id

    def open_login(self):
        self.page.goto(BASE + '/users/sign_in', wait_until='domcontentloaded')

    def open_schedule(self):
        self.page.goto(f'{BASE}/schedule/{quote(self.schedule_id)}/appointment', wait_until='domcontentloaded')
        self.page.locator('#appointments_consulate_appointment_facility_id').wait_for(timeout=20000)

    def select_location(self, location: str):
        if location not in FACILITIES:
            raise ValueError('Unknown location')
        consulate, asc = FACILITIES[location]
        self.page.locator('#appointments_consulate_appointment_facility_id').select_option(consulate)
        return consulate, asc

    def visible_consulate_days(self) -> list[date]:
        """Read only days visible in the official datepicker; no private endpoints."""
        self.page.locator('#appointments_consulate_appointment_date_input a[href="#select"]').click()
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
