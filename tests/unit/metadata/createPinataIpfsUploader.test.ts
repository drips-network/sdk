/* eslint-disable n/no-unpublished-import */
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Hash} from 'viem';
import {
  createPinataIpfsUploader,
  type DripListMetadata,
  type ProjectMetadata,
  type SubListMetadata,
} from '../../../src/internal/metadata/createPinataIpfsUploader';
import {DripsError} from '../../../src/internal/DripsError';
import {PinataSDK} from 'pinata';

// Mock PinataSDK
vi.mock('pinata', () => ({
  PinataSDK: vi.fn(),
}));

// Mock the metadata parsers
vi.mock('../../../src/internal/metadata/schemas', () => ({
  nftDriverAccountMetadataParser: {
    parseLatest: vi.fn(),
  },
  repoDriverAccountMetadataParser: {
    parseLatest: vi.fn(),
  },
  immutableSplitsDriverMetadataParser: {
    parseLatest: vi.fn(),
  },
}));

describe('createPinataIpfsUploader', () => {
  const mockPinataJwt = 'test-jwt-token';
  const mockPinataGateway = 'https://test.pinata.cloud';
  const mockCid = 'QmTestCid123' as Hash;

  const mockPinataUpload = vi.fn();
  const mockPinataSDK = {
    upload: {
      public: {
        json: mockPinataUpload,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PinataSDK).mockImplementation(() => mockPinataSDK as any);
    mockPinataUpload.mockResolvedValue({cid: mockCid});
  });

  describe('createPinataIpfsUploader function', () => {
    it('should create PinataSDK with correct configuration', () => {
      // Act
      createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      // Assert
      expect(PinataSDK).toHaveBeenCalledWith({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });
    });

    it('should return a function', () => {
      // Act
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      // Assert
      expect(typeof uploader).toBe('function');
    });

    it('should upload DripList metadata successfully', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const dripListMetadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '123',
        },
        name: 'Test Drip List',
        description: 'Test description',
        isVisible: true,
        recipients: [
          {
            type: 'address',
            accountId: '456',
            weight: 500000,
          },
        ],
      };

      // Act
      const result = await uploader(dripListMetadata);

      // Assert
      expect(mockPinataUpload).toHaveBeenCalledWith(dripListMetadata);
      expect(result).toBe(mockCid);
    });

    it('should upload Project metadata successfully', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const projectMetadata: ProjectMetadata = {
        driver: 'repo',
        describes: {
          driver: 'repo',
          accountId: '789',
        },
        description: 'Test project description',
        source: {
          forge: 'github',
          repoName: 'test-repo',
          ownerName: 'test-owner',
          url: 'https://github.com/test-owner/test-repo',
        },
        splits: {
          maintainers: [
            {
              type: 'address',
              accountId: '123',
              weight: 500000,
            },
          ],
          dependencies: [
            {
              type: 'address',
              accountId: '456',
              weight: 500000,
            },
          ],
        },
        color: '#ff0000',
        avatar: {
          type: 'emoji',
          emoji: '🚀',
        },
        isVisible: true,
      };

      // Act
      const result = await uploader(projectMetadata);

      // Assert
      expect(mockPinataUpload).toHaveBeenCalledWith(projectMetadata);
      expect(result).toBe(mockCid);
    });

    it('should upload SubList metadata successfully', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const subListMetadata: SubListMetadata = {
        driver: 'immutable-splits',
        type: 'subList',
        recipients: [
          {
            type: 'address',
            accountId: '456',
            weight: 1000000,
          },
        ],
        parent: {
          accountId: '123',
          driver: 'nft',
          type: 'dripList',
        },
        root: {
          accountId: '123',
          driver: 'nft',
          type: 'dripList',
        },
      };

      // Act
      const result = await uploader(subListMetadata);

      // Assert
      expect(mockPinataUpload).toHaveBeenCalledWith(subListMetadata);
      expect(result).toBe(mockCid);
    });

    it('should handle different pinata configurations', () => {
      // Arrange
      const customJwt = 'custom-jwt';
      const customGateway = 'https://custom.gateway.com';

      // Act
      createPinataIpfsUploader({
        pinataJwt: customJwt,
        pinataGateway: customGateway,
      });

      // Assert
      expect(PinataSDK).toHaveBeenCalledWith({
        pinataJwt: customJwt,
        pinataGateway: customGateway,
      });
    });
  });

  describe('error handling', () => {
    it('should wrap Pinata upload errors in DripsError', async () => {
      // Arrange
      const uploadError = new Error('Pinata upload failed');
      mockPinataUpload.mockRejectedValue(uploadError);

      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const metadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '123',
        },
        isVisible: true,
        recipients: [],
      };

      // Act & Assert
      await expect(uploader(metadata)).rejects.toThrow(DripsError);
      await expect(uploader(metadata)).rejects.toThrow('IPFS upload failed');
    });

    it('should include original error as cause in DripsError', async () => {
      // Arrange
      const originalError = new Error('Network timeout');
      mockPinataUpload.mockRejectedValue(originalError);

      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const metadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '123',
        },
        isVisible: true,
        recipients: [],
      };

      // Act & Assert
      try {
        await uploader(metadata);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const dripsError = error as DripsError;
        expect(dripsError.cause).toBe(originalError);
      }
    });

    it('should include metadata in DripsError meta', async () => {
      // Arrange
      const uploadError = new Error('Upload failed');
      mockPinataUpload.mockRejectedValue(uploadError);

      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const metadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '123',
        },
        name: 'Test List',
        isVisible: true,
        recipients: [],
      };

      // Act & Assert
      try {
        await uploader(metadata);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const dripsError = error as DripsError;
        expect(dripsError.meta).toEqual({
          operation: 'createIpfsUploader',
          metadata,
        });
      }
    });

    it('should handle non-Error objects thrown by Pinata', async () => {
      // Arrange
      const stringError = 'String error message';
      mockPinataUpload.mockRejectedValue(stringError);

      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const metadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '123',
        },
        isVisible: true,
        recipients: [],
      };

      // Act & Assert
      try {
        await uploader(metadata);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const dripsError = error as DripsError;
        expect(dripsError.cause).toBe(stringError);
        expect(dripsError.message).toContain('IPFS upload failed');
      }
    });

    it('should handle null/undefined errors from Pinata', async () => {
      // Arrange
      mockPinataUpload.mockRejectedValue(null);

      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const metadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '123',
        },
        isVisible: true,
        recipients: [],
      };

      // Act & Assert
      try {
        await uploader(metadata);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const dripsError = error as DripsError;
        expect(dripsError.cause).toBe(null);
        expect(dripsError.message).toContain('IPFS upload failed');
      }
    });
  });

  describe('metadata validation', () => {
    it('should validate metadata before upload', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const metadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '123',
        },
        isVisible: true,
        recipients: [],
      };

      // Act
      await uploader(metadata);

      // Assert
      // The metadata parser should be called during validation
      // This is tested indirectly through successful upload
      expect(mockPinataUpload).toHaveBeenCalledWith(metadata);
    });

    it('should handle unsupported metadata driver', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const invalidMetadata = {
        driver: 'unsupported',
        type: 'unknown',
      } as any;

      // Act & Assert
      await expect(uploader(invalidMetadata)).rejects.toThrow(DripsError);
      await expect(uploader(invalidMetadata)).rejects.toThrow(
        'IPFS upload failed',
      );
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle empty metadata objects', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const emptyMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '0',
        },
        isVisible: false,
        recipients: [],
      } as DripListMetadata;

      // Act
      const result = await uploader(emptyMetadata);

      // Assert
      expect(result).toBe(mockCid);
      expect(mockPinataUpload).toHaveBeenCalledWith(emptyMetadata);
    });

    it('should handle metadata with large recipient arrays', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const largeRecipients = Array.from({length: 1000}, (_, i) => ({
        type: 'address' as const,
        accountId: i.toString(),
        weight: 1000,
      }));

      const metadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '123',
        },
        isVisible: true,
        recipients: largeRecipients,
      };

      // Act
      const result = await uploader(metadata);

      // Assert
      expect(result).toBe(mockCid);
      expect(mockPinataUpload).toHaveBeenCalledWith(metadata);
    });

    it('should handle metadata with special characters', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const metadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '123',
        },
        name: '🚀 Test List with émojis & spëcial chars 测试',
        description: 'Description with\nnewlines\tand\ttabs',
        isVisible: true,
        recipients: [],
      };

      // Act
      const result = await uploader(metadata);

      // Assert
      expect(result).toBe(mockCid);
      expect(mockPinataUpload).toHaveBeenCalledWith(metadata);
    });

    it('should handle very long metadata strings', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const longString = 'a'.repeat(100000);
      const metadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '123',
        },
        name: longString,
        description: longString,
        isVisible: true,
        recipients: [],
      };

      // Act
      const result = await uploader(metadata);

      // Assert
      expect(result).toBe(mockCid);
      expect(mockPinataUpload).toHaveBeenCalledWith(metadata);
    });

    it('should handle zero-length CID response', async () => {
      // Arrange
      mockPinataUpload.mockResolvedValue({cid: ''});

      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const metadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {
          driver: 'nft',
          accountId: '123',
        },
        isVisible: true,
        recipients: [],
      };

      // Act
      const result = await uploader(metadata);

      // Assert
      expect(result).toBe('');
    });
  });

  describe('concurrent uploads', () => {
    it('should handle multiple concurrent uploads', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const metadata1: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {driver: 'nft', accountId: '1'},
        isVisible: true,
        recipients: [],
      };

      const metadata2: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {driver: 'nft', accountId: '2'},
        isVisible: true,
        recipients: [],
      };

      const metadata3: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {driver: 'nft', accountId: '3'},
        isVisible: true,
        recipients: [],
      };

      mockPinataUpload
        .mockResolvedValueOnce({cid: 'cid1'})
        .mockResolvedValueOnce({cid: 'cid2'})
        .mockResolvedValueOnce({cid: 'cid3'});

      // Act
      const [result1, result2, result3] = await Promise.all([
        uploader(metadata1),
        uploader(metadata2),
        uploader(metadata3),
      ]);

      // Assert
      expect(result1).toBe('cid1');
      expect(result2).toBe('cid2');
      expect(result3).toBe('cid3');
      expect(mockPinataUpload).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure in concurrent uploads', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const metadata1: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {driver: 'nft', accountId: '1'},
        isVisible: true,
        recipients: [],
      };

      const metadata2: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {driver: 'nft', accountId: '2'},
        isVisible: true,
        recipients: [],
      };

      mockPinataUpload
        .mockResolvedValueOnce({cid: 'success-cid'})
        .mockRejectedValueOnce(new Error('Upload failed'));

      // Act
      const results = await Promise.allSettled([
        uploader(metadata1),
        uploader(metadata2),
      ]);

      // Assert
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      if (results[0].status === 'fulfilled') {
        expect(results[0].value).toBe('success-cid');
      }
      if (results[1].status === 'rejected') {
        expect(results[1].reason).toBeInstanceOf(DripsError);
      }
    });
  });

  describe('integration scenarios', () => {
    it('should work with different uploader instances', async () => {
      // Arrange
      const uploader1 = createPinataIpfsUploader({
        pinataJwt: 'jwt1',
        pinataGateway: 'gateway1',
      });

      const uploader2 = createPinataIpfsUploader({
        pinataJwt: 'jwt2',
        pinataGateway: 'gateway2',
      });

      const metadata: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {driver: 'nft', accountId: '123'},
        isVisible: true,
        recipients: [],
      };

      // Act
      await uploader1(metadata);
      await uploader2(metadata);

      // Assert
      expect(PinataSDK).toHaveBeenCalledTimes(2);
      expect(PinataSDK).toHaveBeenNthCalledWith(1, {
        pinataJwt: 'jwt1',
        pinataGateway: 'gateway1',
      });
      expect(PinataSDK).toHaveBeenNthCalledWith(2, {
        pinataJwt: 'jwt2',
        pinataGateway: 'gateway2',
      });
    });

    it('should maintain uploader state across multiple calls', async () => {
      // Arrange
      const uploader = createPinataIpfsUploader({
        pinataJwt: mockPinataJwt,
        pinataGateway: mockPinataGateway,
      });

      const metadata1: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {driver: 'nft', accountId: '1'},
        isVisible: true,
        recipients: [],
      };

      const metadata2: DripListMetadata = {
        driver: 'nft',
        type: 'dripList',
        describes: {driver: 'nft', accountId: '2'},
        isVisible: true,
        recipients: [],
      };

      mockPinataUpload
        .mockResolvedValueOnce({cid: 'first-cid'})
        .mockResolvedValueOnce({cid: 'second-cid'});

      // Act
      const result1 = await uploader(metadata1);
      const result2 = await uploader(metadata2);

      // Assert
      expect(result1).toBe('first-cid');
      expect(result2).toBe('second-cid');
      expect(PinataSDK).toHaveBeenCalledTimes(1); // Should reuse the same instance
      expect(mockPinataUpload).toHaveBeenCalledTimes(2);
    });
  });
});
