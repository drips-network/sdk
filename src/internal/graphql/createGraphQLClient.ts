import {GraphQLClient} from 'graphql-request';
import {DripsError} from '../shared/DripsError';

export interface DripsGraphQLClient {
  query<T, V extends object = Record<string, any>>(
    query: string,
    variables?: V,
  ): Promise<T>;
}

export const DEFAULT_GRAPHQL_URL = 'http://localhost:8080';

export function createGraphQLClient(
  url: string = DEFAULT_GRAPHQL_URL,
  apiKey?: string,
): DripsGraphQLClient {
  if (!url) {
    throw new DripsError('Missing required GraphQL endpoint');
  }

  const headers: Record<string, string> = {};

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const client = new GraphQLClient(url, {headers});

  return {
    query: async <T, V extends object = Record<string, any>>(
      query: string,
      variables?: V,
    ): Promise<T> => {
      try {
        return await client.request<T>(query, variables);
      } catch (error) {
        throw new DripsError('GraphQL query failed', {
          cause: error,
          meta: {
            operation: 'GraphQLClient.query',
            query,
            variables,
          },
        });
      }
    },
  };
}
