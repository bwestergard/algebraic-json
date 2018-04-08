// @flow

import { Ok, Err, andThen, mapOk, collectResultArrayIndexed, collectResultMap, type Result } from './result'
// Extraction Error Types

type JSONPath = Array<string | number>

type ExtractionError = {|
  +path: JSONPath,
  +message: string
|}

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

const extractString = (path: JSONPath, x: mixed): Result<string,ExtractionError> =>
typeof x === 'string'
  ? Ok(x)
  : Err({path, message: `Value is of type ${typeof x}, not string.`})

const extractNumber = (path: JSONPath, x: mixed): Result<number,ExtractionError> =>
typeof x === 'number'
  ? Ok(x)
  : Err({path, message: `Value is of type ${typeof x}, not number.`})

const extractBoolean = (path: JSONPath, x: mixed): Result<boolean,ExtractionError> =>
x === true || x === false
  ? Ok(x)
  : Err({path, message: `Value is of type ${typeof x}, not boolean.`})

const extractMixedArray = (path: JSONPath, x: mixed): Result<Array<mixed>,ExtractionError> =>
Array.isArray(x) && x !== null ? Ok(x) : Err({path, message: "Value is not an array."})

const extractMixedObject = (path: JSONPath, x: mixed): Result<{[key: string]: mixed}, ExtractionError> =>
x !== null && typeof x === 'object'
  ? !Array.isArray(x)
    ? Ok(x)
    : Err({path, message: `Expected an object, got an array.`})
  : Err({path, message: `Expected an object to represent a dictionary, got a ${typeof x}.`})

const extractArrayOf = <T>(
  extractor: (path: JSONPath, x: mixed) => Result<T,ExtractionError>,
  path: JSONPath,
  x: mixed
): Result<Array<T>, ExtractionError> =>
andThen(
  extractMixedArray(path, x),
  (arr) => collectResultArrayIndexed(
    arr,
    (index, val) => extractor([...path, index], val)
  )
)

const extractDictionary = <T>(
  extractor: (path: JSONPath, x: mixed) => Result<T,ExtractionError>,
  path: JSONPath,
  x: mixed
): Result<{[string]: T}, ExtractionError> =>
andThen(
  extractMixedObject(path, x),
  (obj) => collectResultMap(
    obj,
    (key, val) => extractor([...path, key], val)
  )
)

const extractNullableOf = <T>(
  extractor: (path: JSONPath, x: mixed) => Result<T,ExtractionError>,
  path: JSONPath,
  x: mixed
): Result<T | null, ExtractionError> =>
x === null
  ? Ok(null)
  : extractor(path, x)

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
): Result<[EnumExample, number, string], ExtractionError> =>
((path, x) => {
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
})(path, x)

const extractFromKey = <T>(
  extractor: (path: JSONPath, x: mixed) => Result<T,ExtractionError>,
  path: JSONPath,
  key: string,
  obj: {[string]: mixed}
): Result<T,ExtractionError> =>
obj.hasOwnProperty(key)
  ? extractor([...path, key], obj[key])
  : Err({path, message: `Expected key "${key}" is not present.`})

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
        extractNullableOf(extractBoolean, [...path, 'c'], obj.c), // WRONG
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

          if (Object.keys(obj).length > Object.keys(obj).length) {
            return Err({path, message: `Extra keys in object.`})
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

const foo =
(path: JSONPath, x: mixed): Result<[string, number], ExtractionError> =>
  ((path, x) => {
    if (Array.isArray(x)) {
      if (x.length !== 2) {
        return Err({path, message: `Expected 2 elements, received ${x.length}.`})
      }
      const res0 = extractString(path, x)
      const res1 = extractNumber(path, x)

      return andThen(
        res1,
        (el1) =>
          andThen(
            res0,
            (el0) =>
              Ok([el0, el1])))
    }
    return Err({path, message: `Expected an array, got a ${typeof x}.`
    }
    )
  })(path, x)
