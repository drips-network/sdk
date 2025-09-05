import { describe, it, expect } from 'vitest';
import { extractOrcidIdFromAccountId } from '../../../src/internal/shared/accountIdUtils';

describe('accountIdUtils', () => {
  describe('extractOrcidIdFromAccountId', () => {
    describe('successful extraction', () => {
      it('should extract ORCID iD from string account ID', () => {
        // Arrange - Create an account ID with ORCID "0009-0007-1106-8413" encoded
        const accountId = '81320912658542974439730315780315479837099264021654871105585262100480'

        // Act
        const result = extractOrcidIdFromAccountId(accountId);

        // Assert
        expect(result).toBe('0009-0007-1106-8413');
      });

      it('should extract ORCID iD from bigint account ID', () => {
        // Arrange - Create an account ID with ORCID "0000-0001-2345-6789" encoded
        const orcidBytes = [48, 48, 48, 48, 45, 48, 48, 48, 49, 45, 50, 51, 52, 53, 45, 54, 55, 56, 57];
        let nameEncoded = 0n;
        for (let i = 0; i < orcidBytes.length; i++) {
          nameEncoded |= BigInt(orcidBytes[i]) << BigInt(i * 8);
        }

        // Act
        const result = extractOrcidIdFromAccountId(nameEncoded);

        // Assert
        expect(result).toBe('0000-0001-2345-6789');
      });
    });

    describe('edge cases', () => {
      it('should return null for zero account ID', () => {
        // Act
        const result1 = extractOrcidIdFromAccountId('0');
        const result2 = extractOrcidIdFromAccountId(0n);

        // Assert
        expect(result1).toBeNull();
        expect(result2).toBeNull();
      });

      it('should return null for empty string extraction', () => {
        // Arrange - Account ID that results in empty string after extraction
        const accountId = 0n;

        // Act
        const result = extractOrcidIdFromAccountId(accountId);

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('real-world ORCID formats', () => {
      it('should handle standard ORCID format', () => {
        // Arrange - Standard ORCID format
        const standardOrcids = [
          '0000-0002-1825-0097',
          '0000-0001-2345-6789',
          '0000-0003-9876-5432',
        ];

        standardOrcids.forEach(orcid => {
          const orcidBytes = Array.from(orcid).map(char => char.charCodeAt(0));
          let nameEncoded = 0n;
          for (let i = 0; i < orcidBytes.length; i++) {
            nameEncoded |= BigInt(orcidBytes[i]) << BigInt(i * 8);
          }

          // Act
          const result = extractOrcidIdFromAccountId(nameEncoded);

          // Assert
          expect(result).toBe(orcid);
        });
      });

      it('should handle ORCID with X check digit', () => {
        // Arrange - ORCID with X as check digit
        const orcidWithX = '0000-0002-1825-009X';
        const orcidBytes = Array.from(orcidWithX).map(char => char.charCodeAt(0));
        let nameEncoded = 0n;
        for (let i = 0; i < orcidBytes.length; i++) {
          nameEncoded |= BigInt(orcidBytes[i]) << BigInt(i * 8);
        }

        // Act
        const result = extractOrcidIdFromAccountId(nameEncoded);

        // Assert
        expect(result).toBe(orcidWithX);
      });
      //   // Arrange - ORCID without formatting hyphens
      //   const orcidNoHyphens = '0000000218250097';
      //   const orcidBytes = Array.from(orcidNoHyphens).map(char => char.charCodeAt(0));
      //   let nameEncoded = 0n;
      //   for (let i = 0; i < orcidBytes.length; i++) {
      //     nameEncoded |= BigInt(orcidBytes[i]) << BigInt(i * 8);
      //   }

      //   // Act
      //   const result = extractOrcidIdFromAccountId(nameEncoded);

      //   // Assert
      //   expect(result).toBe(orcidNoHyphens);
      // });
    });
  });
});
