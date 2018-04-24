/* @flow */

import { genFlowTypeDec } from './genFlowTypeDec'
import { genExtractor } from './genExtractor'
import { type ParsedDeclarations } from '../structures/module'
import { extractorModuleTemplate, extractorFunctionIdGen, flowTypeIdGen } from './codeTemplates'

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
    ([typeId, pAst]) =>
    `export const ${extractorFunctionIdGen(typeId)} = ${genExtractor({kind: 'application', pathStmt: 'path', xStmt: 'x'}, pAst)}`
  )
  .join('\n\n')
  return extractorModuleTemplate(flowDecs, extractors)
}

console.log(
  genModule(
    [
      ['name', {type: 'string'}]
    ]
  ) 
)
