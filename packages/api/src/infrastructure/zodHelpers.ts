import { z } from 'zod';

const toStringArray = (value: Array<unknown> | undefined): string[] =>
    (value ?? []).filter((entry): entry is string => typeof entry === 'string');

export const stringArrayField = () =>
    z.preprocess((value) => (Array.isArray(value) ? value : []), z.array(z.unknown()).transform(toStringArray));
