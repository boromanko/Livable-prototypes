import { ApiError } from '../../api';

type ApiErrorMessageOptions = {
  defaultMessage?: string;
  statusMessagePrefix?: string;
};

export function getApiErrorMessage(
  error: unknown,
  options?: ApiErrorMessageOptions
): string {
  const defaultMessage = options?.defaultMessage ?? 'Unexpected error';
  const statusMessagePrefix = options?.statusMessagePrefix ?? 'Request failed with status';

  if (error instanceof ApiError) {
    if (
      error.payload &&
      typeof error.payload === 'object' &&
      'message' in error.payload &&
      typeof error.payload.message === 'string'
    ) {
      return error.payload.message;
    }

    return `${statusMessagePrefix} ${error.status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return defaultMessage;
}
