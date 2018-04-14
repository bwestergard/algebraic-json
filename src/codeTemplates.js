/* @flow */

export const tupleBuildBlock = (
  correctLength: number,
  resStatements: string,
  returnStatement: string
): string => `
(path: JSONPath, x: mixed) => {
  if (Array.isArray(x)) {
    if (x.length !== ${correctLength}) {
      return Err({path, message: \`Expected ${correctLength} elements, received \${x.length}.\`})
    }
    ${resStatements}
    return ${returnStatement}
  }
  return Err({path, message: \`Expected an array, got a \${typeof x}.\`})
}
`.trim()
