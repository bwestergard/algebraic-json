/* @flow */

import { reduce, toPairs } from './springbok'
import { type TypeDeclarations, type TypeAST, type TypeTag, type FieldDict } from './ast'
import { indent } from './stringUtils'
import { basicExtractors, type BasicExtractorIdentifier } from './generation/basics'

type Dependencies = {[indentifier: BasicExtractorIdentifier]: boolean}
type Code = string
type GenFrame = {|
  deps: Dependencies,
  code: Code
|}

const addDeps = (
  ids: BasicExtractorIdentifier[],
  deps: Dependencies
): Dependencies => ids.reduce(
  (acc, dep) => ({...deps, [dep]: true}),
  deps
)

// visit: (TypeAST) => R
const genExtractor = (
  visitor: {|
    string: GenFrame,
    number: GenFrame,
    boolean: GenFrame,
    enum: (variants: string[]) => GenFrame,
    reference: (identifier: string) => GenFrame,
    array: (childStatement: Code) => GenFrame,
    nullable: (childStatement: Code) => GenFrame,
    dictionary: (childStatement: Code) => GenFrame,
    tuple: <T>(reduceChildren: (acc: T, child: ) => T) => GenFrame,
    record: () => GenFrame,
    disjoint: () => GenFrame,
  |},
  ast: TypeAST
): null | GenFrame => null

const genTupleOfStatement = (): GenFrame => {

}

const genArrayOfStatement = (childStatement: Code): GenFrame => {
  return {
    deps: addDeps(['extractArrayOf'], {}),
    code: `
    extractArray(
      ${childStatement},
      path,
      x
    )
    `
  }
}

const genFlowTypeDec = (ast: TypeAST): string => {
  const nonNullArg = (ast: TypeAST): * =>
    ast.type === 'nullable'
      ? nonNullArg(ast.arg)
      : ast

  const genDisjointDec = (tagKey: string, tag: string, fieldDict: FieldDict): string =>
  ([[tagKey, {type: 'reference', name: `"${tag}"`}]]).concat(toPairs(fieldDict)) // TODO hack!
  .map(
    ([fieldName, fieldAST]) => indent(`${fieldName}: ${genFlowTypeDec(fieldAST)}`)
  ).join(',\n')

  if (
    ast.type === 'string' ||
    ast.type === 'number' ||
    ast.type === 'boolean'
  ) {
    return ast.type
  } else if (
    ast.type === 'array'
  ) {
    return `Array<\n${indent(genFlowTypeDec(ast.arg))}\n>`
  } else if (
    ast.type === 'nullable'
  ) {
    return `null | ${genFlowTypeDec(nonNullArg(ast.arg))}`
  } else if (
    ast.type === 'dictionary'
  ) {
    return `{\n[string]: ${genFlowTypeDec(ast.arg)}\n}`
  } else if (
    ast.type === 'tuple'
  ) {
    return `[\n${ast.fields.map((fieldAst) => indent(genFlowTypeDec(fieldAst))).join(',\n')}\n]`
  } else if (
    ast.type === 'record'
  ) {
    const recordDecElements: string = toPairs(ast.fields)
    .map(([fieldName, fieldAST]) => indent(`${fieldName}: ${genFlowTypeDec(fieldAST)}`))
    .join(',\n')
    return `{\n${recordDecElements}\n}`
  } else if (
    ast.type === 'disjoint'
  ) {
    const disjoint = ast
    return toPairs(disjoint.variants)
      .map(
        ([tag, fieldDict]) => `| {\n${genDisjointDec(disjoint.tagKey, tag, fieldDict)}\n}`
      )
      .join('\n')
  } else if (ast.type === 'reference') {
    return ast.name
  } else if (ast.type === 'enum') {
    return ast.variants.map((stringLiteral) => `"${stringLiteral}"`).join(' | ')
  }
  throw Error('Impossible!')
}

console.log(
  genFlowTypeDec(
    {
      type: 'array',
      arg: { type: 'array', arg: { type: 'number' } }
    }
  )
)
