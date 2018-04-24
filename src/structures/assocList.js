/* @flow */

import { toPairs } from '../springbok'

export type AssocList<T> = Array<[string, T]>

// Sort because iteration order of JSON objects is not guaranteed, and we want stable code output.
export const toAssocList = <T>(
  obj: {[key: string]: T}
): AssocList<T> =>
toPairs(obj)
.sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
