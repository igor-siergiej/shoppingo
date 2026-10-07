import type { Logger } from '@imapps/api-utils';
import { APIError } from '@imapps/api-utils/hono';
import type { DiscoverySearchQuery, DiscoverySource, RecipeDifficulty } from '@shoppingo/types';
import type { Context } from 'hono';

import type { DiscoveryService } from '../../domain/DiscoveryService';
import type { HonoVars } from '../handlerUtils';

const DIFFICULTIES: readonly RecipeDifficulty[] = ['easy', 'medium', 'hard'];
const SOURCES: readonly DiscoverySource[] = ['wikibooks', 'user'];

const badRequest = (message: string) => new APIError(message, 400);

/** `?tags=a&tags=b` and `?tags=a,b` both work; blanks are dropped. */
const listParam = (c: Context<HonoVars>, name: string): string[] | undefined => {
    const values = c.req
        .queries(name)
        ?.flatMap((v) => v.split(','))
        .map((v) => v.trim())
        .filter(Boolean);
    return values?.length ? values : undefined;
};

// Parse + two bound checks for one parameter.
// fallow-ignore-next-line complexity
const intParam = (c: Context<HonoVars>, name: string, min: number): number | undefined => {
    const raw = c.req.query(name);
    if (raw === undefined || raw === '') return undefined;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min) throw badRequest(`${name} must be an integer >= ${min}`);
    return value;
};

const enumParam = <T extends string>(c: Context<HonoVars>, name: string, allowed: readonly T[]): T[] | undefined => {
    const values = listParam(c, name);
    const invalid = values?.find((v) => !allowed.includes(v as T));
    if (invalid) throw badRequest(`${name} must be one of: ${allowed.join(', ')}`);
    return values as T[] | undefined;
};

const parseSearchQuery = (c: Context<HonoVars>): DiscoverySearchQuery => ({
    q: c.req.query('q'),
    tags: listParam(c, 'tags'),
    ingredients: listParam(c, 'ingredients'),
    difficulty: enumParam(c, 'difficulty', DIFFICULTIES),
    source: enumParam(c, 'source', SOURCES),
    minTime: intParam(c, 'minTime', 0),
    maxTime: intParam(c, 'maxTime', 0),
    page: intParam(c, 'page', 1),
    pageSize: intParam(c, 'pageSize', 1),
});

/** Errors carrying a 4xx/503 status are meant for the caller; anything else is hidden behind a generic 500. */
// Status mapping for one error path.
// fallow-ignore-next-line complexity
const failWith = (logger: Logger, message: string, error: unknown): never => {
    const e = (error ?? {}) as { message?: string; status?: number };
    const status = e.status ?? 500;
    logger.error(message, { error: e.message, status });
    throw new APIError(status === 500 ? 'Internal Server Error' : (e.message ?? 'Internal Server Error'), status);
};

// Discovery reads only the shared library. Nothing here touches personal recipes or their `users`.
export const createDiscoveryHandlers = (service: DiscoveryService, logger: Logger) => ({
    searchRecipes: async (c: Context<HonoVars>): Promise<Response> => {
        const query = parseSearchQuery(c);
        try {
            return c.json(await service.search(query), 200);
        } catch (error) {
            return failWith(logger, 'API: Discovery search failed', error);
        }
    },

    getRecipe: async (c: Context<HonoVars>): Promise<Response> => {
        try {
            return c.json(await service.getRecipe(c.req.param('id') ?? ''), 200);
        } catch (error) {
            return failWith(logger, 'API: Discovery recipe lookup failed', error);
        }
    },

    getSimilarRecipes: async (c: Context<HonoVars>): Promise<Response> => {
        const limit = intParam(c, 'limit', 1);
        try {
            return c.json(await service.getSimilar(c.req.param('id') ?? '', limit), 200);
        } catch (error) {
            return failWith(logger, 'API: Discovery similar-recipes lookup failed', error);
        }
    },
});
