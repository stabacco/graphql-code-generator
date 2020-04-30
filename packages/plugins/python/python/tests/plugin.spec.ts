import { plugin } from '../src/index';
import { buildSchema } from 'graphql';

describe('A simple type with comments', () => {
  const schema = buildSchema(/* GraphQL */ `
    """
    This is my type
    """
    type MyType {
      """
      This is my real
      """
      real: Int!
    }

    """
    A constant segment of a complex-valued function of time.
    """
    input ComplexSegment {
      """
      The duration of the segment.
      """
      duration: Float!
      """
      The value taken by the function on this segment.
      """
      value: String!
      """
      The matching class in core.
      """
      _core_type: String = "ComplexSegment"
    }

    """
    A constant segment of a complex-valued function of time.
    """
    input ComplexSegment22 {
      """
      The duration of the segment.
      """
      duration: Float!
      """
      The value taken by the function on this segment.
      """
      value: String!
      """
      The matching class in core.
      """
      _core_type: String = "ComplexSegment"
    }

    type A {
      a_string: String
    }

    type B {
      a: A!
      b_string: String
    }
  `);

  it('Should create a class with docstring', async () => {
    const result = await plugin(
      schema,
      [],
      {
        globalNamespace: true,
        license: '# This is my license, dawg',
      },
      { outputFile: './del.ts' }
    );

    expect(result).toBe(`# generated automatically by Stefano


from dataclasses import dataclass


@dataclass
class MyType:
    real: int

`);
  });
});
