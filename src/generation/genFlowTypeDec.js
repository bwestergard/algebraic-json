/* @flow */

import { flowTypeIdGen, tupleDecTemplate, recordDecTemplate } from './codeTemplates'
import { type ParsedTypeAST, parse } from '../structures/ast'

export const genFlowTypeDec = (ast: ParsedTypeAST): string => {
  const recordDeclaration = (fields, tag: null | {tagKey: string, tagValue: string}) =>
  recordDecTemplate(
    fields.required
    .concat(
      fields.optional.map(([fieldName, type]) => [fieldName + '?', type])
    )
    .map(([fieldName, type]) => `${fieldName}: ${genFlowTypeDec(type)}`)
    .concat((tag === null ? [] : [`${tag.tagKey}: "${tag.tagValue}"`])),
    tag
  )

  if (
    ast.type === 'string' ||
    ast.type === 'number' ||
    ast.type === 'boolean'
  ) {
    return ast.type
  }
  if (ast.type === 'enum') {
    return ast.variants.map((literal) => `"${literal}"`).join(' | ')
  }
  if (ast.type === 'reference') {
    // TODO .name is a bad attribute name
    return flowTypeIdGen(ast.name)
  }
  if (ast.type === 'array') {
    return `Array<${genFlowTypeDec(ast.arg)}>`
  }
  if (ast.type === 'nullable') {
    return `null | ${genFlowTypeDec(ast.arg)}`
  }
  if (ast.type === 'dictionary') {
    return `{[key:string]: ${genFlowTypeDec(ast.arg)}}`
  }
  if (ast.type === 'tuple') {
    return tupleDecTemplate(
      ast.fields
      .map((field) => genFlowTypeDec(field))
    )
  }
  if (ast.type === 'record') {
    return recordDeclaration(ast.fields, null)
  }
  if (ast.type === 'disjoint') {
    const tagKey = ast.tagKey
    const variants = ast.variants
    return variants
    .map(([tagValue, fields]) => `| ` + recordDeclaration(fields, {tagKey, tagValue}))
    .join('\n')
  }
  return '*' // This should never occur.
}
