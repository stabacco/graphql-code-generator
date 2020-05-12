import { transformComment, indentMultiline, indent } from '@graphql-codegen/visitor-plugin-common';
import { StringValueNode, NameNode, Kind, ObjectTypeDefinitionNode, FieldDefinitionNode } from 'graphql';
import { resultKeyNameFromField } from 'apollo-utilities';
import {  } from 'handlebars';
const stripIndent = require('strip-indent');

export type Kind = 'class' | 'field' | 'method'; // | 'interface' | 'enum';
export type MemberFlags = {
  transient?: boolean;
  final?: boolean;
  volatile?: boolean;
  static?: boolean;
  isRequired?: boolean;
};

export type ClassMember = { value: string; name: string; type: string; annotations: string[]; flags: MemberFlags };
export type ClassMethod = {
  methodAnnotations: string[];
  args: Partial<ClassMember>[];
  implementation: string;
  name: string;
  returnType: string | null;
  returnTypeAnnotations: string[];
  flags: MemberFlags;
};

/** Block for a python class */

export class PythonDeclarationBlock {
  _name: string = null;
  _decorators?: string[] = [];
  _extendStr: string[] = [];
  _implementsStr: string[] = [];
  _kind: Kind = null;
  _block = null;
  _comment = null;
  _value = null;
  _annotations: string[] = [];
  _members?: ClassMember[] = [];
  _methods?: ClassMethod[] = [];
  _nestedClasses: PythonDeclarationBlock[] = [];
  _indent: number = 0;

  nestedClass(nstCls: PythonDeclarationBlock): PythonDeclarationBlock {
    this._nestedClasses.push(nstCls);

    return this;
  }

  addIndent(value: number = 1): PythonDeclarationBlock {
    this._indent += value;
    return this;
  }

  removeIndent(value: number = 1): PythonDeclarationBlock {
    this._indent -= value;
    this._indent = Math.max(this._indent, 0);
    return this;
  }

  asKind(kind: Kind): PythonDeclarationBlock {
    this._kind = kind;

    return this;
  }

  annotate(annotations: string[]): PythonDeclarationBlock {
    this._annotations = annotations;

    return this;
  }

  withValue(value: any) -> PythonDeclarationBlock {
    this._value = value
  }
  withComment(comment: string | StringValueNode | null): PythonDeclarationBlock {
    if (comment) {
      this._comment = transformComment(comment, 0);
    }

    return this;
  }

  withBlock(block: string): PythonDeclarationBlock {
    this._block = block;

    return this;
  }

  implements(implementsStr: string[]): PythonDeclarationBlock {
    this._implementsStr = implementsStr;

    return this;
  }

  withName(
    name: string | NameNode
  ): PythonDeclarationBlock | PythonClassDeclarationBlock | PythonRequiredClassMemberDeclarationBlock {
    this._name = typeof name === 'object' ? (name as NameNode).value : name;

    return this;
  }

  private printMember(member: Partial<ClassMember>): string {
    const flags = member.flags || {};

    console.log(member);
    let value = member.value;

    let type = member.type;

    if (flags.isRequired == false) {
      value = 'None';
      type = `Optional[${type}]`;
    }
    const pieces = [...(member.annotations || []).map(annotation => `@${annotation}`), type, member.name].filter(
      f => f
    );

    return `${member.name}: ${type}` + (value ? ` = ${value}` : '');
    // return pieces.join(' ') + (member.value ? ` = ${member.value}` : '');
  }

  private printMethod(method: ClassMethod): string {
    const pieces = [
      ...method.methodAnnotations.map(a => `@${a}\n`),
      // method.access,
      // method.flags.static ? 'static' : null,
      // method.flags.final ? 'final' : null,
      // method.flags.transient ? 'transient' : null,
      // method.flags.volatile ? 'volatile' : null,
      ...(method.returnTypeAnnotations || []).map(annotation => `@${annotation}`),
      method.returnType,
      method.name,
    ].filter(f => f);

    const args = method.args.map(arg => this.printMember(arg)).join(', ');

    return `${pieces.join(' ')}(${args}) {
${indentMultiline(method.implementation)}
}`;
  }

  addClassMember(
    name: string,
    type: string,
    value?: string,
    typeAnnotations: string[] = [],
    flags: MemberFlags = {}
  ): PythonDeclarationBlock {
    this._members.push({
      name,
      type,
      value,
      annotations: typeAnnotations,
      // access,
      flags: {
        ...flags,
      },
    });

    return this;
  }

  addClassMethod(
    name: string,
    returnType: string | null,
    impl: string,
    args: Partial<ClassMember>[] = [],
    returnTypeAnnotations: string[] = [],
    access: Access = null,
    flags: MemberFlags = {},
    methodAnnotations: string[] = []
  ): PythonDeclarationBlock {
    this._methods.push({
      name,
      returnType,
      implementation: impl,
      args,
      returnTypeAnnotations,
      flags: {
        final: false,
        transient: false,
        volatile: false,
        static: false,
        ...flags,
      },
      methodAnnotations: methodAnnotations || [],
    });

    return this;
  }

  formattedComment(comment: string | StringValueNode): string | null {
    if (comment != null) {
      if (typeof comment === 'object' && comment.kind === Kind.STRING) {
        comment = comment.value;
        return comment;
      } else if (typeof comment === 'string') {
        return comment;
      }
    }
    return null;
  }

  public get string(): string {
    let result = '';

    if (this._kind) {
      let name = '';

      if (this._name) {
        name = this._name;
      }

      let extendStr = '';
      let implementsStr = '';
      let annotatesStr = '';

      if (this._extendStr.length > 0) {
        extendStr = ` : ${this._extendStr.join(', ')}`;
      }

      if (this._implementsStr.length > 0) {
        implementsStr = `(${this._implementsStr.join(', ')})`;
      }

      if (this._annotations.length > 0) {
        annotatesStr = this._annotations.map(a => `@${a}`).join('\n') + '\n';
      }

      result += `${annotatesStr}${this._kind} ${name}${implementsStr}:`;
    }

    const members = this._members.length
      ? indentMultiline(stripIndent(this._members.map(member => this.printMember(member)).join('\n')))
      : null;
    const methods = this._methods.length
      ? indentMultiline(stripIndent(this._methods.map(method => this.printMethod(method)).join('\n\n')))
      : null;
    const nestedClasses = this._nestedClasses.length
      ? this._nestedClasses.map(c => indentMultiline(c.string)).join('\n\n')
      : null;
    const before = '\n';
    const after = '';
    const block = [before, members, methods, nestedClasses, this._block, after].filter(f => f).join('\n');
    result += block;

    return (this._comment ? this._comment : '') + result + '\n';
  }
}

export class PythonClassDeclarationBlock extends PythonDeclarationBlock {
  _kind: Kind = 'class';
  _name: string = null;
  _decorators?: string[] = [];
  _baseclasses?: string[] = [];
  _docstring?: string = null;
  _members?: ClassMember[] = [];
  _methods?: ClassMethod[] = [];
  _requiredFields: PythonRequiredClassMemberDeclarationBlock[] = [];
  _nonRequiredFields: PythonNonRequiredClassMemberDeclarationBlock[] = [];

  withName(name: string | NameNode): PythonClassDeclarationBlock {
    this._name = typeof name === 'object' ? (name as NameNode).value : name;

    return this;
  }

  withDocstring(comment: string | StringValueNode | null): PythonClassDeclarationBlock {
    this._docstring = this.formattedComment(comment);
    return this;
  }
  withBaseclasses(baseclasses: string[]): PythonClassDeclarationBlock {
    this._baseclasses = baseclasses;
    return this;
  }

  withDecorators(decorators: string[]): PythonClassDeclarationBlock {
    this._decorators = decorators;
    return this;
  }

  withRequiredFields(fields: FieldDefinitionNode[]): PythonClassDeclarationBlock {
    this._requiredFields = fields;
    return this;
  }

  withNonRequiredFields(fields: FieldDefinitionNode[]): PythonClassDeclarationBlock {
    this._nonRequiredFields = fields;
    return this;
  }

  // printString(value: string): string {
  //   return indent(value, this._indent);
  // }

  /** the main serializer function */
  public get string(): string {
    const separator = '';
    let result = [];

    let decorators = [];
    this._decorators.forEach(decorator => {
      decorators.push(`@${decorator}`);
    });

    let classDeclaration = `${this._kind} ${this._name}`;

    if (this._baseclasses.length > 0) {
      classDeclaration += '(';
      classDeclaration += this._baseclasses.join(', ');
      classDeclaration += ')';
    }
    classDeclaration += ':';



    let requiredFields = [];

    this._requiredFields.forEach(requiredField => {
      // console.log(requiredField.string);
      requiredFields.push(requiredField.string);
    });

    let nonRequiredFields = [];
    this._nonRequiredFields.forEach(nonRequiredField => {
      nonRequiredFields.push(nonRequiredField.string);
    });

    let docstring = '';
    if (this._docstring) {
      docstring = `
"""${this._docstring}
"""
`;
    }

    result = result.concat(
      decorators,
      classDeclaration,
      docstring ? indentMultiline(docstring) : '',
      separator,
      requiredFields,
      nonRequiredFields,
      separator
    );
    return result.join('\n');
  }
}

export class PythonRequiredClassMemberDeclarationBlock extends PythonDeclarationBlock {
  _parent: PythonClassDeclarationBlock;
  _kind: Kind = 'field';
  _name: string = null;
  _typeAnnotation: string = null;
  _docstring?: string = null;

  withParent(parent: PythonClassDeclarationBlock): PythonRequiredClassMemberDeclarationBlock {
    this._parent = parent;
    return this;
  }

  withDocstring(comment: string | StringValueNode | null): PythonRequiredClassMemberDeclarationBlock {
    this._docstring = this.formattedComment(comment);
    return this;
  }

  /** the string representation */
  public get string(): string {
    const typeStr = `${this._name}: ${this._typeAnnotation}`;
    if (this._docstring){
    this._parent._docstring += (`\n\n    ${this._name}: ${this._docstring}`)
    console.log(this._parent._docstring)
  }
    return indent(typeStr, this._parent._indent + 1);
  }

  withTypeAnnotation(typeAnnotation: string): PythonRequiredClassMemberDeclarationBlock {
    this._typeAnnotation = typeAnnotation;
    return this;
  }
}

export class PythonNonRequiredClassMemberDeclarationBlock extends PythonDeclarationBlock {
  _parent: PythonClassDeclarationBlock;
  _kind: Kind = 'field';
  _name: string = null;
  _typeAnnotation: string = null;
  _docstring?: string = null;
  _value?: any = null;

  withParent(parent: PythonClassDeclarationBlock): PythonNonRequiredClassMemberDeclarationBlock {
    this._parent = parent;
    return this;
  }

  withDocstring(comment: string | StringValueNode | null): PythonNonRequiredClassMemberDeclarationBlock {
    this._docstring = this.formattedComment(comment);
    return this;
  }

  withTypeAnnotation(typeAnnotation: string): PythonNonRequiredClassMemberDeclarationBlock {
    this._typeAnnotation = typeAnnotation;
    return this;
  }

  withValue(arg: any): PythonNonRequiredClassMemberDeclarationBlock {
    let defaultValue: string = null;
    if (arg.defaultValue != null) {
      if (typeof arg.defaultValue.value === 'string') {
        defaultValue = `"${arg.defaultValue.value}"`;
      } else {
        defaultValue = `${arg.defaultValue.value}`;
      }
    }
    console.log(`val ${defaultValue} 
      `)
    this._value = defaultValue;
    return this;
  }

  /** the string representation */
  public get string(): string {


    const value = this._value === null? 'None' : this._value;

    // TODO: docstring formatter here.
    const typeStr = `${this._name}: typing.Optional[${this._typeAnnotation}] = ${value}`;
    this._parent._docstring += (`\n\n    ${this._name}: ${this._docstring}`)
    console.log(this._parent._docstring)
    return indent(typeStr, this._parent._indent + 1);
  }
  

}
export class PythonClassMethodDeclarationBlock {
  _kind: Kind = 'method';
  _name: string = null;
  _decorators?: string[] = [];
  _docstring?: string = null;
  _signature?: string = null;
}
