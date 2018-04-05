/* @flow */

import { reduce, toPairs } from './springbok'
import { type TypeDeclarations, type TypeAST, type TypeTag } from './ast'

type PrimitiveSet = {[$PropertyType<TypeAST, 'type'>]: boolean}

export const typesEmployed = (dec: TypeAST): PrimitiveSet => {
  switch(dec.type) {
      case "string":
      case "number":
      case "boolean":
        return {[dec.type]: true}
      case "array":
      case "nullable":
      case "dictionary":
        return {...typesEmployed(dec.arg), [dec.type]: true}
      case "tuple":
        return dec.fields.reduce(
          (acc, field) => ({...acc, ...typesEmployed(field)}),
          {}
        )
      case "record":
        return toPairs(dec.fields).reduce(
          (acc, [fieldName, fieldAST]) =>
            ({...acc, ...typesEmployed(fieldAST)}),
          {'record': true}
        )
      case "disjoint":
        return toPairs(dec.variants).reduce(
          (acc, [name, fieldDict]) =>
            toPairs(fieldDict).reduce(
              (acc, [fieldName, fieldType]) => ({...acc, ...typesEmployed(fieldType)}),
              {}
            ),
          {'string': true, 'record': true}
        )
      case "enum":
      case "reference":
      default:
        return {}
    }
}

const generateFlowTypeDeclaration = (ast: TypeAST): string => {
  const nonNullArg = (ast: TypeAST): * =>
    ast.type === 'nullable'
      ? nonNullArg(ast.arg)
      : ast
  if (
    ast.type === 'string' ||
    ast.type === 'number' ||
    ast.type === 'boolean'
  ) {
    return ast.type
  } else if (
    ast.type === 'array'
  ) {
    return `Array<${generateFlowTypeDeclaration(ast.arg)}>`
  } else if (
    ast.type === 'nullable'
  ) {
    return `null | ${generateFlowTypeDeclaration(nonNullArg(ast.arg))}`
  } else if (
    ast.type === 'dictionary'
  ) {
    return `{[string]: ${generateFlowTypeDeclaration(ast.arg)}}`
  } else if (
    ast.type === 'tuple'
  ) {
    return `[${ast.fields.map(generateFlowTypeDeclaration).join(', ')}]`
  } else if (
    ast.type === 'record'
  ) {
    return `{${
      toPairs(ast.fields)
      .map(([fieldName, fieldAST]) => `${fieldName}: ${generateFlowTypeDeclaration(fieldAST)}`)
      .join('')
    }}`
  } else if (
    ast.type === 'disjoint'
  ) {
    const disjoint = ast
    return toPairs(disjoint.variants).map(
      ([tag, fieldDict]) => `{ ${disjoint.tagKey}: "${tag}", ${
        toPairs(fieldDict)
        .map(
          ([fieldName, fieldAST]) => `${fieldName}: ${generateFlowTypeDeclaration(fieldAST)}`
        ).join(', ')
      } }`
    ).join(' | ')
  } else if (ast.type === 'reference') {
    return ast.name
  } else if (ast.type === 'enum') {
    return ast.variants.map((stringLiteral) => `"${stringLiteral}"`).join(' | ')
  }
  return '' // TODO: Why doesn't flow know this is exhaustive?
}

console.log(
  generateFlowTypeDeclaration(
    {
      type: 'array',
      arg: {
        type: 'disjoint',
        tagKey: 'class',
        variants: {
          'bourgeois': {
            'wageIncome': {type: 'number'},
            'capitalIncome': {type: 'number'},
            'trend': {type: 'tuple', fields: [{type: 'number'}, {type: 'number'}, {type: 'number'}]}
          },
          'proletarian': {
            'wageIncome': {type: 'number'}
          }
        }
      }
    }
  )
)
