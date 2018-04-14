/* @flow */

import { indentToLevel, indent } from './stringUtils'

const elementPrefix = 'el'
const resultPrefix = 'res'

export const tupleTemplate = (
  correctLength: number,
  resStatements: string,
  returnStatement: string
): string => `
(path: JSONPath, x: mixed) => {
  if (Array.isArray(x)) {
    if (x.length !== ${correctLength}) {
      return Err({path, message: \`Expected ${correctLength} elements, received \${x.length}.\`})
    }
    ${indentToLevel(2, resStatements)}
    return ${indentToLevel(2,returnStatement)}
  }
  return Err({path, message: \`Expected an array, got a \${typeof x}.\`})
}
`.trim()

export const tupleReturnTemplate = (
  index: number,
  innerStatement: string
): string => `
andThen(
  ${resultPrefix}${index},
  (${elementPrefix}${index}) =>
  ${indentToLevel(1, indent(innerStatement))})
`.trim()
