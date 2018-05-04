/* @flow */

import { genFlowTypeDec } from './genFlowTypeDec'
import { genExtractor } from './genExtractor'
import { type ParsedDeclarations } from '../structures/ast'
import {
  extractorModuleTemplate,
  extractorFunctionIdGen,
  flowTypeIdGen,
  extractorFuncDecTemplate
} from './codeTemplates'

export const genModule = (
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
