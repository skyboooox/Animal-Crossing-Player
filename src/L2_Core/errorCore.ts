import type { AppError } from './types';
import { createId } from '../L4_Atom/utils/ids';

export function createAppError(scope: AppError['scope'], message: string, now = new Date()): AppError {
  return {
    id: createId('error'),
    scope,
    message,
    createdAt: now.toISOString(),
  };
}
