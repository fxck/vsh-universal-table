import { TestBed } from '@angular/core/testing';

import { UniversableListParser, universableTableSerializer } from './universal-list-parser.service';
import { UniversalListParams, OperatorTypes, UniversalListQuery } from './universal-list.model';

describe('Universal table parser service test', () => {
  let _parser: UniversableListParser;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ UniversableListParser ] });
    _parser = TestBed.get(UniversableListParser);
  });

  it('should parse EQ format', () => {
    const input = _parser.parse('_id=100').filter;
    const result: UniversalListParams[] = [{
      column: '_id',
      operator: OperatorTypes.Eq,
      value: '100'
    }];

    expect(input).toEqual(result);
  });

  it('should parse NE format', () => {
    const input = _parser.parse('_id!=100').filter;
    const result: UniversalListParams[] = [{
      column: '_id',
      operator: OperatorTypes.Ne,
      value: '100'
    }];

    expect(input).toEqual(result);
  });

  it('should parse LTE format', () => {
    const input = _parser.parse('_id<=100').filter;
    const result: UniversalListParams[] = [{
      column: '_id',
      operator: OperatorTypes.Lte,
      value: '100'
    }];

    expect(input).toEqual(result);
  });

  it('should parse LT format', () => {
    const input = _parser.parse('_id<100').filter;
    const result: UniversalListParams[] = [{
      column: '_id',
      operator: OperatorTypes.Lt,
      value: '100'
    }];

    expect(input).toEqual(result);
  });

  it('should parse GT format', () => {
    const input = _parser.parse('_id>100').filter;
    const result: UniversalListParams[] = [{
      column: '_id',
      operator: OperatorTypes.Gt,
      value: '100'
    }];

    expect(input).toEqual(result);
  });

  it('should parse GTE format', () => {
    const input = _parser.parse('_id>=100').filter;
    const result: UniversalListParams[] = [{
      column: '_id',
      operator: OperatorTypes.Gte,
      value: '100'
    }];

    expect(input).toEqual(result);
  });

  it('should parse Search format', () => {
    const input = _parser.parse('_id?aejghuei34').filter;
    const result: UniversalListParams[] = [{
      column: '_id',
      operator: OperatorTypes.Search,
      value: 'aejghuei34'
    }];

    expect(input).toEqual(result);
  });

  it('should parse uncompleted format', () => {
    const input = _parser.parse('_id>=').filter;
    const result: UniversalListParams[] = [{
      column: '_id',
      operator: OperatorTypes.Gte,
      value: ''
    }];

    expect(input).toEqual(result);
  });

  it('should parse diacritic format', () => {
    const input = _parser.parse('_id>=áíčwřžýěžýěáí').filter;
    const result: UniversalListParams[] = [{
      column: '_id',
      operator: OperatorTypes.Gte,
      value: 'áíčwřžýěžýěáí'
    }];

    expect(input).toEqual(result);
  });

  it('should parse @ format', () => {
    const input = _parser.parse(`_i@d>=aaa@dddd`).filter;
    const result: UniversalListParams[] = [{
      column: '_i@d',
      operator: OperatorTypes.Gte,
      value: 'aaa@dddd'
    }];

    expect(input).toEqual(result);
  });

  it('should parse empty value format', () => {
    const input = _parser.parse(`_id>= is:todo`).filter;
    const result: UniversalListParams[] = [
      {
        column: '_id',
        operator: OperatorTypes.Gte,
        value: ''
      },
      {
        column: 'todo',
        operator: OperatorTypes.Is,
        value: true
      }
    ];

    expect(input).toEqual(result);
  });

  it('should parse and ignore spaces format', () => {
    const input = _parser.parse('   _id   >=   100   ').filter;
    const result: UniversalListParams[] = [{
      column: '_id',
      operator: OperatorTypes.Gte,
      value: '100'
    }];

    expect(input).toEqual(result);
  });

  it('should parse suggest text format', () => {
    const input = _parser.parse('   _id   >=   100   suggest test');
    const result: UniversalListQuery = {
      suggest: 'suggest test',
      filter: [{
        column: '_id',
        operator: OperatorTypes.Gte,
        value: '100'
      }]
    };

    expect(input).toEqual(result);
  });

  it('should serialize with suggest', () => {
    const result = universableTableSerializer({
      suggest: 'sugg"est test',
      filter: [
        {
          column: '_id',
          operator: OperatorTypes.Gte,
          value: '100'
        },
        {
          column: '_id',
          operator: OperatorTypes.Eq,
          value: 'ah"oj'
        }
      ]
    }, _parser.parse('').filter);
    expect(result).toEqual(`_id>=100 _id='ah"oj' sugg"est test`);
  });

  it('should serialize isTodo and notTodo colument with is operator', () => {
    const result = universableTableSerializer({
      suggest: '',
      filter: [
        {
          column: 'isTodo',
          operator: OperatorTypes.Is,
        },
        {
          column: 'notTodo',
          operator: OperatorTypes.Is,
        },
      ]
    }, _parser.parse('').filter);
    expect(result).toEqual(`is:isTodo is:notTodo`);
  });

  it('should serialize with old position suggest', () => {
    const result = universableTableSerializer({
      suggest: 'sugg"est test',
      filter: [
        {
          column: '_id',
          operator: OperatorTypes.Gte,
          value: '100'
        },
        {
          column: 'test',
          operator: OperatorTypes.Eq,
          value: '10'
        },
        {
          column: '_id',
          operator: OperatorTypes.Eq,
          value: 'ah"oj'
        }
      ]
    }, _parser.parse(`test:10 _id:'ah"oj'`).filter);
    expect(result).toEqual(`test=10 _id='ah"oj' _id>=100 sugg"est test`);
  });

  it('should serialize with old position suggest', () => {
    const result = universableTableSerializer({
      suggest: 'suggest text',
      filter: [
        {
          column: '_id',
          operator: OperatorTypes.Search,
          value: 'aaaa',
        },
        {
          column: 'adminUserAssignLock',
          operator: OperatorTypes.Is
        },
        {
          column: 'application',
          operator: OperatorTypes.Eq,
          value: null
        }
      ]
    }, _parser.parse(``).filter);
    expect(result).toEqual(
      `_id?aaaa is:adminUserAssignLock suggest text`
    );
  });

  it('should not serialize null values', () => {
    const result = universableTableSerializer({
      suggest: 'suggest text',
      filter: [
        {
          column: 'adminUserAssignLock',
          operator: OperatorTypes.Is,
          value: null
        }
      ]
    }, _parser.parse(``).filter);
    expect(result).toEqual(
      `suggest text`
    );
  });

  it('should serialize Eliška value', () => {
    const result = universableTableSerializer({
      suggest: 'suggest text',
      filter: [
        {
          column: 'adminUserAssignLock',
          operator: OperatorTypes.Search,
          value: 'Eliška'
        }
      ]
    }, _parser.parse(``).filter);
    expect(result).toEqual(
      `adminUserAssignLock?Eliška suggest text`
    );
  });

  it(`should serialize 'Eliška aaa' with space value`, () => {
    const result = universableTableSerializer({
      suggest: 'suggest text',
      filter: [
        {
          column: 'adminUserAssignLock',
          operator: OperatorTypes.Search,
          value: 'Eliška aaaa'
        }
      ]
    }, _parser.parse(``).filter);
    expect(result).toEqual(
      `adminUserAssignLock?"Eliška aaaa" suggest text`
    );
  });

  it('should parse "is:" format', () => {
    const input = _parser.parse(`is:todo`).filter;
    const result: UniversalListParams[] = [
      {
        column: 'todo',
        operator: OperatorTypes.Is,
        value: true
      }
    ];

    expect(input).toEqual(result);
  });

  it('should parse "not:" format', () => {
    const input = _parser.parse(`not:todo`).filter;
    const result: UniversalListParams[] = [
      {
        column: 'todo',
        operator: OperatorTypes.Not,
        value: true
      }
    ];

    expect(input).toEqual(result);
  });

  it('should parse "is:" format with column with "is"', () => {
    const input = _parser.parse(`is:isTodo`).filter;
    const result: UniversalListParams[] = [
      {
        column: 'isTodo',
        operator: OperatorTypes.Is,
        value: true
      }
    ];

    expect(input).toEqual(result);
  });

  it('should parse "is:" format with column with "not"', () => {
    const input = _parser.parse(`is:notTodo`).filter;
    const result: UniversalListParams[] = [
      {
        column: 'notTodo',
        operator: OperatorTypes.Is,
        value: true
      }
    ];

    expect(input).toEqual(result);
  });

  it('should parse "not:" format with column with "not"', () => {
    const input = _parser.parse(`not:notTodo`).filter;
    const result: UniversalListParams[] = [
      {
        column: 'notTodo',
        operator: OperatorTypes.Not,
        value: true
      }
    ];

    expect(input).toEqual(result);
  });

});
