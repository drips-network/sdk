import {DripsError} from '../shared/DripsError';

export function assertValidOrcidId(orcidId: string): void {
  if (typeof orcidId !== 'string') {
    throw new DripsError('Invalid ORCID: expected string.', {
      meta: {operation: assertValidOrcidId.name, orcidId},
    });
  }

  const baseStr: string = orcidId.replace(/[-\s]/g, '');

  const orcidPattern = /^\d{15}[\dX]$/i;
  if (!orcidPattern.test(baseStr.toUpperCase())) {
    throw new DripsError('Invalid ORCID format.', {
      meta: {operation: assertValidOrcidId.name, orcidId},
    });
  }

  let total = 0;
  for (let i = 0; i < 15; i++) {
    const digit = parseInt(baseStr[i], 10);
    if (Number.isNaN(digit)) {
      throw new DripsError('Invalid ORCID digits.', {
        meta: {operation: assertValidOrcidId.name, orcidId},
      });
    }
    total = (total + digit) * 2;
  }

  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const calculatedCheckDigit = result === 10 ? 'X' : String(result);
  const actualCheckDigit = baseStr.charAt(15).toUpperCase();

  if (calculatedCheckDigit !== actualCheckDigit) {
    throw new DripsError('Invalid ORCID checksum.', {
      meta: {operation: assertValidOrcidId.name, orcidId},
    });
  }
}

export function normalizeOrcidForContract(orcidId: string): string {
  const trimmed = (orcidId ?? '').trim();
  if (trimmed.length === 0) {
    throw new DripsError('ORCID is empty.', {
      meta: {operation: normalizeOrcidForContract.name, orcidId},
    });
  }

  return trimmed;
}
