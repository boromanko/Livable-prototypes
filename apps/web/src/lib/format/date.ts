type DateLabelOptions = {
  fallback?: string;
  locale?: string;
};

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

export function toDateInputValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}
