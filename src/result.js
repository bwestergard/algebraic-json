// @flow

export type Result<+Data, +Error> =
    {| tag: 'Ok', +data: Data |}
  | {| tag: 'Err', +err: Error |}

export const Ok = <+Data, +Error>(data: Data) : Result<Data, Error> => ({ tag: 'Ok', data })
export const Err = <+Data, +Error>(err: Error) : Result<Data, Error> => ({ tag: 'Err', err })

export const andThen = <+Data, +NewData, +Error>(result: Result<Data, Error>, f: Data => Result<NewData, Error>) : Result<NewData, Error> => {
  if (result.tag === 'Ok') {
    return f(result.data)
  } else {
    return Err(result.err)
  }
}

export const mapOk = <+Data, +Error, +NewData>(result: Result<Data, Error>, f: Data => NewData) : Result<NewData, Error> => {
  if (result.tag === 'Ok') {
    return Ok(f(result.data))
  } else {
    return Err(result.err)
  }
}

export const mapErr = <+Data, +NewError, +Error>(result: Result<Data, Error>, f: Error => NewError) : Result<Data, NewError> => {
  if (result.tag === 'Ok') {
    return Ok(result.data)
  } else {
    return Err(f(result.err))
  }
}

export const unwrapOrElse = <+Data, +Error>(result: Result<Data, Error>, f: Error => Data) : Data => {
  if (result.tag === 'Ok') {
    return result.data
  } else {
    return f(result.err)
  }
}

export const collectResultMap = <+MapVal, +Data, +Error>(oldMap: { [key: string]: MapVal }, f: (string, MapVal) => Result<Data, Error>) : Result<{ [key: string]: Data }, Error> => {
  const newMap: { [key: string]: Data } = {}
  for (const label in oldMap) {
    const oldValue = oldMap[label]
    const newValue = f(label, oldValue)
    if (newValue.tag === 'Ok') {
      newMap[label] = newValue.data
    } else {
      return Err(newValue.err)
    }
  }
  return Ok(newMap)
}

export const collectResultArray = <+ArrayVal, +Data, +Error>(oldArray: ArrayVal[], f: ArrayVal => Result<Data, Error>) : Result<Data[], Error> => {
  const newArray: Data[] = []
  for (const oldValue of oldArray) {
    const newValue = f(oldValue)
    if (newValue.tag === 'Ok') {
      newArray.push(newValue.data)
    } else {
      return Err(newValue.err)
    }
  }
  return Ok(newArray)
}

export const collectResultArrayIndexed = <+ArrayVal, +Data, +Error>(
  oldArray: ArrayVal[],
  f: (index: number, val: ArrayVal) => Result<Data, Error>
) : Result<Data[], Error> => {
  const newArray: Data[] = []
  for (let i = 0; i < oldArray.length; i++) {
    const newValue = f(i, oldArray[i])
    if (newValue.tag === 'Ok') {
      newArray.push(newValue.data)
    } else {
      return Err(newValue.err)
    }
  }
  return Ok(newArray)
}
