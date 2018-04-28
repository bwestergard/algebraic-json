/* @flow */

import { genFlowTypeDec } from './genFlowTypeDec'
import { genExtractor } from './genExtractor'
import { type ParsedDeclarations } from '../structures/module'
import {
  extractorModuleTemplate,
  extractorFunctionIdGen,
  flowTypeIdGen,
  extractorFuncDecTemplate
} from './codeTemplates'

const genModule = (
  typeDeclarations: ParsedDeclarations
): string => {
  const flowDecs = typeDeclarations
  .map(
    ([typeId, pAst]) => `export type ${flowTypeIdGen(typeId)} = ${genFlowTypeDec(pAst)}`
  )
  .join('\n\n')
  const extractors = typeDeclarations
  .map(
    ([typeId, pAst]) => extractorFuncDecTemplate(
      typeId,
      genExtractor({kind: 'application', xStmt: 'x'}, pAst)
    )
  )
  .join('\n')
  return extractorModuleTemplate(flowDecs, extractors)
}

console.log(
  genModule(
    [
      ['orders', {type: 'array', arg: {type: 'record', fields: {
        optional: [],
        required: [
          ['buyer', {type: 'reference', name: 'person'}],
          ['consumer', {type: 'reference', name: 'person'}],
          ['cost', {type: 'number'}]
        ]
      }}}],
      ['person', {type: 'record', fields: {
        optional: [
          ['middleName', {type: 'string'}],
          ['alterEgos', {type: 'array', arg: {type: 'array', arg: {type: 'array', arg: {type: 'reference', name: 'person'}}}}]
        ],
        required: [
          ['firstName', {type: 'string'}],
          ['lastName', {type: 'string'}]
        ]
      }}]
    ]
  )
)
