// @flow

import {
  Ok,
  Err,
  andThen,
  mapOk,
  collectResultArrayIndexed,
  collectResultMap,
  type Result
} from './result'

import {
  extractString,
  extractNumber,
  extractBoolean,
  extractMixedArray,
  extractMixedObject,
  extractArrayOf,
  extractDictionary,
  extractNullableOf,
  extractFromKey,
  type JSONPath,
  type ExtractionError
 } from './extractors'

// Extraction Error Types

/// TypeAST

type fieldDict = { [field: string]: TypeAST }

type TypeAST =
| {| type: 'string' |} // Prim
| {| type: 'number' |} // Prim
| {| type: 'boolean' |} // Prim
| {| type: 'enum', variants: string[] |} // Ex
| {| type: 'array', arg: TypeAST |} // Ex
| {| type: 'nullable', arg: TypeAST |} // Generic
| {| type: 'dictionary', arg: TypeAST |} // Ex
| {| type: 'tuple', fields: Array<TypeAST> |} // Ex
| {| type: 'record', fields: fieldDict |} // Ex
| {| type: 'disjoint', tag: string, variants: {[tag: string]: fieldDict } |} // Ex
| {| type: 'reference', name: string |}

type NameSpace = {[typeVariableName: string]: TypeAST}

// Generic

// Examples

type EnumExample = 'foo' | 'bar' | 'baz'
const extractExampleEnum = (path: JSONPath, x: mixed): Result<EnumExample,ExtractionError> =>
andThen(
  extractString(path, x),
  (s) => (s === 'foo' || s === 'bar' || s === 'baz') ? Ok(s) : Err({path, message: `String value "${s}" is not "foo", "bar", or "baz".`})
)

const extractExampleArray = (
  path: JSONPath,
  xs: mixed
): Result<EnumExample[], ExtractionError> =>
extractArrayOf(
  extractExampleEnum,
  path,
  xs
)

const extractExampleNestedArray = (
  path: JSONPath,
  x: mixed
): Result<Array<Array<EnumExample>>, ExtractionError> =>
extractArrayOf(
  (path, x) => extractArrayOf(
    extractExampleEnum,
    path,
    x
  ),
  path,
  x
)

const extractExampleDictionary = (
  path: JSONPath,
  xs: mixed
): Result<{[string]: EnumExample}, ExtractionError> =>
extractDictionary(
  extractExampleEnum,
  path,
  xs
)

const extractExampleTuple = (
  path: JSONPath,
  x: mixed
): Result<[EnumExample, number, string], ExtractionError> => {
  if (Array.isArray(x)) {
    if (x.length !== 3) {
      return Err({path, message: `Expected 3 elements, received ${x.length}.`})
    }
    const res0 = extractExampleEnum([...path, 0], x[0])
    const res1 = extractNumber([...path, 1], x[1])
    const res2 = extractString([...path, 2], x[2])
    return andThen(
      res0,
      (el0) => andThen(
        res1,
        (el1) => andThen(
          res2,
          (el2) => Ok([el0, el1, el2])
        )
      )
    )
  }
  return Err({path, message: `Expected an array, got a ${typeof x}.`})
}

const extractAnotherRecord = (
  path: JSONPath,
  x: mixed
): Result<{a: string, b: number, c: boolean, d?: string, e?: number}, ExtractionError> =>
andThen(
  extractMixedObject(path, x),
  (obj) => {
    const a = extractFromKey(extractString, path, 'a', obj)
    if (a.tag === 'Err') return a
    const b = extractFromKey(extractNumber, path, 'b', obj)
    if (b.tag === 'Err') return b
    const c = extractFromKey(extractBoolean, path, 'c', obj)
    if (c.tag === 'Err') return c

    let _rec = {a: a.data, b: b.data, c: c.data}

    if (obj.hasOwnProperty('d')) {
      const d = extractFromKey(extractString, path, 'd', obj)
      if (d.tag === 'Ok') {
        _rec = {..._rec, d: d.data}
      } else {
        return d
      }
    }

    if (obj.hasOwnProperty('e')) {
      const e = extractFromKey(extractNumber, path, 'e', obj)
      if (e.tag === 'Ok') {
        _rec = {..._rec, e: e.data}
      } else {
        return e
      }
    }

    return Ok(_rec)
  }
)

type YetAnotherRecord = {
  a: string,
  b: number,
  c: boolean,
  d?: YetAnotherRecord
}
const extractYetAnotherRecord = (
  path: JSONPath,
  x: mixed
): Result<YetAnotherRecord, ExtractionError> =>
andThen(
  extractMixedObject(path, x),
  (obj) => {
    const reqField0 = extractFromKey(
      extractString,
      path,
      'a',
      obj
    )
    if (reqField0.tag === 'Err') return reqField0
    const reqField1 = extractFromKey(
      extractNumber,
      path,
      'b',
      obj
    )
    if (reqField1.tag === 'Err') return reqField1
    const reqField2 = extractFromKey(
      extractBoolean,
      path,
      'c',
      obj
    )
    if (reqField2.tag === 'Err') return reqField2
    let rec = {
      a: reqField0.data,
      b: reqField1.data,
      c: reqField2.data
    }
    if (obj.hasOwnProperty('d')) {
      const optField0 = extractFromKey(
        extractYetAnotherRecord,
        path,
        'd',
        obj
      )
      if (optField0.tag === 'Ok') {
        rec = {...rec, d: optField0.data}
      } else {
        return optField0
      }
    }
    return Ok(rec)
  }
)

const extractExampleRecord = (
  path: JSONPath,
  x: mixed
): Result<{a: EnumExample, b: EnumExample, c: boolean | null, d?: number, e?: number}, ExtractionError> =>
andThen(
  extractMixedObject(path, x),
  (obj) => andThen(
    extractFromKey(extractExampleEnum, path, 'a', obj),
    (a) => andThen(
      extractFromKey(extractExampleEnum, path, 'b', obj),
      (b) => andThen(
        extractFromKey((path, x) => extractNullableOf(extractBoolean, path, x), path, 'c', obj),
        (c) => {
          let rec = {a, b, c}

          if (obj.hasOwnProperty('d')) {
            const res = extractNumber([...path, 'd'], obj.d)
            if (res.tag === 'Ok') {
              rec = {...rec, d: res.data}
            } else {
              return res
            }
          }

          if (obj.hasOwnProperty('e')) {
            const res = extractNumber([...path, 'e'], obj.e)
            if (res.tag === 'Ok') {
              rec = {...rec, e: res.data}
            } else {
              return res
            }
          }

          return Ok(rec)
        }
      )
    )
  )
)

type Citizen =
| {|
  socialClass: 'bourgeois',
  wageIncome: number,
  capitalIncome: number
|}
| {|
  socialClass: 'proletarian',
  wageIncome: number
|}

const extractCitizen = (
  path: JSONPath,
  x: mixed
): Result<Citizen, ExtractionError> => {
  const bourgeois = (
    path: JSONPath,
    x: mixed
  ): Result<*, ExtractionError> =>
  andThen(
    extractMixedObject(path, x),
    (obj) => andThen(
      extractFromKey(extractNumber, path, 'wageIncome', obj),
      (wageIncome) => andThen(
        extractFromKey(extractNumber, path, 'capitalIncome', obj),
        (capitalIncome) => Ok({socialClass: 'bourgeois', wageIncome, capitalIncome})
      )
    )
  )

  const proletarian = (
    path: JSONPath,
    x: mixed
  ): Result<*, ExtractionError> =>
  andThen(
    extractMixedObject(path, x),
    (obj) => andThen(
      extractFromKey(extractNumber, path, 'wageIncome', obj),
      (wageIncome) => Ok({socialClass: 'proletarian', wageIncome})
    )
  )

  const obj = extractMixedObject(path, x)
  if (obj.tag === 'Err') return obj
  const tag = extractFromKey(extractString, path, 'socialClass', obj.data)
  if (tag.tag === 'Err') return tag
  return andThen(
    extractMixedObject(path, x),
    (obj) => andThen(
      extractFromKey(extractString, path, 'socialClass', obj),
      (socialClass) => {
        if (socialClass === 'bourgeois') {
          return bourgeois(path, obj)
        }
        if (socialClass === 'proletarian') {
          return proletarian(path, x)
        }
        return Err({path: [...path, "socialClass"], message: `Expected one of the following: "bourgeois", "proletarian". Received "${socialClass}".`})
      }
    )
  )
}

const extractDisjointEx =
(path: JSONPath, x: mixed) => {
  const variant0 =
  (path, x) => andThen(
    extractMixedObject(path, x),
    (obj) => {
      const reqField0 = extractFromKey(
        extractString,
        path,
        'a',
        obj
      )
      if (reqField0.tag === 'Err') return reqField0
      const reqField1 = extractFromKey(
        extractNumber,
        path,
        'b',
        obj
      )
      if (reqField1.tag === 'Err') return reqField1
      const reqField2 = extractFromKey(
        extractBoolean,
        path,
        'c',
        obj
      )
      if (reqField2.tag === 'Err') return reqField2
      let rec = {
        number: 'one',
        a: reqField2.data,
        b: reqField1.data,
        c: reqField0.data
      }
      if (obj.hasOwnProperty('d')) {
        const optField0 = extractFromKey(
          extractYetAnotherRecord,
          path,
          'd',
          obj
        )
        if (optField0.tag === 'Ok') {
          rec = {...rec, d: optField0.data}
        } else {
          return optField0
        }
      }
      return Ok(rec)
    }
  )
  const variant1 =
  (path, x) => andThen(
    extractMixedObject(path, x),
    (obj) => {
      const reqField0 = extractFromKey(
        extractNumber,
        path,
        'bar',
        obj
      )
      if (reqField0.tag === 'Err') return reqField0
      const reqField1 = extractFromKey(
        extractNumber,
        path,
        'baz',
        obj
      )
      if (reqField1.tag === 'Err') return reqField1
      const reqField2 = extractFromKey(
        extractNumber,
        path,
        'foo',
        obj
      )
      if (reqField2.tag === 'Err') return reqField2
      let rec = {
        number: 'two',
        bar: reqField2.data,
        baz: reqField1.data,
        foo: reqField0.data
      }

      return Ok(rec)
    }
  )
  return andThen(
    extractMixedObject(path, x),
    (obj) => andThen(
      extractFromKey(extractString, path, 'number', obj),
      (tag) => {
        if (tag === 'one') {
          return variant0(path, obj)
        }
        if (tag === 'two') {
          return variant1(path, obj)
        }
        return Err({path: [...path, 'number'], message: `Expected one of the following: "one", "two". Received "${tag}".`})
      }
    )
  )
}

console.log(JSON.stringify(extractDisjointEx([], {number: 'one', 'b': 3,
  'c': true,
  'a': 'bleh',
  'd': {a: 'hello', b: 3, c: true}
})))
