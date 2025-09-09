import { randomUUID } from 'crypto';

import { IdGenerator } from '../../domain/IdGenerator';

export class UuidGenerator implements IdGenerator {
    generate(): string {
        return randomUUID();
    }
}
