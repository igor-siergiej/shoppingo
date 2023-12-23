import { type Item } from '../../types';

export interface ItemCheckBoxListProps {
    items: Item[];
    handleUpdate: (item: Item) => void;
    handleRemove: (item: Item) => void;
}
