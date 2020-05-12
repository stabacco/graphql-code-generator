import { plugin } from '../src/index';
import { buildSchema } from 'graphql';

// describe('A simple type with comments', () => {
//   const schema = buildSchema(/* GraphQL */ `
//     """
//     This is my type
//     """
//     type MyType {
//       """
//       This is my real
//       """
//       real: Int!
//     }

//     "An action"
//     type Action {
//       id: ID!
//       model_id: String
//       name: String
//       status: String
//       model_type: String
//       runtime: Float
//       definition: String
//       result: String
//     }
//   `);

//   it('Should create a class with docstring', async () => {
//     const result = await plugin(
//       schema,
//       [],
//       {
//         globalNamespace: true,
//         license: '# This is my license, dawg',
//       },
//       { outputFile: './del.ts' }
//     );

//     expect(result).toBe(`# generated automatically by Stefano


// from dataclasses import dataclass


// @dataclass
// class MyType:
//     real: int

// `);
//   });
// });

describe('Interface Example', () => {
  const schema = buildSchema(`

"""Common Node declaration"""
interface Node {
  """The much needed id"""
  id: ID!
}

"""A node which was implemented"""
type A implements Node {

    id: ID!
    """A Parameter"""
    a: String
}

`);
  it('Should parse correctly', async () => {
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

`);
  });
});
