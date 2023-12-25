import { type Item } from '../../types';

export interface ItemCheckBoxListProps {
    items: Item[];
    refetch: () => void;
}
