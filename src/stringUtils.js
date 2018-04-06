/* @flow */

export const indent = (code: string): string =>
code
  .split('\n')
  .map((line) => '  ' + line)
  .join('\n')
