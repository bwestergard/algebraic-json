/* @flow */

import { reduce, toPairs } from '../springbok'
import {
  type TypeDeclarations,
  type ParsedTypeAST,
  type TypeTag,
  type FieldAssocLists
} from '../structures/ast'
import { type AssocList } from '../structures/assocList'
import { indent } from './stringUtils'
import {
  tupleTemplate,
  tupleReturnStatementTemplate,
  tupleResDeclarationTemplate,
  recordTemplate,
  disjointUnionTemplate,
  extractorFunctionIdGen
} from './codeTemplates'
import { type ParsedDeclarations } from '../structures/ast'

type Code = string

type ExtractorParam =
| {| kind: 'abstraction' |}
| {| kind: 'application', xStmt: Code |}

const ab: ExtractorParam = { kind: 'abstraction' }
const app = (xStmt: Code): ExtractorParam => ({ kind: 'application', xStmt})

const exParamFork = (
  abStmt: Code,
  apFn: (xStmt: Code) => Code,
  exParam: ExtractorParam
): Code =>
exParam.kind === 'abstraction'
  ? abStmt
  : apFn(exParam.xStmt)

export const genExtractor = (
  exParam: ExtractorParam,
  ast: ParsedTypeAST
): Code => {
  const generateRecordExtractors = (
    fields: FieldAssocLists
  ): { reqFieldsStmts: AssocList<Code>, optFieldStmts: AssocList<Code> } => {
    const reqFieldsStmts = fields.required
      .map(([fieldName, ast]) => [fieldName, genExtractor(ab, ast)])
    const optFieldStmts = fields.optional
      .map(([fieldName, ast]) => [fieldName, genExtractor(ab, ast)])
    return {
      reqFieldsStmts,
      optFieldStmts
    }
  }
  if (
    ast.type === 'string'
  ) {
    const exId = 'extractString'
    return exParamFork(
      exId,
      (xStmt) => `${exId}(${xStmt})`,
      exParam
    )
  } else if (ast.type === 'number') {
    const exId = 'extractNumber'
    return exParamFork(
      exId,
      (xStmt) => `${exId}(${xStmt})`,
      exParam
    )
  } else if (ast.type === 'boolean') {
    const exId = 'extractBoolean'
    return exParamFork(
      exId,
      (xStmt) => `${exId}(${xStmt})`,
      exParam
    )
  } else if (
    ast.type === 'array'
  ) {
    const exId = 'extractArrayOf'
    const code = genExtractor(ab, ast.arg)
    return exParamFork(
      `(x) => ${exId}(\n${indent(code)},\n  x\n)`,
      (xStmt) => `${exId}(\n${indent(code)})`,
      exParam
    )
  } else if (
    ast.type === 'nullable'
  ) {
    const exId = 'extractNullableOf'
    const code = genExtractor(ab, ast.arg)
    return exParamFork(
      `(path: JSONPointer, x: mixed) => ${exId}(\n${indent(code)},\n  x\n)`,
      (xStmt) => `${exId}(\n${indent(code)},\n  ${xStmt}\n)`,
      exParam
    )
  } else if (
    ast.type === 'dictionary'
  ) {
    const exId = 'extractDictionaryOf'
    const code = genExtractor(ab, ast.arg)
    return exParamFork(
      exId,
      (xStmt) => `${exId}(\n${indent(code)},\n  ${xStmt}\n)`,
      exParam
    )
  } else if (
    ast.type === 'tuple'
  ) {
    const resStatements: Code =
    ast.fields
    .map(
      (field: ParsedTypeAST, i: number) =>
        tupleResDeclarationTemplate(i, genExtractor(app(`x[${i}]`), field))
    )
    .join('\n')
    const abStmt = tupleTemplate(ast.fields.length, resStatements)
    return exParamFork(
      abStmt,
      (xStmt) => `(${abStmt})(${xStmt})`,
      exParam
    )
  } else if (
    ast.type === 'record'
  ) {
    const extractors = generateRecordExtractors(ast.fields)
    return exParamFork(
      `(x) => ` + recordTemplate(
        'x',
        extractors,
        null
      ),
      (xStmt) => recordTemplate(
        xStmt,
        extractors,
        null
      ),
      exParam
    )
  } else if (
    ast.type === 'disjoint'
  ) {
    const tagKey = ast.tagKey
    const variantExtractors = ast.variants
    .map(
      ([tagValue, fields]) => [tagValue, recordTemplate(
        'x',
        generateRecordExtractors(fields),
        { tagKey, tagValue }
      )]
    )
    return disjointUnionTemplate(variantExtractors, tagKey)
  } else if (ast.type === 'reference') {
    const abStmt = extractorFunctionIdGen(ast.name)
    return exParamFork(
      abStmt,
      (xStmt) => `(${abStmt})(${xStmt})`,
      exParam
    )
  } else if (ast.type === 'enum') {
    const checks: Code = ast.variants.map((literal) => `s === '${literal}'`).join(' || ')
    const list: Code = ast.variants.map((literal) => `"${literal}"`).join(', ')
    const abStmt = `(path: JSONPointer, x: mixed) => andThen(\n  extractString(path, x),\n  (s) => (${checks})\n    ? Ok(s)\n    : Err({path, message: \`String value "\${s}" is not one of: ${list}.\`})\n)`
    return exParamFork(
      abStmt,
      (xStmt) => `(${abStmt})(${xStmt})`,
      exParam
    )
  }
  throw Error('Impossible!')
}
