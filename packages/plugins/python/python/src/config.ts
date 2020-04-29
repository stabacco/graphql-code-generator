import { RawConfig, EnumValuesMap } from '@graphql-codegen/visitor-plugin-common';
export interface PythonResolversPluginRawConfig extends RawConfig {
  /**
   * @name enumValues
   * @type EnumValuesMap
   * @description Overrides the default value of enum values declared in your GraphQL schema.
   *
   * @example With Custom Values
   * ```yml
   *   config:
   *     enumValues:
   *       MyEnum:
   *         A: 'foo'
   * ```
   */
  enumValues?: EnumValuesMap;
  /**
   * @name className
   * @type string
   * @default Types
   * @description Allow you to customize the parent class name.
   *
   * @example
   * ```yml
   * generates:
   *   src/main/python/my-org/my-app/MyGeneratedTypes.cs:
   *     plugins:
   *       - python
   *     config:
   *       className: MyGeneratedTypes
   * ```
   */
  className?: string;
  /**
   * @name listType
   * @type string
   * @default IEnumberable
   * @description Allow you to customize the list type
   *
   * @example
   * ```yml
   * generates:
   *   src/main/python/my-org/my-app/Types.cs:
   *     plugins:
   *       - python
   *     config:
   *       listType: Map
   * ```
   */
  listType?: string;
}
