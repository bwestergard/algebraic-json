/* @flow */

import { reduce, toPairs } from './springbok'
import { type TypeDeclarations, type TypeAST, type TypeTag } from './ast'
import { indent } from './stringUtils'

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
    return `Array<\n${indent(generateFlowTypeDeclaration(ast.arg))}\n>`
  } else if (
    ast.type === 'nullable'
  ) {
    return `null | ${generateFlowTypeDeclaration(nonNullArg(ast.arg))}`
  } else if (
    ast.type === 'dictionary'
  ) {
    return `{\n[string]: ${generateFlowTypeDeclaration(ast.arg)}\n}`
  } else if (
    ast.type === 'tuple'
  ) {
    return `[\n${ast.fields.map((fieldAst) => indent(generateFlowTypeDeclaration(fieldAst))).join(',\n')}\n]`
  } else if (
    ast.type === 'record'
  ) {
    return `{\n${
      toPairs(ast.fields)
      .map(([fieldName, fieldAST]) => indent(`${fieldName}: ${generateFlowTypeDeclaration(fieldAST)}`))
      .join(',\n')
    }\n}`
  } else if (
    ast.type === 'disjoint'
  ) {
    const disjoint = ast
    return toPairs(disjoint.variants).map(
      ([tag, fieldDict]) => `| {\n${
        ([[disjoint.tagKey, {type: 'reference', name: `"${tag}"`}]]).concat(toPairs(fieldDict)) // TODO hack!
        .map(
          ([fieldName, fieldAST]) => indent(`${fieldName}: ${generateFlowTypeDeclaration(fieldAST)}`)
        ).join(',\n')
      }\n}`
    ).join('\n')
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
      type: 'record',
      fields: {
        'value': { type: 'number' },
        'left': { type: 'reference', name: 'Tree' },
        'right': { type: 'reference', name: 'Tree' }
      }
    }
  )
)
