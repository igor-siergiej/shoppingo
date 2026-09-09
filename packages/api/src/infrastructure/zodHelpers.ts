import { z } from 'zod';

// fallow-ignore-next-line unused-export
export const toStringArray = (value: Array<unknown> | undefined): string[] =>
    (value ?? []).filter((entry): entry is string => typeof entry === 'string');

export const stringArrayField = () =>
    z.preprocess((value) => (Array.isArray(value) ? value : []), z.array(z.unknown()).transform(toStringArray));
