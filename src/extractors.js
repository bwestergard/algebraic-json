/* @flow */

import {
  Ok,
  Err,
  andThen,
  collectResultArrayIndexed,
  collectResultMap,
  type Result
} from './result'

type JSONPath = Array<string | number>

type ExtractionError = {|
  +path: JSONPath,
  +message: string
|}

export const extractString = (path: JSONPath, x: mixed): Result<string,ExtractionError> =>
x !== null
  ? typeof x === 'string'
    ? Ok(x)
    : Err({path, message: `Expected string, received ${typeof x}.`})
  : Err({path, message: `Expected string, received null.`})


export const extractNumber = (path: JSONPath, x: mixed): Result<number,ExtractionError> =>
x !== null
  ? typeof x === 'number'
    ? Ok(x)
    : Err({path, message: `Expected number, received ${typeof x}.`})
  : Err({path, message: `Expected number, received null.`})

export const extractBoolean = (path: JSONPath, x: mixed): Result<boolean,ExtractionError> =>
  x !== null
    ? x === true || x === false
      ? Ok(x)
      : Err({path, message: `Expected boolean, received ${typeof x}.`})
    : Err({path, message: `Expected boolean, received null.`})

export const extractArrayOf = <T>(
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

export const extractDictionary = <T>(
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

export const extractNullableOf = <T>(
  extractor: (path: JSONPath, x: mixed) => Result<T,ExtractionError>,
  path: JSONPath,
  x: mixed
): Result<T | null, ExtractionError> =>
x === null
  ? Ok(null)
  : extractor(path, x)

export const extractMixedArray = (path: JSONPath, x: mixed): Result<Array<mixed>,ExtractionError> =>
Array.isArray(x) && x !== null ? Ok(x) : Err({path, message: `Expected array.`})

export const extractMixedObject = (path: JSONPath, x: mixed): Result<{[key: string]: mixed}, ExtractionError> =>
x !== null
  ? typeof x === 'object'
    ? !Array.isArray(x)
      ? Ok(x)
      : Err({path, message: `Expected object, received array.`})
    : Err({path, message: `Expected object, received ${typeof x}.`})
  : Err({path, message: `Expected object, received null.`})

export const extractFromKey = <T>(
  extractor: (path: JSONPath, x: mixed) => Result<T,ExtractionError>,
  path: JSONPath,
  key: string,
  obj: {[string]: mixed}
): Result<T,ExtractionError> =>
obj.hasOwnProperty(key)
  ? extractor([...path, key], obj[key])
  : Err({path, message: `Expected key "${key}" is not present.`})
