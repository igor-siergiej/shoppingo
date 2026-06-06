import type { Label } from '@shoppingo/types';

export interface LabelRepository {
    getById(labelId: string): Promise<Label | null>;
    findByOwnerId(ownerId: string): Promise<Label[]>;
    insert(label: Label): Promise<Label>;
    update(labelId: string, label: Label): Promise<Label>;
    deleteById(labelId: string): Promise<void>;
}
