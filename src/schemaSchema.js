// @flow

import { mapOk } from "./result"
import { parseModule, type Declarations } from "./structures/ast"
import { genModule } from "./generation/genModule"

const schemaSchema: Declarations = {
  "declarations": {
    "type": "dictionary",
    "arg": {
      "type": "reference",
      "name": "declaration"
    }
  },
  "declaration": {
    "type": "disjoint",
    "tagKey": "type",
    "variants": {
      "string": {},
      "number": {},
      "boolean": {},
      "enum": {
        "variants": {
          "type": "array",
          "arg": { "type": "string" }
        }
      },
      "reference": {
        "name": { "type": "string" }
      },
      "array": {
        "arg": {
          "type": "reference",
          "name": "declaration"
        }
      },
      "nullable": {
        "arg": {
          "type": "reference",
          "name": "declaration"
        }
      },
      "dictionary": {
        "arg": {
          "type": "reference",
          "name": "declaration"
        }
      },
      "tuple": {
        "fields": {
          "type": "array",
          "arg": {
            "type": "reference",
            "name": "declaration"
          }
        }
      },
      "record": {
        "fields": {
          "type": "dictionary",
          "arg": {
            "type": "reference",
            "name": "declaration"
          }
        }
      },
      "disjoint": {
        "tagKey": { "type": "string" },
        "variants": {
          "type": "dictionary",
          "arg": {
            "type": "dictionary",
            "arg": {
              "type": "reference",
              "name": "declaration"
            }
          }
        }
      }
    }
  }
}

const code = mapOk(
  parseModule(schemaSchema),
  genModule
)

if (code.tag === "Ok") {
  console.log(
    code.data
  )
} else {
  console.log(code.err)
}
