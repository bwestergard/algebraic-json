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

export const extractString = (path: JSONPath) => (x: mixed): Result<string,ExtractionError> =>
typeof x === 'string'
  ? Ok(x)
  : Err({path, message: `Value is of type ${typeof x}, not string.`})

export const extractNumber = (path: JSONPath) => (x: mixed): Result<number,ExtractionError> =>
typeof x === 'number'
  ? Ok(x)
  : Err({path, message: `Value is of type ${typeof x}, not number.`})

export const extractBoolean = (path: JSONPath) => (x: mixed): Result<boolean,ExtractionError> =>
x === true || x === false
  ? Ok(x)
  : Err({path, message: `Value is of type ${typeof x}, not boolean.`})

export const extractArray = <T>(
  extractor: (path: JSONPath) => (x: mixed) => Result<T,ExtractionError>,
  path: JSONPath,
  x: mixed
): Result<Array<T>, ExtractionError> =>
andThen(
  extractMixedArray(path)(x),
  (arr) => collectResultArrayIndexed(
    arr,
    (index, val) => extractor([...path, index])(val)
  )
)

export const extractDictionary = <T>(
  extractor: (path: JSONPath) => (x: mixed) => Result<T,ExtractionError>,
  path: JSONPath,
  x: mixed
): Result<{[string]: T}, ExtractionError> =>
andThen(
  extractMixedObject(path)(x),
  (obj) => collectResultMap(
    obj,
    (key, val) => extractor([...path, key])(val)
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

  export const extractMixedArray = (path: JSONPath) => (x: mixed): Result<Array<mixed>,ExtractionError> =>
  Array.isArray(x) && x !== null ? Ok(x) : Err({path, message: "Value is not an array."})

  export const extractMixedObject = (path: JSONPath) => (x: mixed): Result<{[key: string]: mixed}, ExtractionError> =>
  x !== null && typeof x === 'object'
    ? !Array.isArray(x)
      ? Ok(x)
      : Err({path, message: `Expected an object, got an array.`})
    : Err({path, message: `Expected an object to represent a dictionary, got a ${typeof x}.`})
