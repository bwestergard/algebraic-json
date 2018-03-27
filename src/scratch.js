// @flow

import { Ok, Err, andThen, mapOk, collectResultArrayIndexed, collectResultMap, type Result } from './result'

// Extraction Error Types

type JSONPath = Array<string | number>

type ExtractionError = {|
  +path: JSONPath,
  +message: string
|}

/// TypeAST

type AttributeDict = { [attribute: string]: TypeAST }

type TypeAST =
| {| type: 'string' |} // Prim
| {| type: 'number' |} // Prim
| {| type: 'boolean' |} // Prim
| {| type: 'enum', variants: string[] |} // Ex
| {| type: 'array', arg: TypeAST |} // Ex
| {| type: 'optional', arg: TypeAST |}
| {| type: 'dictionary', arg: TypeAST |}
| {| type: 'tuple', fields: Array<TypeAST> |}
| {| type: 'record', attributes: AttributeDict |}
| {| type: 'variant', tag: string, variants: {[tag: string]: AttributeDict } |}
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

const extractArray = <T>(
  path: JSONPath,
  x: mixed,
  extractor: (path: JSONPath, x: mixed) => Result<T,ExtractionError>
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


// Examples

type EnumExample = 'foo' | 'bar' | 'baz'
const extractExampleEnum = (path: JSONPath, x: mixed): Result<EnumExample,ExtractionError> =>
andThen(
  extractString(path, x),
  (s) => {
    if (s === 'foo') {
      return Ok(s)
    }
    if (s === 'bar') {
      return Ok(s)
    }
    if (s === 'baz') {
      return Ok(s)
    }
    return Err({path, message: `String value "${s}" is not "foo", "bar", or "baz".`})
  }
)

const extractExampleArray = (
  path: JSONPath,
  xs: mixed
): Result<EnumExample[], ExtractionError> =>
extractArray(
  path,
  xs,
  (path, x) => extractExampleEnum(path, x)
)

console.log(
  'finalRes',
  extractDictionary(extractNumber, ['examplePath'], JSON.parse(`{"a": 1, "b": "c"}`))
)
