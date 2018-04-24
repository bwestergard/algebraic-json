/* @flow */

const oneIndent = '  '

const nIndents = (n: number): string => {
  let out = ''
  for (let i = 0; i < n; i++) {
    out += oneIndent
  }
  return out
}

export const indent = (code: string): string =>
code
  .split('\n')
  .map((line) => oneIndent + line)
  .join('\n')

export const indentToLevel = (level: number, code: string): string =>
code
  .split('\n')
  .map((line, index) => index === 0 ? line : nIndents(level) + line)
  .join('\n')
