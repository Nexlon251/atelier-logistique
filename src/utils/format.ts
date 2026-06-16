function padNumber(value: number): string {
  return String(value).padStart(2, '0');
}

function parseDateInput(value: string): { year: number; month: number; day: number } | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return { year, month, day };
}

function getUtcDate(value: Date | string): Date {
  if (typeof value === 'string') {
    const inputDate = parseDateInput(value);
    if (inputDate) {
      return new Date(Date.UTC(inputDate.year, inputDate.month - 1, inputDate.day));
    }
  }

  const date = typeof value === 'string' ? new Date(value) : new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isValidDateInput(value: string): boolean {
  const parts = parseDateInput(value);
  if (!parts) {
    return false;
  }

  const candidate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return (
    candidate.getUTCFullYear() === parts.year &&
    candidate.getUTCMonth() === parts.month - 1 &&
    candidate.getUTCDate() === parts.day
  );
}

export function toInputDate(value: Date | string): string {
  const date = getUtcDate(value);
  return `${date.getUTCFullYear()}-${padNumber(date.getUTCMonth() + 1)}-${padNumber(
    date.getUTCDate()
  )}`;
}

export function toTaskDueDateIso(value: string): string | null {
  if (!isValidDateInput(value)) {
    return null;
  }

  const date = getUtcDate(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0)
  ).toISOString();
}

export function formatDueDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function formatLongDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

export function humanizeEmail(email: string): string {
  const localPart = email.split('@')[0] ?? 'atelier';
  return localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}
