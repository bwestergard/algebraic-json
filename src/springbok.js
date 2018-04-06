/* @flow */

const sort = <T>(
  fn: (T) => number,
  list: T[]
): T[] => list.sort(fn)

const reduce = <T, R>(
  fn: (acc: R, x: T) => R,
  acc: R,
  list: $ReadOnlyArray<T>
): R => list.reduce(
  fn,
  acc
)

const reduceObj = <T,R>(
  obj: {[key: string]: T},
  acc: R,
  fn: (acc: R, key: string, x: T) => R
): R => {
  Object.keys(obj).forEach(
    (key) => {
      acc = fn(acc, key, obj[key])
    }
  )
  return acc
}

const filter = <T>(
  fn: (x: T) => boolean,
  list: $ReadOnlyArray<T>
): Array<T> => list.filter(fn)

const map = <T, R>(
  fn: (x: T) => R,
  list: $ReadOnlyArray<T>
): Array<R> => list.map(
  fn
)

const mapIndexed = <T, R>(
  fn: (i: number, x: T) => R,
  list: $ReadOnlyArray<T>
): Array<R> => {
  const out = []
  for (let i = 0; i < list.length; i++) {
    out.push(fn(i, list[i]))
  }
  return out
}

const flatmap = <T, R>(
  fn: (x:T) => $ReadOnlyArray<R>,
  list: $ReadOnlyArray<T>
): Array<R> =>
reduce(concat, [], map(fn, list))

const concat = <T>(
  a: $ReadOnlyArray<T>,
  b: $ReadOnlyArray<T>
): Array<T> => a.concat(b)

const clone = <T>(
  obj: {[key: string]: T}
): {[key: string]: T} => Object.assign({}, obj)

const assoc = <T>(
  key: string,
  val: T,
  obj: {[key: string]: T}
): {[key: string]: T} => {
  let copy = clone(obj)
  copy[key] = val
  return copy
}

const dissoc = <T>(
  key: string,
  obj: {[key: string]: T}
): {[key: string]: T} => {
  const copy = clone(obj)
  delete copy[key]
  return copy
}

const fromPairs = <T>(
  pairs: $ReadOnlyArray<[string, T]>
): {[key: string]: T} => pairs.reduce(
  (acc, [key, val]) => Object.assign(acc, {[key]: val}),
  {}
)

const toPairs = <T>(
  obj: {[key: string]: T}
): Array<[string, T]> => reduceObj(
  obj,
  [],
  (acc, key, x) => acc.concat([
    [key, x]
  ])
)

const find = <T>(
  predicate: (x: T) => boolean,
  list: $ReadOnlyArray<T>
): null | T => {
  const result = list.find(predicate)
  if (!result) { return null }
  return result
}

const findIndex = <T>(
  predicate: (x: T) => boolean,
  list: $ReadOnlyArray<T>
): number =>
list.findIndex(predicate)

const cond = <T, R>(
  def: (x: T) => R,
  pairs: $ReadOnlyArray<[ (x: T) => boolean, (x: T) => R]>,
  x: T
): R => {
  for (let i = 0; i < pairs.length; i++) {
    let [ predicate, transformer ] = pairs[i]
    if (predicate(x)) {
      return transformer(x)
    }
  }
  return def(x)
}

const contains = <T>(
  element: T,
  list: $ReadOnlyArray<T>
): boolean => {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === element) return true
  }
  return false
}

const all = <T>(
  pred: (x: T) => boolean,
  list: $ReadOnlyArray<T>
): boolean => {
  for (let i = 0; i < list.length; i++) {
    if (!pred(list[i])) return false
  }
  return true
}

const uniq = (
  list: string[]
): string[] => {
  const dict = {}
  for (let i = 0; i < list.length; i++) {
    dict[list[i]] = true
  }
  return Object.keys(dict)
}

module.exports = {
  sort,
  reduce,
  reduceObj,
  filter,
  map,
  mapIndexed,
  flatmap,
  concat,
  clone,
  assoc,
  dissoc,
  fromPairs,
  toPairs,
  find,
  findIndex,
  cond,
  contains,
  all,
  uniq
}
