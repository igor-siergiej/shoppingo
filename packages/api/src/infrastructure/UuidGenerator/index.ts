import { randomUUID } from 'node:crypto';

import type { IdGenerator } from '../../domain/IdGenerator';

export class UuidGenerator implements IdGenerator {
    generate(): string {
        return randomUUID();
    }
}
