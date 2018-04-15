/* @flow */

import { reduce, toPairs } from './springbok'
import { type TypeDeclarations, type TypeAST, type TypeTag, type FieldDict } from './ast'
import { indent } from './stringUtils'
import { basicExtractors, type BasicExtractorIdentifier } from './generation/basics'
import { tupleTemplate, tupleReturnStatementTemplate, tupleResDeclarationTemplate } from './codeTemplates'

type Dependencies = {[indentifier: BasicExtractorIdentifier]: boolean}
type Code = string
type GenFrame = {|
  deps: Dependencies,
  code: Code
|}

const addDeps = (
  deps: Dependencies,
  ids: BasicExtractorIdentifier[]
): Dependencies => ids.reduce(
  (acc, dep) => ({...deps, [dep]: true}),
  deps
)

type ExtractorParam =
| {| kind: 'abstraction' |}
| {| kind: 'application', pathStmt: Code, xStmt: Code |}

const ab: ExtractorParam = { kind: 'abstraction' }
const ap = (pathStmt: Code, xStmt: Code): ExtractorParam => ({ kind: 'application', pathStmt, xStmt})

const exParamFork = (
  abStmt: Code,
  apFn: (pathStmt: Code, xStmt: Code) => Code,
  exParam: ExtractorParam
): Code =>
exParam.kind === 'abstraction'
  ? abStmt
  : apFn(exParam.pathStmt, exParam.xStmt)

const genExtractor = (
  exParam: ExtractorParam,
  ast: TypeAST
): Code => {
  if (
    ast.type === 'string'
  ) {
    const exId = 'extractString'
    return exParamFork(
      exId,
      (pathStmt, xStmt) => `${exId}(${pathStmt}, ${xStmt})`,
      exParam
    )
  } else if (ast.type === 'number') {
    const exId = 'extractNumber'
    return exParamFork(
      exId,
      (pathStmt, xStmt) => `${exId}(${pathStmt}, ${xStmt})`,
      exParam
    )
  } else if (ast.type === 'boolean') {
    const exId = 'extractBoolean'
    return exParamFork(
      exId,
      (pathStmt, xStmt) => `${exId}(${pathStmt}, ${xStmt})`,
      exParam
    )
  } else if (
    ast.type === 'array'
  ) {
    const exId = 'extractArrayOf'
    const code = genExtractor(ab, ast.arg)
    return exParamFork(
      `(path: JSONPath, x: mixed) => ${exId}(\n${indent(code)},\n  path,\n  x\n)`,
      (pathStmt, xStmt) => `${exId}(\n${indent(code)},\n  ${pathStmt},\n  ${xStmt}\n)`,
      exParam
    )
  } else if (
    ast.type === 'nullable'
  ) {
    const exId = 'extractNullableOf'
    const code = genExtractor(ab, ast.arg)
    return exParamFork(
      `(path: JSONPath, x: mixed) => ${exId}(\n${indent(code)},\n  path,\n  x\n)`,
      (pathStmt, xStmt) => `${exId}(\n${indent(code)},\n  ${pathStmt},\n  ${xStmt}\n)`,
      exParam
    )
  } else if (
    ast.type === 'dictionary'
  ) {
    const exId = 'extractDictionaryOf'
    const code = genExtractor(ab, ast.arg)
    return exParamFork(
      exId,
      (pathStmt, xStmt) => `${exId}(\n${indent(code)},\n  ${pathStmt},\n  ${xStmt}\n)`,
      exParam
    )
  } else if (
    ast.type === 'tuple'
  ) {
    const resStatements: Code =
    ast.fields
    .map(
      (field: TypeAST, i: number) =>
        tupleResDeclarationTemplate(i, genExtractor(ap(`[...path, ${i}]`, `x[${i}]`), field))
    )
    .join('\n')
    const abStmt = tupleTemplate(ast.fields.length, resStatements)
    return exParamFork(
      abStmt,
      (pathStmt, xStmt) => `(${abStmt})(${pathStmt}, ${xStmt})`,
      exParam
    )
  } else if (
    ast.type === 'record'
  ) {
    return `extract000`
  } else if (
    ast.type === 'disjoint'
  ) {
    return `extract000`
  } else if (ast.type === 'reference') {
    return ast.name
  } else if (ast.type === 'enum') {
    const checks: Code = ast.variants.map((literal) => `s === '${literal}'`).join(' || ')
    const list: Code = ast.variants.map((literal) => `"${literal}"`).join(', ')
    const abStmt = `(path: JSONPath, x: mixed) => andThen(\n  extractString(path, x),\n  (s) => (${checks})\n    ? Ok(s)\n    : Err({path, message: \`String value "\${s}" is not one of: ${list}.\`})\n)`
    return exParamFork(
      abStmt,
      (pathStmt, xStmt) => `(${abStmt})(${pathStmt}, ${xStmt})`,
      exParam
    )
  }
  throw Error('Impossible!')
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
    return `Array<${indent(genFlowTypeDec(ast.arg))}>`
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
  genExtractor(ab, {
    type: 'tuple',
    fields: [
      { type: 'number' },
      {
        type: 'tuple',
        fields: [
          { type: 'number' }
        ]
      },
      { type: 'number' }
    ]
  })
)
