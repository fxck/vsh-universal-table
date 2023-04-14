import { getUniqKey } from '../../universal-list-data.utils';

export const getSuggestUniqKey = (
  entity: string,
  name: string
) => getUniqKey(`${entity}/${name.replace('.', '__')}`);
