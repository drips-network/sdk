import 'dotenv/config';
import type {CodegenConfig} from '@graphql-codegen/cli';
import {unreachable} from './src/internal/shared/unreachable';

if (!process.env.GRAPHQL_URL) {
  throw new Error(
    'In order to build GraphQL types, you must provide GRAPHQL_URL env var for the Drips GraphQL API.',
  );
}

const config: CodegenConfig = {
  schema: [
    {
      [process.env.GRAPHQL_URL ?? unreachable()]: {},
    },
  ],
  generates: {
    './schema.graphql': {
      plugins: ['schema-ast'],
    },
  },
};

export default config;
