/* @flow */

import { type ParsedTypeAST } from './ast'
import { type AssocList } from './assocList'

export type ParsedDeclarations = AssocList<ParsedTypeAST>
