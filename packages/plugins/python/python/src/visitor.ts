import {
  ParsedConfig,
  BaseVisitor,
  EnumValuesMap,
  indentMultiline,
  indent,
  buildScalars,
  getBaseTypeNode,
} from '@graphql-codegen/visitor-plugin-common';
import { PythonResolversPluginRawConfig } from './config';
import {
  GraphQLSchema,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  TypeNode,
  Kind,
  isNonNullType,
  isScalarType,
  isInputObjectType,
  isEnumType,
  StringValueNode,
  InterfaceTypeDefinitionNode,
} from 'graphql';
import {
  PYTHON_SCALARS,
  PythonDeclarationBlock,
  PythonClassDeclarationBlock,
  PythonRequiredClassMemberDeclarationBlock,
  PythonNonRequiredClassMemberDeclarationBlock,
} from './common/common';
import { ConstDeclarationContext } from 'java-ast/dist/parser/JavaParser';

export interface PythonResolverParsedConfig extends ParsedConfig {
  className: string;
  listType: string;
  enumValues: EnumValuesMap;
  license: string;
  imports: string[];
  decorators: string[];
}

type WrapModifiersOptions = {
  wrapOptional(type: string): string;
  wrapArray(type: string): string;
};

export class PythonResolversVisitor extends BaseVisitor<PythonResolversPluginRawConfig, PythonResolverParsedConfig> {
  constructor(rawConfig: PythonResolversPluginRawConfig, private _schema: GraphQLSchema) {
    super(rawConfig, {
      enumValues: rawConfig.enumValues || {},
      listType: rawConfig.listType || 'typing.List',
      className: rawConfig.className || 'Types',
      scalars: buildScalars(_schema, rawConfig.scalars, PYTHON_SCALARS),
      license: rawConfig.license || '# take the blue pill',
      imports: rawConfig.imports || ['import typing', 'from dataclasses import dataclass'],
      decorators: rawConfig.decorators || ['dataclass'],
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
    return new PythonClassDeclarationBlock()
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
      result.typeName = this.wrapTypeWithModifiers(result.typeName, typeNode, this.config.listType);
    }

    return result;
  }

  //   protected wrapTypeWithModifiers(
  //     baseType: string,
  //     type: GraphQLOutputType,
  //     options: WrapModifiersOptions
  //   ): string {
  //     let currentType = type;
  //     const modifiers: Array<(type: string) => string> = [];
  //     while (currentType) {
  //       if (isNonNullType(currentType)) {
  //         currentType = currentType.ofType;
  //       } else {
  //         modifiers.push(options.wrapOptional);
  //       }

  //       if (isListType(currentType)) {
  //         modifiers.push(options.wrapArray);
  //         currentType = currentType.ofType;
  //       } else {
  //         break;
  //       }
  //     }

  //     return modifiers.reduceRight((result, modifier) => modifier(result), baseType);
  //   }

  protected wrapTypeWithModifiers(
    baseType: string,
    typeNode: TypeNode,
    listType = 'Iterable',
    modifiers: string = ''
  ): string {
    let currentModifiers = modifiers;

    if (typeNode.kind === Kind.NON_NULL_TYPE) {
      return this.wrapTypeWithModifiers(baseType, typeNode.type, listType);
    } else if (typeNode.kind === Kind.LIST_TYPE) {
      const innerType = this.wrapTypeWithModifiers(baseType, typeNode.type, listType);
      return `${listType}[${innerType}]`;
    } else {
      return baseType;
    }
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

  //    isStringValueNode(node: any): node is StringValueNode {
  //     return node && typeof node === 'object' && node.kind === Kind.STRING;
  //   }

  docstring(content: StringValueNode, indentLevel = 0, asComment = false): string {
    if (!content) {
      return '';
    }

    const commentStr = asComment === true ? '#' : '"""';
    // if (isStringValueNode(content)) {
    //   content = content.value;
    // }
    let contentValue = content.value;

    contentValue = contentValue.split('*/').join('*\\/');

    let lines = contentValue.split('\n');
    if (lines.length === 1) {
      return indent(`${commentStr} ${lines[0]} ${commentStr}`, indentLevel);
    }
    lines = [`${commentStr}`, ...lines.map(line => `${line}`), `${commentStr}`];
    return lines.map(line => indent(line, indentLevel)).join('\n');
  }
  // Builds a python class

  buildClass(
    node: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode | InputObjectTypeDefinitionNode
  ): PythonClassDeclarationBlock {
    const requiredFields = node.fields.filter(arg => arg.type.kind === Kind.NON_NULL_TYPE);
    const nonRequiredFields = node.fields.filter(arg => arg.type.kind !== Kind.NON_NULL_TYPE);
    let vll = new PythonClassDeclarationBlock()
      .withName(node.name.value)
      .withDecorators(this.config.decorators)
      .withBaseclasses(node.interfaces.map(currentInterface => currentInterface.name.value))
      // .implements(node.interfaces.map(currentInterface => currentInterface.name.value))
      .withDocstring(node.description);
    //   .withRequiredFields(requiredFields)
    //   .withNonRequiredFields(nonRequiredFields);

    requiredFields.forEach(requiredField => {
      const f = new PythonRequiredClassMemberDeclarationBlock()
        .withParent(vll)
        .withTypeAnnotation(this.resolveInputFieldType(requiredField.type).typeName)
        .withDocstring(requiredField.description)
        .withName(requiredField.name);

      vll._requiredFields.push(f); // TODO: wtf
    });
    nonRequiredFields.forEach(nonRequiredField => {
      const f = new PythonNonRequiredClassMemberDeclarationBlock()
        .withParent(vll)
        .withTypeAnnotation(this.resolveInputFieldType(nonRequiredField.type).typeName)
        .withDocstring(nonRequiredField.description)
        .withName(nonRequiredField.name)
        .withValue(nonRequiredField)
        ;

      vll._nonRequiredFields.push(f); // TODO: wtf
    });
    return vll;
  }
  //     // We separate the required fields (NonNullable) from the others since they will need to be
  //     // declared first.
  //     const requiredFields = node.fields.filter(arg => arg.type.kind === Kind.NON_NULL_TYPE)

  //     const nonRequiredFields = node.fields.filter(arg => arg.type.kind !== Kind.NON_NULL_TYPE)

  //     requiredFields.map( requiredField => {
  //         const fieldDefinition = new PythonDeclarationBlock()
  //         .asKind("field")
  //         .withName(requiredField.name.value)
  //         .withComment(requiredField.description)
  //     })

  //     node.fields.map(arg => {
  //         const typeToUse = this.resolveInputFieldType(arg.type);
  //         // const isRequired = isNonNullType(arg.type);
  //         const fieldComment = this.docstring(arg.description, 0, true);
  //         vll.addClassMember(arg.name.value, typeToUse.typeName, null, [], {}
  //             )
  //     });

  //     // node.fields.forEach(field => {
  //     //     vll.addClassMember(field.name.value, this.resolveInputFieldType(field.type.value));
  //     // })

  //     console.log(`vvvvvvv ${vll.string}`);

  //     return vll.string;

  //     let classDeclaration: string[] = [];

  //     classDeclaration = [...this.config.decorators];

  //     classDeclaration.push(`class ${node.name.value}:`);
  //     const classComment = this.docstring(node.description, 0, false);
  //     classDeclaration.push(indent(`${classComment}`));

  //     node.fields.map(arg => {
  //       const typeToUse = this.resolveInputFieldType(arg.type);
  //       const fieldComment = this.docstring(arg.description, 0, true);
  //       classDeclaration.push(indent(`${fieldComment}`));
  //       let defaultValue = '';
  //       if (arg.defaultValue && arg.defaultValue.value) {
  //         if (typeof arg.defaultValue.value === 'string') {
  //           defaultValue = ` = "${arg.defaultValue.value}"`;
  //         } else {
  //           defaultValue = ` = ${arg.defaultValue.value}`;
  //         }
  //         //   classDeclaration.push(`hasdefault ${arg.defaultValue.value}`);
  //       }
  //       classDeclaration.push(indent(`${arg.name.value}: ${typeToUse.typeName} ${defaultValue}`));
  //       classDeclaration.push('');
  //       // return [indent(`${arg.description}`), indent(`${arg.name.value}: ${typeToUse.typeName}`)];
  //     });
  //     return classDeclaration.join('\n');
  //   }

  InputObjectTypeDefinition(node: InputObjectTypeDefinitionNode): string {
    return this.buildClass(node).string;
    // const name = `${this.convertName(node)}`;
    // return this.buildInputTransfomer(name, node.fields);
  }

  ObjectTypeDefinition(node: ObjectTypeDefinitionNode): string {
    return this.buildClass(node).string;
  }

  InterfaceTypeDefinition(node: InterfaceTypeDefinitionNode): string {
    return this.buildClass(node).string;
  }
}
