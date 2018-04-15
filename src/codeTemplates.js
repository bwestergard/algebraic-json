/* @flow */

import { indentToLevel, indent } from './stringUtils'
import { toPairs } from './springbok'

const elementPrefix = 'el'
const resultPrefix = 'res'

const range = (size: number): number[] => {
  let out = []
  for (let i = 0; i < size; i++) {
    out.push(i)
  }
  return out
}

// Tuple

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

export const tupleResDeclarationTemplate = (i: number, stmt: string): string =>
`const ${resultPrefix}${i} = ${stmt}`

// Record

const valueResultForKeyPrefix = 'requiredField'
const mixedObjectId = 'obj'

const requiredRecordFieldStmts = (index, key, exStmt) =>
`
const ${valueResultForKeyPrefix}${index} = extractFromKey(${exStmt}, path, '${key}', ${mixedObjectId})
if (${valueResultForKeyPrefix}${index}.tag === 'Err') return ${valueResultForKeyPrefix}${index}
`.trim()

const exStmtsJoiner = (
  templateFn: (number, string, string) => string,
  exStmts: Array<[string, string]> // key, exStmt
): string =>
exStmts
.map(
  ([key, exStmt], index) => requiredRecordFieldStmts(index, key, exStmt)
)
.join('\n')

const recordRecElementsTemplate = (
  requiredExtractors: Array<[string, string]>
): string =>
requiredExtractors
.map(
  ([key], index) => `${key}: ${valueResultForKeyPrefix}${index}.data`
)
.join(',\n')

const optionalRecordFieldStmts = (index, key, exStmt) =>
`
if (obj.hasOwnProperty('${key}')) {
  const d = extractFromKey(${exStmt}, path, '${key}', ${mixedObjectId})
  if (d.tag === 'Ok') {
    rec = {...rec, ${key}: ${valueResultForKeyPrefix}${index}.data}
  } else {
    return ${valueResultForKeyPrefix}${index}
  }
}
`.trim()

export const recordTemplate = (
  requiredExtractors: Array<[string, string]>,
  optionalExtractors: Array<[string, string]>
) => `
andThen(
  extractMixedObject(path, x),
  (obj) => {
    ${indentToLevel(2, exStmtsJoiner(requiredRecordFieldStmts, requiredExtractors))}

    let rec = {
      ${indentToLevel(3, recordRecElementsTemplate(requiredExtractors))}
    }

    ${indentToLevel(2, exStmtsJoiner(optionalRecordFieldStmts, requiredExtractors))}

    return Ok(rec)
  }
)
`.trim()
