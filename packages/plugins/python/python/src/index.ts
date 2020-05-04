import { parse, GraphQLSchema, printSchema, visit } from 'graphql';
import { PluginFunction, Types } from '@graphql-codegen/plugin-helpers';
import { PythonResolversVisitor } from './visitor';
import { buildPackageNameFromPath } from './common/common';
import { dirname, normalize } from 'path';
import { PythonResolversPluginRawConfig } from './config';

export const plugin: PluginFunction<PythonResolversPluginRawConfig> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: PythonResolversPluginRawConfig,
  { outputFile }
): Promise<string> => {
  const relevantPath = dirname(normalize(outputFile));
  const defaultPackageName = buildPackageNameFromPath(relevantPath);
  const visitor = new PythonResolversVisitor(config, schema, defaultPackageName);
  const printedSchema = printSchema(schema);
  const astNode = parse(printedSchema);
  const visitorResult = visit(astNode, { leave: visitor as any });

  const license = visitor.getLicense();
  const imports = visitor.getImports();

  const blockContent = visitorResult.definitions.filter(d => typeof d === 'string').join('\n');

  return [license, '', imports, blockContent].join('\n');
};
