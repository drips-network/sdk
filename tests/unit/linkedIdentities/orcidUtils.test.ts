import {describe, it, expect} from 'vitest';
import {
  assertValidOrcidId,
  normalizeOrcidForContract,
  SANDBOX_PREFIX,
} from '../../../src/internal/linked-identities/orcidUtils';
import {DripsError} from '../../../src/internal/shared/DripsError';

describe('orcidUtils', () => {
  describe('assertValidOrcidId', () => {
    it('accepts a valid ORCID with dashes', () => {
      expect(() => assertValidOrcidId('0000-0002-1825-0097')).not.toThrow();
    });

    it('accepts a valid ORCID with spaces', () => {
      expect(() => assertValidOrcidId('0000 0002 1825 0097')).not.toThrow();
    });

    it('accepts a valid ORCID with the sandbox prefix', () => {
      expect(() => assertValidOrcidId(`${SANDBOX_PREFIX}0009-0007-1106-8413`)).not.toThrow();
    });

    it('rejects non-string input', () => {
      // @ts-expect-error intentional wrong type
      expect(() => assertValidOrcidId(1234)).toThrow(DripsError);
      // @ts-expect-error intentional wrong type
      expect(() => assertValidOrcidId(1234)).toThrow('expected string');
    });

    it('rejects wrong length/format', () => {
      expect(() => assertValidOrcidId('0000-0002-1825-009')).toThrow(
        DripsError,
      );
      expect(() => assertValidOrcidId('abcd-0002-1825-0097')).toThrow(
        DripsError,
      );
    });

    it('rejects invalid checksum', () => {
      // Flip last digit so checksum fails
      expect(() => assertValidOrcidId('0000-0002-1825-0098')).toThrow(
        DripsError,
      );
      expect(() => assertValidOrcidId('0000-0002-1825-0098')).toThrow(
        'checksum',
      );
    });
  });

  describe('normalizeOrcidForContract', () => {
    it('trims surrounding whitespace', () => {
      expect(normalizeOrcidForContract(' 0000-0002-1825-0097 ')).toBe(
        '0000-0002-1825-0097',
      );
    });

    it('throws on empty or whitespace-only input', () => {
      expect(() => normalizeOrcidForContract('')).toThrow(DripsError);
      expect(() => normalizeOrcidForContract('   ')).toThrow('ORCID is empty');
    });

    it('returns exact trimmed value without additional formatting', () => {
      // Does not remove internal spaces/dashes — only trims.
      expect(normalizeOrcidForContract('\t0000 0002 1825 0097\n')).toBe(
        '0000 0002 1825 0097',
      );
    });
  });
});
