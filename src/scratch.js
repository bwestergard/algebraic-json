// @flow

type AttributeDict = { [attribute: string]: TypeAST }

type TypeAST =
| {| type: 'reference', name: string |}
| {| type: 'string' |}
| {| type: 'enum', variants: string[] |}
| {| type: 'number' |}
| {| type: 'boolean' |}
| {| type: 'array', arg: TypeAST |}
| {| type: 'dictionary', arg: TypeAST |}
| {| type: 'tuple', fields: Array<TypeAST> |}
| {| type: 'optional', arg: TypeAST |}
| {| type: 'record', attributes: AttributeDict |}
| {| type: 'variant', tag: string, variants: {[tag: string]: AttributeDict } |}

type NameSpace = {[typeVariableName: string]: TypeAST}

const cons: NameSpace = {
  "Cons": {
    "type": "optional",
    "arg": {"type": "record", "attributes": { "head": {"type": "string"}, "tail": {"type": "reference", "name": "Cons"}}}
  }
}

const tree: NameSpace = {
  "Tree": {
    "type": "optional",
    "arg": {
      "type": "record",
      "attributes": {
        "left": {"type": "reference", "name": "Tree"},
        "right": {"type": "reference", "name": "Tree"}
      }
    }
  }
}

type Cons<T> =
| { tag: "nil" }
| { tag: "cons", head: T, tail: Cons<T> }

const consList: Cons<string> = { tag: "cons", head: 'a', tail: { tag: "cons", head: 'b', tail: { tag: "nil" } } }

const example: NameSpace = {
  "Person": {
    "type": "record",
    "attributes": {
      "name": { "type": "string" },
      "age": { "type": "number" },
      "contactMethods": {
        "type": "array",
        "arg": { "type": "reference", "name": "Contact" }
      }
    }
  },
  "Contact": {
    "type": "variant",
    "tag": "contactMethod",
    "variants": {
      "phone": {
        "phoneNumber": { "type": "string" }
      },
      "email": {
        "emailAddress": { "type": "string" }
      },
      "mailingAddress": {
        "zip": { "type": "number" },
        "street": { "type": "string" },
        "state": { "type": "string" }
      }
    }
  }
}
