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
