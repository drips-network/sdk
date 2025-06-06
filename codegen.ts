import 'dotenv/config';
import {CodegenConfig} from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  config: {
    nonOptionalTypename: true,
    dedupeFragments: true,
  },
  schema: './schema.graphql',
  generates: {
    './src/internal/graphql/__generated__/base-types.ts': {
      plugins: ['typescript'],
    },
    './src/': {
      preset: 'near-operation-file',
      documents: ['src/**/!(*.generated).{ts,graphql}'],
      presetConfig: {
        folder: '__generated__',
        extension: '.generated.ts',
        gqlTagName: 'gql',
        fileName: 'gql',
        pruneGeneratedFiles: true,
        baseTypesPath: 'internal/graphql/__generated__/base-types.ts',
      },
      plugins: ['typescript-operations'],
      config: {
        dedupeFragments: true,
        namingConvention: {
          enumValues: 'keep',
        },
        useTypeImports: true,
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

export default config;
