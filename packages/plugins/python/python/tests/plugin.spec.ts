import { plugin } from '../src/index';
import { buildSchema } from 'graphql';

describe('My Plugin', () => {
  const schema = buildSchema(/* GraphQL */ `
    """
    This is my type
    """
    type MyType {
      real: Int!
    }

    """
    This is my input
    """
    input MyInput {
      forsure: String! = "are you sure"
    }
    """
    This is a query
    """
    type Query {
      foo: String!
    }
  `);

  it('Should greet', async () => {
    const result = await plugin(
      schema,
      [],
      {
        globalNamespace: true,
      },
      { outputFile: './del.ts' }
    );

    expect(result).toBe('Hello Dotan!');
  });
});
