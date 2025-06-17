import {describe, it, expect} from 'vitest';
import {destructProjectUrl} from '../../../src/internal/projects/destructProjectUrl';

describe('destructProjectUrl', () => {
  describe('successful URL parsing', () => {
    it('should parse GitHub URL with https protocol', () => {
      // Arrange
      const url = 'https://github.com/owner/repo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
    });

    it('should parse GitHub URL with http protocol', () => {
      // Arrange
      const url = 'http://github.com/owner/repo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
    });

    it('should parse GitHub URL without protocol', () => {
      // Arrange
      const url = 'github.com/owner/repo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
    });

    it('should parse GitHub URL with www subdomain', () => {
      // Arrange
      const url = 'https://www.github.com/owner/repo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
    });

    it('should throw error for GitLab URL (unsupported forge)', () => {
      // Arrange
      const url = 'https://gitlab.com/owner/repo';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported forge: gitlab',
      );
    });

    it('should handle URLs with trailing slashes', () => {
      // Arrange
      const url = 'https://github.com/owner/repo/';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
    });

    it('should handle URLs with additional path segments', () => {
      // Arrange
      const url = 'https://github.com/owner/repo/issues/123';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
    });

    it('should handle URLs with query parameters', () => {
      // Arrange
      const url = 'https://github.com/owner/repo?tab=readme';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo?tab=readme',
      });
    });

    it('should handle URLs with fragments', () => {
      // Arrange
      const url = 'https://github.com/owner/repo#readme';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo#readme',
      });
    });
  });

  describe('special characters and edge cases', () => {
    it('should handle owner names with hyphens', () => {
      // Arrange
      const url = 'https://github.com/my-org/repo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'my-org',
        repoName: 'repo',
      });
    });

    it('should handle repo names with hyphens', () => {
      // Arrange
      const url = 'https://github.com/owner/my-repo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'my-repo',
      });
    });

    it('should handle owner names with underscores', () => {
      // Arrange
      const url = 'https://github.com/my_org/repo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'my_org',
        repoName: 'repo',
      });
    });

    it('should handle repo names with underscores', () => {
      // Arrange
      const url = 'https://github.com/owner/my_repo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'my_repo',
      });
    });

    it('should handle owner names with dots', () => {
      // Arrange
      const url = 'https://github.com/my.org/repo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'my.org',
        repoName: 'repo',
      });
    });

    it('should handle repo names with dots', () => {
      // Arrange
      const url = 'https://github.com/owner/my.repo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'my.repo',
      });
    });

    it('should handle numeric owner names', () => {
      // Arrange
      const url = 'https://github.com/123456/repo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: '123456',
        repoName: 'repo',
      });
    });

    it('should handle numeric repo names', () => {
      // Arrange
      const url = 'https://github.com/owner/123456';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: '123456',
      });
    });

    it('should handle mixed alphanumeric names', () => {
      // Arrange
      const url = 'https://github.com/user123/repo456';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'user123',
        repoName: 'repo456',
      });
    });
  });

  describe('error cases', () => {
    it('should throw error for unsupported forge', () => {
      // Arrange
      const url = 'https://bitbucket.org/owner/repo';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url: https://bitbucket.org/owner/repo.',
      );
    });

    it('should throw error for invalid URL format', () => {
      // Arrange
      const url = 'not-a-valid-url';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url: not-a-valid-url.',
      );
    });

    it('should throw error for URL without owner', () => {
      // Arrange
      const url = 'https://github.com/';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url: https://github.com/.',
      );
    });

    it('should throw error for URL with only owner', () => {
      // Arrange
      const url = 'https://github.com/owner';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url: https://github.com/owner.',
      );
    });

    it('should throw error for URL with only owner and slash', () => {
      // Arrange
      const url = 'https://github.com/owner/';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url: https://github.com/owner/.',
      );
    });

    it('should throw error for empty string', () => {
      // Arrange
      const url = '';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url: .',
      );
    });

    it('should throw error for URL with wrong domain', () => {
      // Arrange
      const url = 'https://example.com/owner/repo';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url: https://example.com/owner/repo.',
      );
    });

    it('should throw error for malformed GitHub URL', () => {
      // Arrange
      const url = 'https://github.com';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url: https://github.com.',
      );
    });

    it('should throw error for malformed GitLab URL', () => {
      // Arrange
      const url = 'https://gitlab.com';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url: https://gitlab.com.',
      );
    });
  });

  describe('case sensitivity', () => {
    it('should handle uppercase forge name', () => {
      // Arrange
      const url = 'https://GITHUB.com/owner/repo';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url: https://GITHUB.com/owner/repo.',
      );
    });

    it('should handle mixed case forge name', () => {
      // Arrange
      const url = 'https://GitHub.com/owner/repo';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url: https://GitHub.com/owner/repo.',
      );
    });

    it('should preserve case in owner and repo names', () => {
      // Arrange
      const url = 'https://github.com/MyOrg/MyRepo';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'MyOrg',
        repoName: 'MyRepo',
      });
    });
  });

  describe('whitespace handling', () => {
    it('should handle URLs with leading whitespace', () => {
      // Arrange
      const url = '  https://github.com/owner/repo';

      // Act & Assert
      expect(() => destructProjectUrl(url)).toThrow(
        'Unsupported repository url:   https://github.com/owner/repo.',
      );
    });

    it('should handle URLs with trailing whitespace', () => {
      // Arrange
      const url = 'https://github.com/owner/repo  ';

      // Act
      const result = destructProjectUrl(url);

      // Assert
      expect(result).toEqual({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo  ',
      });
    });
  });

  describe('immutability', () => {
    it('should not modify input parameter', () => {
      // Arrange
      const originalUrl = 'https://github.com/owner/repo';
      const urlCopy = originalUrl;

      // Act
      destructProjectUrl(originalUrl);

      // Assert
      expect(originalUrl).toBe(urlCopy);
    });

    it('should return new object instances for same input', () => {
      // Arrange
      const url = 'https://github.com/owner/repo';

      // Act
      const result1 = destructProjectUrl(url);
      const result2 = destructProjectUrl(url);

      // Assert
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe('performance', () => {
    it('should handle multiple URL parsing efficiently', () => {
      // Arrange
      const urls = Array.from(
        {length: 100},
        (_, i) => `https://github.com/owner${i}/repo${i}`,
      );

      // Act
      const startTime = performance.now();
      const results = urls.map(url => destructProjectUrl(url));
      const endTime = performance.now();

      // Assert
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(50); // Should be fast
      results.forEach((result, i) => {
        expect(result).toEqual({
          forge: 'github',
          ownerName: `owner${i}`,
          repoName: `repo${i}`,
        });
      });
    });
  });
});
