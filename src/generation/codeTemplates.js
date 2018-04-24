/* @flow */

import { type AssocList } from '../structures/assocList'
import { indentToLevel, indent } from './stringUtils'
import { toPairs } from '../springbok'

export const extractorFunctionIdGen = (typeId: string) =>
`extract\$${flowTypeIdGen(typeId)}`

export const flowTypeIdGen = (typeId: string) =>
typeId.slice(0,1).toUpperCase() + typeId.slice(1)

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

const requiredPrefix = 'reqField'
const optionalPrefix = 'optField'
const variantPrefix = 'exVariant'
const mixedObjectId = 'obj'

const exStmtsJoiner = (
  templateFn: (number, string, string) => string,
  exStmts: Array<[string, string]> // key, exStmt
): string =>
exStmts
.map(
  ([key, exStmt], index) => templateFn(index, key, exStmt)
)
.join('\n')

const recordRecElementsTemplate = (
  requiredExtractorKeys: string[],
  tag: null | {| tagKey: string, tagValue: string |}
): string =>
requiredExtractorKeys
.reverse()
.map(
  (key, index) => `${key}: ${requiredPrefix}${index}.data`
)
.concat(tag === null ? [] : [`${tag.tagKey}: '${tag.tagValue}'`])
.reverse()
.join(',\n')

const requiredRecordFieldStmts = (index, key, exStmt) =>
`
const ${requiredPrefix}${index} = extractFromKey(
  ${indentToLevel(1, exStmt)},
  path,
  '${key}',
  ${mixedObjectId}
)
if (${requiredPrefix}${index}.tag === 'Err') return ${requiredPrefix}${index}
`.trim()

const optionalRecordFieldStmts = (index, key, exStmt) =>
`
if (obj.hasOwnProperty('${key}')) {
  const ${optionalPrefix}${index} = extractFromKey(
    ${indentToLevel(2, exStmt)},
    path,
    '${key}',
    ${mixedObjectId}
  )
  if (${optionalPrefix}${index}.tag === 'Ok') {
    rec = {...rec, ${key}: ${optionalPrefix}${index}.data}
  } else {
    return ${optionalPrefix}${index}
  }
}
`.trim()

export const recordTemplate = (
  pathStmt: string,
  xStmt: string,
  extractors: { reqFieldsStmts: AssocList<string>, optFieldStmts: AssocList<string> },
  tag: null | {| tagKey: string, tagValue: string |}
) => `
andThen(
  extractMixedObject(${pathStmt}, ${xStmt}),
  (obj) => {
    ${indentToLevel(2, exStmtsJoiner(requiredRecordFieldStmts, extractors.reqFieldsStmts))}
    let rec = {
      ${indentToLevel(
        3,
        recordRecElementsTemplate(
          extractors.reqFieldsStmts
            .map(([key]) => key),
            tag
          )
        )
      }
    }
    ${indentToLevel(2, exStmtsJoiner(optionalRecordFieldStmts, extractors.optFieldStmts))}
    return Ok(rec)
  }
)
`.trim()

// Disjoint Unions

const variantExtractorFnTemplate = (index, key, exStmt) =>
`
const ${variantPrefix}${index} =
(path, x) => ${exStmt}
`.trim()

const variantCondTemplate = (index, key, exStmt) =>
`
if (tag === '${key}') {
  return ${variantPrefix}${index}(path, ${mixedObjectId})
}
`.trim()

export const disjointUnionTemplate = (
  variantExtractors: Array<[string, string]>,
  tagKey: string
) => `
(path, x) => {
  ${indentToLevel(1, exStmtsJoiner(variantExtractorFnTemplate, variantExtractors))}
  return andThen(
    extractMixedObject(path, x),
    (${mixedObjectId}) => andThen(
      extractFromKey(extractString, path, '${tagKey}', ${mixedObjectId}),
      (tag) => {
        ${indentToLevel(4, exStmtsJoiner(variantCondTemplate, variantExtractors))}
        return Err({path: [...path, '${tagKey}'], message: \`Expected one of the following: ${variantExtractors.map(([key]) => `"${key}"`).join(', ')}. Received "\${tag}".\`})
      }
    )
  )
}
`.trim()

// Flow Declarations

export const tupleDecTemplate = (fieldDecs: string[]): string =>
`
[
  ${indentToLevel(1, fieldDecs.join(',\n'))}
]
`.trim()

export const recordDecTemplate = (fieldDecs: string[], tag: null | {tagKey: string, tagValue: string}): string =>
`
{
  ${indentToLevel(1, fieldDecs.join(',\n'))}
}
`.trim()

// Extractor tupleTemplate

export const extractorModuleTemplate = (
  flowDecs: string,
  extractors: string
) => `
/* @flow */

import \{ Ok, Err, andThen, mapOk, collectResultArrayIndexed, collectResultMap, type Result \} from './result'
import \{
  extractString,
  extractNumber,
  extractBoolean,
  extractMixedArray,
  extractMixedObject,
  extractArrayOf,
  extractDictionary,
  extractNullableOf,
  extractFromKey
\} from './extractors'

${flowDecs}

${extractors}
`.trim()
