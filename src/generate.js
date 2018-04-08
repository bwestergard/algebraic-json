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
  deps: Dependencies,
  ids: BasicExtractorIdentifier[]
): Dependencies => ids.reduce(
  (acc, dep) => ({...deps, [dep]: true}),
  deps
)

const genExtractorApplication = (
  ast: TypeAST
): GenFrame => {
  if (
    ast.type === 'string'
  ) {
    return {
      deps: addDeps({}, ['extractString']),
      code: `extractString(path, x)`
    }
  } else if (ast.type === 'number') {
    return {
      deps: addDeps({}, ['extractNumber']),
      code: `extractNumber(path, x)`
    }
  } else if (ast.type === 'boolean') {
    return {
      deps: addDeps({}, ['extractBoolean']),
      code: `extractBoolean(path, x)`
    }
  } else if (
    ast.type === 'array'
  ) {
    const { deps, code } = genExtractor('abstraction', ast.arg)
    return {
      deps: addDeps(deps, ['extractMixedArray', 'extractArrayOf']),
      code: `extractArrayOf(\n${indent(code)},\n  path,\n  x\n)`
    }
  } else if (
    ast.type === 'nullable'
  ) {
    const { deps, code } = genExtractor('abstraction', ast.arg)
    return {
      deps: addDeps(deps, ['extractNullableOf']),
      code: `extractNullableOf(\n${indent(code)},\n  path,\n  x\n)`
    }
  } else if (
    ast.type === 'dictionary'
  ) {
    const { deps, code } = genExtractor('abstraction', ast.arg)
    return {
      deps: addDeps(deps, ['extractDictionaryOf']),
      code: `extractDictionaryOf(\n${indent(code)},\npath,\nx\n)`
    }
  } else if (
    ast.type === 'tuple'
  ) {
    const elementPrefix = 'el'
    const resultPrefix = 'res'
    const fields = ast.fields

    const tupleContents: Code = fields.map((field, index) => `${elementPrefix}${index}`).join(', ')
    const returnStatement: Code = fields.reduce(
      (innerStatement, field, index) => `andThen(\n  ${resultPrefix}${index},\n  (${elementPrefix}${index}) =>\n${indent(indent(innerStatement))})`,
      `Ok([${tupleContents}])`
    )
    const resStatements: GenFrame = fields
      .reduce(
        (acc: GenFrame, field: TypeAST, i: number) => {
          const {code, deps} = genExtractor('application', field)
          return {
            code: acc.code + `const res${i} = ${code}\n`,
            deps: {...acc.deps, ...deps}
          }
        },
        {code: '', deps: {}}
      )
    const lengthCheck: Code = `if (x.length !== ${fields.length}) {\n  return Err({path, message: \`Expected ${fields.length} elements, received \${x.length}.\`})\n}`
    const buildTuple: Code = `${lengthCheck}\n${resStatements.code}\nreturn ${returnStatement}`
    const mainBlockStatements: Code = `if (Array.isArray(x)) {\n${indent(buildTuple)}\n}\nreturn Err({path, message: \`Expected an array, got a \${typeof x}.\`\n}\n)`
    return {
      code: `((path, x) => {\n${indent(mainBlockStatements)}\n})(path, x)`,
      deps: resStatements.deps
    }
  } else if (
    ast.type === 'record'
  ) {
    return {
      code: ``,
      deps: {}
    }
  } else if (
    ast.type === 'disjoint'
  ) {
    return {
      code: ``,
      deps: {}
    }
  } else if (ast.type === 'reference') {
    return {
      deps: {},
      code: ast.name
    }
  } else if (ast.type === 'enum') {
    const checks: Code = ast.variants.map((literal) => `s === '${literal}'`).join(' || ')
    const list: Code = ast.variants.map((literal) => `"${literal}"`).join(', ')
    return {
      deps: addDeps({}, ['extractString']),
      code: `andThen(\n  extractString(path, x),\n  (s) => (${checks})\n    ? Ok(s)\n    : Err({path, message: \`String value "\${s}" is not one of: ${list}.\`})\n)`
    }
  }
  throw Error('Impossible!')
}

const genExtractor = (
  variety: 'abstraction' | 'application',
  ast: TypeAST
): GenFrame => {
  const { deps, code } = genExtractorApplication(ast)
  return {
    deps,
    code: variety === 'abstraction'
      ? `(path: JSONPath, x: mixed) =>\n${indent(code)}`
      : code
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
  genExtractor('abstraction', {
    type: 'tuple',
    fields: [
      {type: 'string'},
      {type: 'number'}
    ]
  }).code
)
