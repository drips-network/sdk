/* eslint-disable n/no-unpublished-import */
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {GraphQLClient} from 'graphql-request';
import {
  createGraphQLClient,
  DEFAULT_GRAPHQL_URL,
  type DripsGraphQLClient,
} from '../../../src/internal/graphql/createGraphQLClient';
import {DripsError} from '../../../src/internal/DripsError';

// Mock the GraphQLClient from graphql-request
vi.mock('graphql-request', () => ({
  GraphQLClient: vi.fn(),
}));

describe('createGraphQLClient', () => {
  const mockRequest = vi.fn();
  const mockGraphQLClient = {
    request: mockRequest,
    url: '',
    requestConfig: {},
    rawRequest: vi.fn(),
    batchRequests: vi.fn(),
    setHeaders: vi.fn(),
    setHeader: vi.fn(),
    setEndpoint: vi.fn(),
  } as unknown as GraphQLClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(GraphQLClient).mockImplementation(() => mockGraphQLClient);
  });

  describe('Client creation', () => {
    it('should create GraphQLClient with default URL when no URL provided', () => {
      // Act
      const client = createGraphQLClient();

      // Assert
      expect(GraphQLClient).toHaveBeenCalledWith(DEFAULT_GRAPHQL_URL);
      expect(client).toBeDefined();
      expect(typeof client.query).toBe('function');
    });

    it('should create GraphQLClient with provided URL', () => {
      // Arrange
      const customUrl = 'https://custom.graphql.endpoint';

      // Act
      const client = createGraphQLClient(customUrl);

      // Assert
      expect(GraphQLClient).toHaveBeenCalledWith(customUrl);
      expect(client).toBeDefined();
      expect(typeof client.query).toBe('function');
    });

    it('should return DripsGraphQLClient interface', () => {
      // Act
      const client = createGraphQLClient();

      // Assert
      expect(client).toHaveProperty('query');
      expect(typeof client.query).toBe('function');
    });
  });

  describe('URL validation', () => {
    it('should throw DripsError when URL is empty string', () => {
      // Act & Assert
      expect(() => createGraphQLClient('')).toThrow(DripsError);
      expect(() => createGraphQLClient('')).toThrow(
        'Missing required GraphQL endpoint',
      );
    });

    it('should throw DripsError when URL is null', () => {
      // Act & Assert
      expect(() => createGraphQLClient(null as any)).toThrow(DripsError);
      expect(() => createGraphQLClient(null as any)).toThrow(
        'Missing required GraphQL endpoint',
      );
    });

    it('should use default URL when undefined is passed', () => {
      // Act
      const client = createGraphQLClient(undefined);

      // Assert
      expect(GraphQLClient).toHaveBeenCalledWith(DEFAULT_GRAPHQL_URL);
      expect(client).toBeDefined();
      expect(typeof client.query).toBe('function');
    });

    it('should accept whitespace-only URL (this is a potential bug in the original code)', () => {
      // Act
      const client = createGraphQLClient('   ');

      // Assert
      expect(GraphQLClient).toHaveBeenCalledWith('   ');
      expect(client).toBeDefined();
      expect(typeof client.query).toBe('function');
    });

    it('should accept valid URL strings', () => {
      // Arrange
      const validUrls = [
        'https://api.example.com/graphql',
        'http://localhost:4000/graphql',
        'https://graphql.drips.network',
      ];

      // Act & Assert
      validUrls.forEach(url => {
        expect(() => createGraphQLClient(url)).not.toThrow();
        expect(GraphQLClient).toHaveBeenCalledWith(url);
      });
    });
  });

  describe('Query method', () => {
    let client: DripsGraphQLClient;

    beforeEach(() => {
      client = createGraphQLClient();
    });

    it('should execute successful query without variables', async () => {
      // Arrange
      const query = 'query { users { id name } }';
      const expectedResult = {users: [{id: '1', name: 'John'}]};
      mockRequest.mockResolvedValue(expectedResult);

      // Act
      const result = await client.query(query);

      // Assert
      expect(mockRequest).toHaveBeenCalledWith(query, undefined);
      expect(result).toEqual(expectedResult);
    });

    it('should execute successful query with variables', async () => {
      // Arrange
      const query = 'query GetUser($id: ID!) { user(id: $id) { id name } }';
      const variables = {id: '123'};
      const expectedResult = {user: {id: '123', name: 'John'}};
      mockRequest.mockResolvedValue(expectedResult);

      // Act
      const result = await client.query(query, variables);

      // Assert
      expect(mockRequest).toHaveBeenCalledWith(query, variables);
      expect(result).toEqual(expectedResult);
    });

    it('should handle empty variables object', async () => {
      // Arrange
      const query = 'query { users { id name } }';
      const variables = {};
      const expectedResult = {users: []};
      mockRequest.mockResolvedValue(expectedResult);

      // Act
      const result = await client.query(query, variables);

      // Assert
      expect(mockRequest).toHaveBeenCalledWith(query, variables);
      expect(result).toEqual(expectedResult);
    });

    it('should handle complex variables object', async () => {
      // Arrange
      const query =
        'mutation CreateUser($input: UserInput!) { createUser(input: $input) { id } }';
      const variables = {
        input: {
          name: 'John Doe',
          email: 'john@example.com',
          metadata: {
            preferences: {theme: 'dark'},
            tags: ['developer', 'typescript'],
          },
        },
      };
      const expectedResult = {createUser: {id: '456'}};
      mockRequest.mockResolvedValue(expectedResult);

      // Act
      const result = await client.query(query, variables);

      // Assert
      expect(mockRequest).toHaveBeenCalledWith(query, variables);
      expect(result).toEqual(expectedResult);
    });

    it('should return typed result', async () => {
      // Arrange
      interface User {
        id: string;
        name: string;
      }
      interface QueryResult {
        users: User[];
      }

      const query = 'query { users { id name } }';
      const expectedResult: QueryResult = {
        users: [{id: '1', name: 'John'}],
      };
      mockRequest.mockResolvedValue(expectedResult);

      // Act
      const result = await client.query<QueryResult>(query);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].id).toBe('1');
    });
  });

  describe('Error handling', () => {
    let client: DripsGraphQLClient;

    beforeEach(() => {
      client = createGraphQLClient();
    });

    it('should wrap GraphQL client errors in DripsError', async () => {
      // Arrange
      const query = 'query { invalidField }';
      const originalError = new Error('GraphQL validation error');
      mockRequest.mockRejectedValue(originalError);

      // Act & Assert
      await expect(client.query(query)).rejects.toThrow(DripsError);
      await expect(client.query(query)).rejects.toThrow('GraphQL query failed');
    });

    it('should include original error as cause in DripsError', async () => {
      // Arrange
      const query = 'query { users }';
      const originalError = new Error('Network error');
      mockRequest.mockRejectedValue(originalError);

      // Act & Assert
      try {
        await client.query(query);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const dripsError = error as DripsError;
        expect(dripsError.cause).toBe(originalError);
      }
    });

    it('should include query metadata in DripsError', async () => {
      // Arrange
      const query = 'query GetUser($id: ID!) { user(id: $id) { name } }';
      const variables = {id: '123'};
      const originalError = new Error('User not found');
      mockRequest.mockRejectedValue(originalError);

      // Act & Assert
      try {
        await client.query(query, variables);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const dripsError = error as DripsError;
        expect(dripsError.meta).toEqual({
          operation: 'GraphQLClient.query',
          query,
          variables,
        });
      }
    });

    it('should include metadata even when variables are undefined', async () => {
      // Arrange
      const query = 'query { users { id } }';
      const originalError = new Error('Server error');
      mockRequest.mockRejectedValue(originalError);

      // Act & Assert
      try {
        await client.query(query);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const dripsError = error as DripsError;
        expect(dripsError.meta).toEqual({
          operation: 'GraphQLClient.query',
          query,
          variables: undefined,
        });
      }
    });

    it('should handle GraphQL client throwing non-Error objects', async () => {
      // Arrange
      const query = 'query { users }';
      const originalError = 'String error';
      mockRequest.mockRejectedValue(originalError);

      // Act & Assert
      try {
        await client.query(query);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const dripsError = error as DripsError;
        expect(dripsError.cause).toBe(originalError);
        expect(dripsError.message).toContain('GraphQL query failed');
      }
    });

    it('should handle GraphQL client throwing null/undefined', async () => {
      // Arrange
      const query = 'query { users }';
      mockRequest.mockRejectedValue(null);

      // Act & Assert
      try {
        await client.query(query);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const dripsError = error as DripsError;
        expect(dripsError.cause).toBe(null);
        expect(dripsError.message).toContain('GraphQL query failed');
      }
    });
  });

  describe('Constants', () => {
    it('should export correct default GraphQL URL', () => {
      expect(DEFAULT_GRAPHQL_URL).toBe('https://graphql.drips.network');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple sequential queries', async () => {
      // Arrange
      const client = createGraphQLClient();
      const query1 = 'query { users { id } }';
      const query2 = 'query { posts { title } }';
      const result1 = {users: [{id: '1'}]};
      const result2 = {posts: [{title: 'Hello'}]};

      mockRequest.mockResolvedValueOnce(result1).mockResolvedValueOnce(result2);

      // Act
      const response1 = await client.query(query1);
      const response2 = await client.query(query2);

      // Assert
      expect(response1).toEqual(result1);
      expect(response2).toEqual(result2);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent queries', async () => {
      // Arrange
      const client = createGraphQLClient();
      const query1 = 'query { users { id } }';
      const query2 = 'query { posts { title } }';
      const result1 = {users: [{id: '1'}]};
      const result2 = {posts: [{title: 'Hello'}]};

      mockRequest
        .mockImplementationOnce(() => Promise.resolve(result1))
        .mockImplementationOnce(() => Promise.resolve(result2));

      // Act
      const [response1, response2] = await Promise.all([
        client.query(query1),
        client.query(query2),
      ]);

      // Assert
      expect(response1).toEqual(result1);
      expect(response2).toEqual(result2);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('should maintain separate client instances', () => {
      // Arrange
      const url1 = 'https://api1.example.com/graphql';
      const url2 = 'https://api2.example.com/graphql';

      // Act
      const client1 = createGraphQLClient(url1);
      const client2 = createGraphQLClient(url2);

      // Assert
      expect(GraphQLClient).toHaveBeenCalledWith(url1);
      expect(GraphQLClient).toHaveBeenCalledWith(url2);
      expect(GraphQLClient).toHaveBeenCalledTimes(2);
      expect(client1).not.toBe(client2);
    });
  });
});
