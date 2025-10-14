import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { RelationalQueryBuilder } from 'drizzle-orm/pg-core/query-builders/query';
import * as schemas from '../schemas';

export type FindManyQueryConfig<T extends RelationalQueryBuilder<any, any>> =
  Parameters<T['findMany']>[0];

export type DrizzleDB = NodePgDatabase<typeof schemas>;
