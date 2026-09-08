import { sfDate } from "../lib/events.mjs";

export function checkedDates(coverage, today = sfDate()) {
  const end = new Date(Date.parse(`${today}T12:00:00Z`) + 29 * 86400000).toISOString().slice(0,10);
  return new Set((Array.isArray(coverage?.dates) ? coverage.dates : []).filter(day => {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const date = new Date(`${day}T12:00:00Z`);
    return Number.isFinite(+date) && date.toISOString().slice(0, 10) === day && day >= today && day <= end;
  }));
}

const labelFormat = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', month:'long', day:'numeric', year:'numeric'});
const monthFormat = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', month:'long', year:'numeric'});
const label = day => labelFormat.format(new Date(`${day}T12:00:00Z`));

// A native popover supplies Escape/light-dismiss and focus restoration. The
// table uses ordinary buttons, so available days support Tab/Enter naturally.
export function createCalendar({button, panel, onSelect}) {
  let selected;
  let month;
  let covered = new Set();
  const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function position() {
    const bounds = button.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 32);
    panel.style.left = `${Math.max(16, Math.min(bounds.right - width, window.innerWidth - width - 16))}px`;
    panel.style.top = `${Math.max(16, Math.min(bounds.bottom + 8, window.innerHeight - panel.offsetHeight - 16))}px`;
  }
  function render() {
    if (!month) return;
    const header = make('div', null, 'calendar-header');
    const previous = make('button', '‹');
    previous.type = 'button';
    previous.setAttribute('aria-label', 'Previous month');
    const next = make('button', '›');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next month');
    const title = make('h2', monthFormat.format(month));
    title.id = 'calendar-month';
    title.setAttribute('aria-live', 'polite');
    function move(amount, focusLabel) {
      month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + amount, 1, 12));
      render();
      panel.querySelector(`[aria-label="${focusLabel}"]`).focus();
    }
    previous.addEventListener('click', () => move(-1, 'Previous month'));
    next.addEventListener('click', () => move(1, 'Next month'));
    header.append(previous, title, next);
    const table = make('table', null, 'calendar-days');
    table.setAttribute('aria-labelledby', 'calendar-month');
    const head = make('thead');
    const weekdays = make('tr');
    for (const name of ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']) {
      const cell = make('th', name.slice(0,2));
      cell.scope = 'col';
      cell.setAttribute('aria-label', name);
      weekdays.append(cell);
    }
    head.append(weekdays);
    const body = make('tbody');
    const firstWeekday = month.getUTCDay();
    const days = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
    for (let slot = 0; slot < Math.ceil((firstWeekday + days) / 7) * 7; slot++) {
      if (slot % 7 === 0) body.append(make('tr'));
      const cell = make('td');
      const number = slot - firstWeekday + 1;
      if (number >= 1 && number <= days) {
        const day = `${month.getUTCFullYear()}-${String(month.getUTCMonth()+1).padStart(2,'0')}-${String(number).padStart(2,'0')}`;
        const available = covered.has(day);
        const control = make('button', String(number));
        control.type = 'button';
        control.dataset.date = day;
        control.disabled = !available;
        control.setAttribute('aria-label', `${label(day)} — ${available ? 'checked' : 'not checked'}`);
        control.setAttribute('aria-pressed', String(day === selected));
        control.title = available ? 'Event sources checked for this date' : 'Event sources haven’t been checked for this date';
        control.addEventListener('click', () => {
          if (!covered.has(day)) return;
          panel.hidePopover();
          onSelect(day);
          button.focus();
        });
        cell.append(control);
      }
      body.lastElementChild.append(cell);
    }
    table.append(head, body);
    const note = make('p', 'Our window is 30 days starting today. Gray dates haven’t been checked. Checked dates stay available even with no events.', 'calendar-note');
    panel.replaceChildren(header, table, note);
    if (panel.matches(':popover-open')) position();
  }
  panel.addEventListener('beforetoggle', event => {
    if (event.newState === 'open') {
      month = new Date(`${selected.slice(0,7)}-01T12:00:00Z`);
      render();
    }
  });
  panel.addEventListener('toggle', event => {
    const open = event.newState === 'open';
    button.setAttribute('aria-expanded', String(open));
    if (open) {
      position();
      (panel.querySelector(`button[data-date="${selected}"]:not(:disabled)`) || panel.querySelector('button[data-date]:not(:disabled)') || panel.querySelector('button')).focus();
    }
  });
  window.addEventListener('resize', () => { if (panel.matches(':popover-open')) position(); });
  return {
    update(day, coverage) {
      const nextCoverage = checkedDates(coverage);
      const changed = selected !== day || nextCoverage.size !== covered.size || [...nextCoverage].some(date => !covered.has(date));
      const focused = panel.contains(document.activeElement) ? {date: document.activeElement.dataset.date, label: document.activeElement.getAttribute('aria-label')} : null;
      selected = day;
      covered = nextCoverage;
      button.textContent = label(day);
      if (!month) month = new Date(`${day.slice(0,7)}-01T12:00:00Z`);
      if (changed && panel.matches(':popover-open')) {
        render();
        if (focused) {
          const target = [...panel.querySelectorAll('button:not(:disabled)')].find(node => focused.date ? node.dataset.date === focused.date : node.getAttribute('aria-label') === focused.label);
          (target || panel.querySelector('button')).focus();
        }
      }
    },
  };
}
