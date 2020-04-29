import {
  ParsedConfig,
  BaseVisitor,
  EnumValuesMap,
  indentMultiline,
  indent,
  buildScalars,
  getBaseTypeNode,
  transformComment,
} from '@graphql-codegen/visitor-plugin-common';
import { PythonResolversPluginRawConfig } from './config';
import {
  GraphQLSchema,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  TypeNode,
  Kind,
  isScalarType,
  isInputObjectType,
  isEnumType,
} from 'graphql';
import { PYTHON_SCALARS, PythonDeclarationBlock, wrapTypeWithModifiers } from './common/common';

export interface PythonResolverParsedConfig extends ParsedConfig {
  className: string;
  listType: string;
  enumValues: EnumValuesMap;
  license: string;
  imports: string[];
  decorators: string[];
}

export class PythonResolversVisitor extends BaseVisitor<PythonResolversPluginRawConfig, PythonResolverParsedConfig> {
  constructor(rawConfig: PythonResolversPluginRawConfig, private _schema: GraphQLSchema) {
    super(rawConfig, {
      enumValues: rawConfig.enumValues || {},
      listType: rawConfig.listType || 'List',
      className: rawConfig.className || 'Types',
      scalars: buildScalars(_schema, rawConfig.scalars, PYTHON_SCALARS),
      license: rawConfig.license || '# take the blue pill',
      imports: rawConfig.imports || ['from dataclasses import dataclass'],
      decorators: rawConfig.decorators || ['@dataclass', '@dataclass_json'],
    });
  }

  /* returns the license from the config */
  public getLicense(): string {
    return this.config.license;
  }

  public getImports(): string {
    return this.config.imports.join('\n');

    //     const allImports = ['System', 'System.Collections.Generic', 'Newtonsoft.Json', 'GraphQL'];
    //     return allImports.map(i => `using ${i};`).join('\n') + '\n';
  }

  // not needed
  public wrapWithClass(content: string): string {
    return new PythonDeclarationBlock()
      .asKind('class')
      .withDecorators(['@dataclass'])
      .withName(this.config.className)
      .withBlock(indentMultiline(content)).string;
  }

  protected getEnumValue(enumName: string, enumOption: string): string {
    if (
      this.config.enumValues[enumName] &&
      typeof this.config.enumValues[enumName] === 'object' &&
      this.config.enumValues[enumName][enumOption]
    ) {
      return this.config.enumValues[enumName][enumOption];
    }

    return enumOption;
  }

  EnumValueDefinition(node: EnumValueDefinitionNode): (enumName: string) => string {
    return (enumName: string) => {
      return indent(`${this.getEnumValue(enumName, node.name.value)}`);
    };
  }

  EnumTypeDefinition(node: EnumTypeDefinitionNode): string {
    const enumName = this.convertName(node.name);
    const enumValues = node.values.map(enumValue => (enumValue as any)(node.name.value)).join(',\n');
    const enumBlock = [enumValues].join('\n');

    return new PythonDeclarationBlock()
      .asKind('class')
      .withComment(node.description)
      .withName(enumName)
      .withBlock(enumBlock).string;
  }

  protected resolveInputFieldType(
    typeNode: TypeNode
  ): { baseType: string; typeName: string; isScalar: boolean; isArray: boolean } {
    const innerType = getBaseTypeNode(typeNode);
    const schemaType = this._schema.getType(innerType.name.value);
    const isArray =
      typeNode.kind === Kind.LIST_TYPE ||
      (typeNode.kind === Kind.NON_NULL_TYPE && typeNode.type.kind === Kind.LIST_TYPE);
    let result: { baseType: string; typeName: string; isScalar: boolean; isArray: boolean } = null;

    if (isScalarType(schemaType)) {
      if (this.scalars[schemaType.name]) {
        result = {
          baseType: this.scalars[schemaType.name],
          typeName: this.scalars[schemaType.name],
          isScalar: true,
          isArray,
        };
      } else {
        result = { isArray, baseType: 'Object', typeName: 'Object', isScalar: true };
      }
    } else if (isInputObjectType(schemaType)) {
      result = {
        baseType: `${this.convertName(schemaType.name)}`,
        typeName: `${this.convertName(schemaType.name)}`,
        isScalar: false,
        isArray,
      };
    } else if (isEnumType(schemaType)) {
      result = {
        isArray,
        baseType: this.convertName(schemaType.name),
        typeName: this.convertName(schemaType.name),
        isScalar: true,
      };
    } else {
      result = {
        baseType: `${schemaType.name}`,
        typeName: `${schemaType.name}`,
        isScalar: false,
        isArray,
      };
    }

    if (result) {
      result.typeName = wrapTypeWithModifiers(result.typeName, typeNode, this.config.listType);
    }

    return result;
  }

  protected buildObject(
    name: string,
    inputValueArray: ReadonlyArray<FieldDefinitionNode>,
    description?: string
  ): string {
    const classMembers = inputValueArray
      .map(arg => {
        const typeToUse = this.resolveInputFieldType(arg.type);
        return indent(`${arg.name.value}: ${typeToUse.typeName}`);
      })
      .join('\n');

    const decorators = this.config.decorators.join('\n');

    const desc = indent(`"""
${description} 
"""`);
    return `
${decorators}
class ${name}:
${description}
${classMembers}
  `;
  }

  protected buildInputTransfomer(name: string, inputValueArray: ReadonlyArray<InputValueDefinitionNode>): string {
    const classMembers = inputValueArray
      .map(arg => {
        const typeToUse = this.resolveInputFieldType(arg.type);

        return indent(`public ${typeToUse.typeName} ${arg.name.value} { get; set;}`);
      })
      .join('\n');

    const getInputObject = inputValueArray
      .map(arg => {
        const typeToUse = this.resolveInputFieldType(arg.type);
        if (typeToUse.typeName === 'DateTime') {
          return indent(`
              if (this.${arg.name.value} != default(DateTime))
              {
                d["${arg.name.value}"] = ${arg.name.value};
              }`);
        } else if (typeToUse.typeName === 'int' || typeToUse.typeName === 'float') {
          return indent(`
              if (this.${arg.name.value} != 0)
              {
                d["${arg.name.value}"] = ${arg.name.value};
              }`);
        } else {
          return indent(`
              if (this.${arg.name.value} != null)
              {
                d["${arg.name.value}"] = ${arg.name.value};
              }`);
        }
      })
      .join('\n');

    return `
  #region ${name}
  public class ${name} {
    #region members
    ${classMembers}
    #endregion
  
    #region methods
    public System.Dynamic.ExpandoObject getInputObject(){
      dynamic eo = new System.Dynamic.ExpandoObject();
      IDictionary<string, object> d = (IDictionary<string, object>)eo;
      ${getInputObject}
      return eo;
    }
    #endregion
  
  
  }
  #endregion
  `;
  }

  InputObjectTypeDefinition(node: InputObjectTypeDefinitionNode): string {
    const name = `${this.convertName(node)}`;
    return this.buildInputTransfomer(name, node.fields);
  }

  ObjectTypeDefinition(node: ObjectTypeDefinitionNode): string {
    return this.buildObject(node.name.value, node.fields, transformComment(node.description));
  }

  InterfaceTypeDefinition(node: InterfaceTypeDefinitionNode): string {
    return this.buildObject(node.name.value, node.fields);
  }
}
