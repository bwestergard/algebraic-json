/* @flow */

import { indentToLevel, indent } from './stringUtils'

const elementPrefix = 'el'
const resultPrefix = 'res'

const range = (size: number): number[] => {
  let out = []
  for (let i = 0; i < size; i++) {
    out.push(i)
  }
  return out
}

export const tupleTemplate = (
  arity: number,
  resStatements: string
): string => `
(path: JSONPath, x: mixed) => {
  if (Array.isArray(x)) {
    if (x.length !== ${arity}) {
      return Err({path, message: \`Expected ${arity} elements, received \${x.length}.\`})
    }

    ${indentToLevel(2, resStatements)}
    return ${indentToLevel(2, tupleReturnStatementTemplate(arity))}
  }
  return Err({path, message: \`Expected an array, got a \${typeof x}.\`})
}
`.trim()

const tupleReturnTemplate = (
  index: number,
  innerStatement: string
): string => `
andThen(
  ${resultPrefix}${index},
  (${elementPrefix}${index}) =>
  ${indentToLevel(1, indent(innerStatement))})
`.trim()

export const tupleReturnStatementTemplate = (arity: number): string =>
range(arity)
.reduce(
  (innerStatement, index) => tupleReturnTemplate(
    arity - 1 - index,
    innerStatement
  ),
  tupleFinalOkTemplate(arity)
)

export const tupleFinalOkTemplate = (arity: number): string =>
`Ok([` +
range(arity)
.map((i) => `${elementPrefix}${i}`)
.join(', ')
+ `])`

//   {
//   let out = ''
//   for (let i = 0; i < arity; i++) {
//     out +=
//   }
//   return
// })
