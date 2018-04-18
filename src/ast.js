/* @flow */

import { Ok, Err, andThen, mapOk, type Result, collectResultArray } from './result'
import { toPairs } from './springbok'

type FieldDict = { [fieldName: string]: TypeAST }

type AssocList<T> = Array<[string, T]>
type FieldAssocLists = { required: AssocList<ParsedTypeAST>, optional: AssocList<ParsedTypeAST> }
type NamedVariants = AssocList<FieldAssocLists>
type OptField = { required: boolean, type: ParsedTypeAST }

export type TypeAST =
| {| type: 'string' |} // Prim
| {| type: 'number' |} // Prim
| {| type: 'boolean' |} // Prim
| {| type: 'enum', variants: string[] |} // Ex
| {| type: 'reference', name: string |}
| {| type: 'array', arg: TypeAST |} // Ex
| {| type: 'nullable', arg: TypeAST |} // Generic
| {| type: 'dictionary', arg: TypeAST|} // Ex
| {| type: 'tuple', fields: Array<TypeAST> |} // Ex
| {| type: 'record', fields: FieldDict |} // Ex
| {| type: 'disjoint', tagKey: string, variants: {[tag: string]: FieldDict } |} // Ex

export type ParsedTypeAST =
| {| type: 'string' |} // Prim
| {| type: 'number' |} // Prim
| {| type: 'boolean' |} // Prim
| {| type: 'enum', variants: string[] |} // Ex
| {| type: 'reference', name: string |}
| {| type: 'array', arg: ParsedTypeAST |} // Ex
| {| type: 'nullable', arg: ParsedTypeAST |} // Generic
| {| type: 'dictionary', arg: ParsedTypeAST |} // Ex
| {| type: 'tuple', fields: Array<ParsedTypeAST> |} // Ex
| {| type: 'record', fields: FieldAssocLists |} // Ex
| {| type: 'disjoint', tagKey: string, variants: NamedVariants |} // Ex

export type TypeTag = $PropertyType<TypeAST, 'type'>
export type TypeDeclarations = {[identifier: string]: TypeAST}

// PARSING

// Sort because iteration order of JSON objects is not guaranteed, and we want stable code output.
const toAssocList = <T>(
  obj: {[key: string]: T}
): AssocList<T> =>
toPairs(obj)
.sort(([keyA], [keyB]) => keyA.localeCompare(keyB))


const parse = (
  ast: TypeAST
): Result<ParsedTypeAST, string> => {

  const parseFields = (
    pairs: Array<[string, TypeAST]>
  ): Result<FieldAssocLists, string> => mapOk(
    collectResultArray(
      pairs,
      ([key, field]): Result<[string, OptField], string> => {
        if (key === '') return Err('Field name cannot be empty.')

        const lastChar = key.slice(-1)
        if (lastChar === '?') {
          return mapOk(
            parse(field),
            (parsed) => [ key.slice(0, -1), { required: false, type: parsed } ]
          )
        } else {
          return mapOk(
            parse(field),
            (parsed) => [ key, { required: true, type: parsed } ]
          )
        }
      }
    ),
    (optFieldAssocList) => optFieldAssocList.reduce(
      (acc, [fieldName, optField]) => optField.required
        ? { optional: acc.optional, required: acc.required.concat([[fieldName, optField.type]]) }
        : { required: acc.required, optional: acc.optional.concat([[fieldName, optField.type]]) },
      { required: [], optional: [] }
    )
  )

  if (ast.type === 'array') {
    return mapOk(
      parse(ast.arg),
      (arg) => ({
        type: 'array',
        arg: arg
      })
    )
  }
  if (ast.type === 'dictionary') {
    return mapOk(
      parse(ast.arg),
      (arg) => ({
        type: 'dictionary',
        arg: arg
      })
    )
  }
  if (ast.type === 'nullable') {
    return andThen(
      parse(ast.arg),
      (arg) => arg.type !== 'nullable'
        ? Ok({
          type: 'nullable',
          arg: arg
        })
        : Err('The argument to nullable cannot be nullable, as this is redundant.')
    )
  }
  if (ast.type === 'tuple') {
    return andThen(
      collectResultArray(
        ast.fields,
        parse
      ),
      (fields) => fields.length > 0
        ? Ok({
          type: 'tuple',
          fields
        })
        : Err('Tuples must have at least one field.')
    )
  }
  if (ast.type === 'record') {
    return mapOk(
     parseFields(toAssocList(ast.fields)),
     (fields) => ({
       type: 'record',
       fields: fields
     })
    )
  }
  if (ast.type === 'disjoint') {
    const tagKey = ast.tagKey
    if (tagKey === '') return Err('Tag key cannot be empty string.')

    return mapOk(
      collectResultArray(
        toAssocList(ast.variants),
        ([variantName, fields]) => mapOk(
          parseFields(toAssocList(fields)),
          (variantAssocList) => [variantName, variantAssocList]
        )
      ),
      (variants) => ({
        type: 'disjoint',
        tagKey,
        variants
      })
    )
  }
  return Ok(ast)
}

console.log(
  JSON.stringify(
    parse({
      type: 'disjoint',
      tagKey: 'class',
      variants: {
        proletarian: {
          'child?': {
            type: 'disjoint',
            tagKey: 'class',
            variants: {
              proletarian: {
                'franchise': { type: 'boolean' },
                'wageIncome?': { type: 'number' }
              },
              bourgeois: {
                'franchise': { type: 'boolean' },
                'wageIncome?': { type: 'number' },
                'capitalIncome': { type: 'number' }
              }
            }
          },
          'franchise': { type: 'boolean' },
          'wageIncome?': { type: 'number' }
        },
        bourgeois: {
          'franchise': { type: 'boolean' },
          'wageIncome?': { type: 'number' },
          'capitalIncome': { type: 'number' }
        }
      }
    })
  )
)
