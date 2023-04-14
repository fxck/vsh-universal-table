import { Injectable } from '@angular/core';

import { createToken, Lexer, Parser } from 'chevrotain';
import isArray from 'lodash-es/isArray';
import isString from 'lodash-es/isString';

import { UniversalListParams, UniversalListQuery, OperatorTypes } from './universal-list.model';

// serialize
export function universableTableSerializer(q: UniversalListQuery, filter?: UniversalListParams[]) {
  const newFilter =  SerializeFilters(q.filter);
  const oldFilter =  filter ? SerializeFilters(filter).join(' ') : '';
  newFilter.sort((a, b) => {
    let posA = oldFilter.indexOf(a);
    if (posA === -1) {
      posA = 99999;
    }
    let posB = oldFilter.indexOf(b);
    if (posB === -1) {
      posB = 99999;
    }
    if (posA < posB) {
      return -1;
    }
    if (posA > posB) {
      return 1;
    }
    return 0;
  });
  if (q.suggest && q.suggest.length > 0) {
    newFilter.push(q.suggest);
  }
  return newFilter.join(' ');
}

// parse
@Injectable({
  providedIn: 'root'
})
export class UniversableListParser extends Parser {

  static Is = createToken({ name: 'Is', pattern: /is:/ });
  static Not = createToken({ name: 'Not', pattern: /not:/ });
  static OpEq = createToken({ name: 'OpEq', pattern: /([=:])/ });
  static OpGt = createToken({ name: 'OpGt', pattern: />/ });
  static OpLt = createToken({ name: 'OpLt', pattern: /</ });
  static OpLte = createToken({ name: 'OpLte', pattern: /<=/ });
  static OpGte = createToken({ name: 'OpGte', pattern: />=/ });
  static OpNe = createToken({ name: 'OpNe', pattern: /!=/ });
  static OpSearch = createToken({ name: 'OpSearch', pattern: /\?/ });
  static Comma = createToken({ name: 'Comma', pattern: /,/ });
  static DoubleQuotedStringLiteral = createToken({ name: 'DoubleQuotedStringLiteral', pattern: /"[^"]*"/ });
  static SingleQuotedStringLiteral = createToken({ name: 'SingleQuotedStringLiteral', pattern: /'[^']*'/ });
  static StringLiteral = createToken({ name: 'StringLiteral', pattern: /[^\s=:><!?,]+/ });
  static WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /\s+/, group: Lexer.SKIPPED });

  private static _AllTokens = [
    UniversableListParser.Is,
    UniversableListParser.Not,
    UniversableListParser.OpEq,
    UniversableListParser.OpNe,
    UniversableListParser.OpGte,
    UniversableListParser.OpGt,
    UniversableListParser.OpLte,
    UniversableListParser.OpLt,
    UniversableListParser.OpSearch,
    UniversableListParser.Comma,
    UniversableListParser.DoubleQuotedStringLiteral,
    UniversableListParser.SingleQuotedStringLiteral,
    UniversableListParser.StringLiteral,
    UniversableListParser.WhiteSpace
  ];

  private _lexer = new Lexer(UniversableListParser._AllTokens);

  constructor() {
    super([], UniversableListParser._AllTokens, {
      recoveryEnabled: true,
      outputCst: false,
      ignoredIssues: {
        statement: { OR: true }
      }
    });

    this.performSelfAnalysis();
  }

  query = this.RULE<UniversalListQuery>('query', () => {
    const filter = this.MANY1<UniversalListParams>(() => {
      return this.OR1<UniversalListParams>([
        { GATE: this.BACKTRACK(this._isRule), ALT: () => this.SUBRULE(this._isRule) },
        { GATE: this.BACKTRACK(this._notRule), ALT: () => this.SUBRULE(this._notRule) },
        { GATE: this.BACKTRACK(this._columnRule), ALT: () => this.SUBRULE(this._columnRule) }
      ]);
    });

    const suggest = this.MANY2(() => {
      return this.OR2<string>([
        { ALT: () => this.CONSUME(UniversableListParser.Is).image },
        { ALT: () => this.CONSUME(UniversableListParser.Not).image },
        { ALT: () => trim(this.CONSUME(UniversableListParser.SingleQuotedStringLiteral).image) },
        { ALT: () => trim(this.CONSUME(UniversableListParser.DoubleQuotedStringLiteral).image) },
        { ALT: () => this.CONSUME(UniversableListParser.StringLiteral).image },
        { ALT: () => this.CONSUME(UniversableListParser.OpNe).image },
        { ALT: () => this.CONSUME(UniversableListParser.OpEq).image },
        { ALT: () => this.CONSUME(UniversableListParser.OpGt).image },
        { ALT: () => this.CONSUME(UniversableListParser.OpLt).image },
        { ALT: () => this.CONSUME(UniversableListParser.OpLte).image },
        { ALT: () => this.CONSUME(UniversableListParser.OpGte).image },
        { ALT: () => this.CONSUME(UniversableListParser.OpSearch).image },
        { ALT: () => this.CONSUME(UniversableListParser.Comma).image }
      ]);
    }).join(' ');

    return {
      filter: filter,
      suggest: suggest
    };

  });

  private _isRule = this.RULE<UniversalListParams>(
    '_isRule',
    ()  => {
      this.CONSUME(UniversableListParser.Is);
      const column = this.SUBRULE<string>(this._one);
      return {
        column: column,
        operator: OperatorTypes.Is,
        value: true
      };
    }
  );

  private _notRule = this.RULE<UniversalListParams>(
    '_notRule',
    () => {
      this.CONSUME(UniversableListParser.Not);
      const column = this.SUBRULE<string>(this._one);
      return {
        column: column,
        operator: OperatorTypes.Not,
        value: true
      };
    }
  );

  private _columnRule = this.RULE<UniversalListParams>(
    '_columnRule',
    () => {
      const lit = this.SUBRULE<string>(this._one);
      return this.SUBRULE(this._operatorRule, { ARGS: [ lit ] });
    }
  );

  private _list = this.RULE<string|string[]>(
    '_list',
    () => {
      const value = this.AT_LEAST_ONE_SEP({
        SEP: UniversableListParser.Comma,
        DEF: () => this.SUBRULE(this._one)
      }).values;
      return value.length > 1 ? value : value[0];
    }
  );

  private _one = this.RULE<string|string[]>(
    '_one',
    () => {
      return this.OR([
        { ALT: () => trim(this.CONSUME(UniversableListParser.DoubleQuotedStringLiteral).image) },
        { ALT: () => trim(this.CONSUME(UniversableListParser.SingleQuotedStringLiteral).image) },
        { ALT: () => this.CONSUME(UniversableListParser.StringLiteral).image },
      ]);
    }
  );

  private _operatorGteEmpty = this.RULE<UniversalListParams>(
    '_operatorGteEmpty',
    (name: string) => {
      this.CONSUME(UniversableListParser.OpGte);
      return {
        column: name,
        operator: OperatorTypes.Gte,
        value: '',
      };
    }
  );

  private _operatorGte = this.RULE<UniversalListParams>(
    '_operatorGte',
    (name: string) => {
      const result = this.SUBRULE<UniversalListParams>(this._operatorGteEmpty, { ARGS: [ name ] });
      result.value = this.SUBRULE<string|string[]>(this._one);
      return result;
    }
  );

  private _operatorEqEmpty = this.RULE<UniversalListParams>(
    '_operatorEqEmpty',
    (name: string) => {
      this.CONSUME(UniversableListParser.OpEq);
      return {
        column: name,
        operator: OperatorTypes.Eq,
        value: '',
      };
    }
  );

  private _operatorEq = this.RULE<UniversalListParams>(
    '_operatorEq',
    (name: string) => {
      const result = this.SUBRULE<UniversalListParams>(this._operatorEqEmpty, { ARGS: [ name ] });
      result.value = this.SUBRULE<string|string[]>(this._one);
      return result;
    }
  );
  private _operatorNeEmpty = this.RULE<UniversalListParams>(
    '_operatorNeEmpty',
    (name: string) => {
      this.CONSUME(UniversableListParser.OpNe);
      return {
        column: name,
        operator: OperatorTypes.Ne,
        value: '',
      };
    }
  );

  private _operatorNe = this.RULE<UniversalListParams>(
    '_operatorNe',
    (name: string) => {
      const result = this.SUBRULE<UniversalListParams>(this._operatorNeEmpty, { ARGS: [ name ] });
      result.value = this.SUBRULE<string|string[]>(this._one);
      return result;
    }
  );

  private _operatorGtEmpty = this.RULE<UniversalListParams>(
    '_operatorGtEmpty',
    (name: string) => {
      this.CONSUME(UniversableListParser.OpGt);
      return {
        column: name,
        operator: OperatorTypes.Gt,
        value: '',
      };
    }
  );

  private _operatorGt = this.RULE<UniversalListParams>(
    '_operatorGt',
    (name: string) => {
      const result = this.SUBRULE<UniversalListParams>(this._operatorGtEmpty, { ARGS: [ name ] });
      result.value = this.SUBRULE<string|string[]>(this._one);
      return result;
    }
  );
  private _operatorLtEmpty = this.RULE<UniversalListParams>(
    '_operatorLtEmpty',
    (name: string) => {
      this.CONSUME(UniversableListParser.OpLt);
      return {
        column: name,
        operator: OperatorTypes.Lt,
        value: '',
      };
    }
  );

  private _operatorLt = this.RULE<UniversalListParams>(
    '_operatorLt',
    (name: string) => {
      const result = this.SUBRULE<UniversalListParams>(this._operatorLtEmpty, { ARGS: [ name ] });
      result.value = this.SUBRULE<string|string[]>(this._one);
      return result;
    }
  );
  private _operatorLteEmpty = this.RULE<UniversalListParams>(
    '_operatorLteEmpty',
    (name: string) => {
      this.CONSUME(UniversableListParser.OpLte);
      return {
        column: name,
        operator: OperatorTypes.Lte,
        value: '',
      };
    }
  );

  private _operatorLte = this.RULE<UniversalListParams>(
    '_operatorLte',
    (name: string) => {
      const result = this.SUBRULE<UniversalListParams>(this._operatorLteEmpty, { ARGS: [ name ] });
      result.value = this.SUBRULE<string|string[]>(this._one);
      return result;
    }
  );
  private _operatorSearchEmpty = this.RULE<UniversalListParams>(
    '_operatorSearchEmpty',
    (name: string) => {
      this.CONSUME(UniversableListParser.OpSearch);
      return {
        column: name,
        operator: OperatorTypes.Search,
        value: '',
      };
    }
  );

  private _operatorSearch = this.RULE<UniversalListParams>(
    '_operatorSearch',
    (name: string) => {
      const result = this.SUBRULE<UniversalListParams>(this._operatorSearchEmpty, { ARGS: [ name ] });
      result.value = this.SUBRULE<string|string[]>(this._one);
      return result;
    }
  );

  private _operatorRule = this.RULE<UniversalListParams>(
    '_operatorRule',
    (name: string) => {
      const args = { ARGS: [ name ]};
      return this.OR<UniversalListParams>([
          { GATE: this.BACKTRACK(this._operatorEq, args.ARGS), ALT: () => this.SUBRULE(this._operatorEq, args) },
          { GATE: this.BACKTRACK(this._operatorEqEmpty, args.ARGS), ALT: () => this.SUBRULE(this._operatorEqEmpty, args) },

          { GATE: this.BACKTRACK(this._operatorNe, args.ARGS), ALT: () => this.SUBRULE(this._operatorNe, args) },
          { GATE: this.BACKTRACK(this._operatorNeEmpty, args.ARGS), ALT: () => this.SUBRULE(this._operatorNeEmpty, args) },

          { GATE: this.BACKTRACK(this._operatorGt, args.ARGS), ALT: () => this.SUBRULE(this._operatorGt, args) },
          { GATE: this.BACKTRACK(this._operatorGtEmpty, args.ARGS), ALT: () => this.SUBRULE(this._operatorGtEmpty, args) },

          { GATE: this.BACKTRACK(this._operatorGte, args.ARGS), ALT: () => this.SUBRULE(this._operatorGte, args) },
          { GATE: this.BACKTRACK(this._operatorGteEmpty, args.ARGS), ALT: () => this.SUBRULE(this._operatorGteEmpty, args) },

          { GATE: this.BACKTRACK(this._operatorLt, args.ARGS), ALT: () => this.SUBRULE(this._operatorLt, args) },
          { GATE: this.BACKTRACK(this._operatorLtEmpty, args.ARGS), ALT: () => this.SUBRULE(this._operatorLtEmpty, args) },

          { GATE: this.BACKTRACK(this._operatorLte, args.ARGS), ALT: () => this.SUBRULE(this._operatorLte, args) },
          { GATE: this.BACKTRACK(this._operatorLteEmpty, args.ARGS), ALT: () => this.SUBRULE(this._operatorLteEmpty, args) },

          { GATE: this.BACKTRACK(this._operatorSearch, args.ARGS), ALT: () => this.SUBRULE(this._operatorSearch, args) },
          { GATE: this.BACKTRACK(this._operatorSearchEmpty, args.ARGS), ALT: () => this.SUBRULE(this._operatorSearchEmpty, args) }
        ]
      );
    }
  );

  private _getAlts(rule, empty: any, args: { ARGS: any[] }) {
    return [
      {
        GATE: this.BACKTRACK(rule, args.ARGS),
        ALT: () => this.SUBRULE(rule, args)
      },
      {
        GATE: this.BACKTRACK(empty, args.ARGS),
        ALT: () => this.SUBRULE(empty, args)
      }
    ];
  }

  parse(text: string): UniversalListQuery {
    this.input = this._lexer.tokenize(text).tokens;
    return this.query();
  }
}

// helper functions
function trim(input: string) {
  return input.substr(1, input.length - 2);
}

function serializeString(i: string) {
  if (!isString(i)) {
    return `''`;
  }
  if (i.indexOf(`'`) !== -1) {
    return `"${i.replace('"', '')}"`;
  }
  if (i.indexOf('"') !== -1) {
    return `'${i.replace(`'`, '')}'`;
  }
  if (i.indexOf(' ') !== -1) {
    return `"${i}"`;
  }
  return i;
}

function serializeOperator(operator: string) {
  switch (operator) {
    case OperatorTypes.Eq:
    case OperatorTypes.In:
      return '=';
    case OperatorTypes.Ne:
    case OperatorTypes.NotIn:
      return '!=';
    case OperatorTypes.Lt:
      return '<';
    case OperatorTypes.Lte:
      return '<=';
    case OperatorTypes.Gte:
      return '>=';
    case OperatorTypes.Gt:
      return '>';
    case OperatorTypes.Search:
      return '?';
  }
  return operator;
}

function SerializeFilters(filters: UniversalListParams[]) {
  return filters.reduce<string[]>((prev, item) => {
    const sv = SerializeFilter(item);
    if (sv.length > 0) {
      prev.push(sv);
    }
    return prev;
  }, []);
}

function SerializeFilter(i: UniversalListParams) {
  if (i.value === null) { return ''; }

  if (i.operator === OperatorTypes.Is) {
    return `is:${i.column}`;
  }

  if (i.operator === OperatorTypes.Not) {
    return `not:${i.column}`;
  }

  if (isArray(i.value)) {
    let v = serializeString(i.value[0]);
    if (i.value.length > 1) {
      v =  i.value.map(serializeString).join(',');
    }
    return i.column + serializeOperator(i.operator) + v;
  }

  return i.column + serializeOperator(i.operator) + serializeString(i.value);
}
