interface Filters {
  [key: string]: {
    suggest: string;
    filter: UniversalListParams[];
  };
}

interface Params {
  [key: string]: {
    limit: string;
    offset: string;
    sort: string;
    direction: string;
  };
}

export class UniversalListState {
  filters: Filters;
  params: Params;
  sessionFilters: Filters;
  sessionParams: Params;
  data: {
    [key: string]: {
      items: any[];
      total: number;
    };
  };
  columns: { [key: string]: ColumnItem[]; };
  formats: string[];

  constructor() {
    this.filters = {};
    this.params = {};
    this.sessionFilters = {};
    this.sessionParams = {};
    this.data = {};
    this.columns = {};
    this.formats = [];
  }
}

export class ColumnItem {
  alias: string;
  defaultOperator: string;
  defaultView: boolean;
  name: string;
  operators: string[];
  outputName: string;
  type: string;
  reference: string;
  referenceColumn: string;
  typeData: any;
  suggest: boolean;
}

export class ColumnsApiResponse {
  formats: string[];
  items: ColumnItem[];
}

export class UniversalListFilterPayload {
  key: string;
  items: Array<{
    operator: Operator;
    value: any;
  }>;
}

export class ListResult<T = any> {
  items: T[];
  totalHits: number;
  limit: number;
  offset: number;
}

export class ListParams {
  query?: UniversalListQuery;
  filter?: any[];
  limit?: string;
  offset?: string;
  sort?: string;
  direction?: string;
  entity?: string;
  subscriptionName?: string;
  suggest?: string;
}

export class UniversalListQuery {
  suggest?: string;
  filter: UniversalListParams[];
}

export class UniversalListParams {
  operator: Operator;
  column: string;
  value?: any;
}

export enum OperatorTypes {
  Lt = 'lt',
  Lte = 'lte',
  Eq = 'eq',
  Ne = 'ne',
  Gte = 'gte',
  Gt = 'gt',
  In = 'in',
  NotIn = 'notIn',
  Is = 'is',
  Not = 'not',
  Search= 'search',
}

export type Operator
  = OperatorTypes.Lt
  | OperatorTypes.Lte
  | OperatorTypes.Eq
  | OperatorTypes.Ne
  | OperatorTypes.Gte
  | OperatorTypes.Gt
  | OperatorTypes.In
  | OperatorTypes.NotIn
  | OperatorTypes.Is
  | OperatorTypes.Not
  | OperatorTypes.Search;

export interface FavCol {
  name: string;
  alias: string;
  value: boolean;
}

export interface SuggestRequestPayload {
  value: string;
  name: string;
  entity: string;
  column: string;
}
