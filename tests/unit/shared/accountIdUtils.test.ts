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

      it('should return null when extraction produces something that does not resemble an ORCID iD', () => {
        // Arrange - The account ID for the svelte project
        const accountId = '80927338512810702724070905882237017022089417038277884279346528518144'

        // Act
        const result = extractOrcidIdFromAccountId(accountId);

        // Assert
        expect(result).toBe(null);
      });
    });
  });
});
