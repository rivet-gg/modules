import { users } from './db/schema.ts';
import { Module} from "./_inner.ts"
import { get } from './scripts/get.ts';

export const module = new Module({
	status: 'preview',
	author: '',
	schema: { users },
    scripts: {get},
});
