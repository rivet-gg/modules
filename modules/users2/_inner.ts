
import { PostgresJsDatabase } from 'npm:drizzle-orm/postgres-js';


import { neon } from 'npm:@neondatabase/serverless';
import { drizzle,  type NeonHttpDatabase  } from 'npm:drizzle-orm/neon-http';

interface OgsModuleConfig<TSchema  extends Record<string, unknown>> {
	schema: TSchema, 
	status: 'preview', 
	author: string,
    scripts: Record<string, OgsScript>;
}

interface OgsScript {}

export class Module<TSchema extends Record<string, unknown> = Record<string, never>> {

    private db: NeonHttpDatabase<TSchema>;

    constructor(opts: OgsModuleConfig<TSchema>) {
        const sql = neon("blablablabal");
        this.db = drizzle(sql, {schema: opts.schema}); 
    }

    createScript(_name: string, _fn: (ctx: {db: NeonHttpDatabase<TSchema>}, req: any) => Promise<any>): OgsScript {
        throw 'unimplemented';
    }


    script<T = any>(_something: Record<string, any>, _fn: (ctx: {db: NeonHttpDatabase<TSchema>}, req: any) => Promise<any>) {
        throw 'unimplemented';
    }
}

// interface OgsModule<TSchema extends Record<string, unknown>> {
//     handler: (_name: string, _fn: (ctx: {db: PostgresJsDatabase<TSchema>}) => void)
// }

// export const ogsModule = <TSchema extends Record<string, unknown>>(_opts: OgsModuleConfig<TSchema>): OgsModule<TSchema> => {
// 	return {
// 		handler: (_name: string, _fn: (ctx: {db: PostgresJsDatabase<TSchema>}) => void) => {
// 			return null;
// 		}
// 	}
// }
