/* @flow */

import {
  Ok,
  Err,
  andThen,
  mapErr,
  collectResultArrayIndexed,
  collectResultMap,
  type Result
} from './result'

// This should be serialized as specified in RFC 6901
// https://tools.ietf.org/html/rfc6901
type JSONPointerReferenceToken = string | number
export type JSONPointer = Array<JSONPointerReferenceToken>

export type ExtractionError = {|
  +path: JSONPointer,
  +message: string
|}

export const exErr = <T>(
  message: string
): Result<T,ExtractionError> => Err({
  path: [],
  message
})

const prependToPath = <T>(
  pathPrefixEl: JSONPointerReferenceToken,
  result: Result<T,ExtractionError>
): Result<T,ExtractionError> =>
mapErr(
  result,
  ({message, path}) => ({
    message,
    path: [pathPrefixEl].concat(path)
  })
)

export const extractString = (x: mixed): Result<string,ExtractionError> =>
x !== null
  ? typeof x === 'string'
    ? Ok(x)
    : exErr(`Expected string, received ${typeof x}.`)
  : exErr(`Expected string, received null.`)


export const extractNumber = (x: mixed): Result<number,ExtractionError> =>
x !== null
  ? typeof x === 'number'
    ? Ok(x)
    : exErr(`Expected number, received ${typeof x}.`)
  : exErr(`Expected number, received null.`)

export const extractBoolean = (x: mixed): Result<boolean,ExtractionError> =>
  x !== null
    ? x === true || x === false
      ? Ok(x)
      : exErr(`Expected boolean, received ${typeof x}.`)
    : exErr(`Expected boolean, received null.`)

export const extractArrayOf = <T>(
  extractor: (x: mixed) => Result<T,ExtractionError>,
  x: mixed
): Result<Array<T>, ExtractionError> =>
andThen(
  extractMixedArray(x),
  (arr) => collectResultArrayIndexed(
    arr,
    (index, val) => prependToPath(index, extractor(val))
  )
)

export const extractDictionaryOf = <T>(
  extractor: (x: mixed) => Result<T,ExtractionError>,
  x: mixed
): Result<{[string]: T}, ExtractionError> =>
andThen(
  extractMixedObject(x),
  (obj) => collectResultMap(
    obj,
    (key, val) => prependToPath(key, extractor(val))
  )
)

export const extractNullableOf = <T>(
  extractor: (x: mixed) => Result<T,ExtractionError>,
  x: mixed
): Result<T | null, ExtractionError> =>
x === null
  ? Ok(null)
  : extractor(x)

export const extractMixedArray = (x: mixed): Result<Array<mixed>,ExtractionError> =>
Array.isArray(x) && x !== null ? Ok(x) : exErr(`Expected array.`)

export const extractMixedObject = (x: mixed): Result<{[key: string]: mixed}, ExtractionError> =>
x !== null
  ? typeof x === 'object'
    ? !Array.isArray(x)
      ? Ok(x)
      : exErr(`Expected object, received array.`)
    : exErr(`Expected object, received ${typeof x}.`)
  : exErr(`Expected object, received null.`)

export const extractFromKey = <T>(
  extractor: (x: mixed) => Result<T,ExtractionError>,
  key: string,
  obj: {[string]: mixed}
): Result<T,ExtractionError> =>
obj.hasOwnProperty(key)
  ? prependToPath(key, extractor(obj[key]))
  : exErr(`Expected key "${key}" is not present.`)

export const extractFromIndex = <T>(
  extractor: (x: mixed) => Result<T,ExtractionError>,
  index: number,
  arr: Array<mixed>
): Result<T,ExtractionError> =>
prependToPath(index, extractor(arr[index]))
