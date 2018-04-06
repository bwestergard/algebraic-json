/* @flow */

export type FieldDict = { [fieldName: string]: TypeAST }

export type TypeAST =
| {| type: 'string' |} // Prim
| {| type: 'number' |} // Prim
| {| type: 'boolean' |} // Prim
| {| type: 'enum', variants: string[] |} // Ex
| {| type: 'reference', name: string |}
| {| type: 'array', arg: TypeAST |} // Ex
| {| type: 'nullable', arg: TypeAST |} // Generic
| {| type: 'dictionary', arg: TypeAST |} // Ex
| {| type: 'tuple', fields: Array<TypeAST> |} // Ex
| {| type: 'record', fields: FieldDict |} // Ex
| {| type: 'disjoint', tagKey: string, variants: {[tag: string]: FieldDict } |} // Ex

export type TypeTag = $PropertyType<TypeAST, 'type'>

export type TypeDeclarations = {[identifier: string]: TypeAST}
