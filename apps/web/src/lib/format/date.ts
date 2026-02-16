type DateLabelOptions = {
  fallback?: string;
  locale?: string;
};

function padDatePart(value: number): string {
  return value.toString().padStart(2, '0');
}

function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(value: string | null, options?: DateLabelOptions): string {
  if (!value) {
    return options?.fallback ?? 'Forever';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(options?.locale ?? 'en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}

export function getTodayDateInputValue(): string {
  return toLocalDateInputValue(new Date());
}

export function toDateInputValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return toLocalDateInputValue(date);
}
