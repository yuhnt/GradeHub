import { ApiError } from '../middleware/error.middleware';

/** Parses a numeric route param (e.g. :id) into a bigint, or throws 400. */
export function parseId(value: string | undefined): bigint {
  if (!value || !/^\d+$/.test(value)) {
    throw new ApiError(400, 'invalid id');
  }
  return BigInt(value);
}
