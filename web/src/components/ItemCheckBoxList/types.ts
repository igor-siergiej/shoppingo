import { type Item } from '../../types';

export interface ItemCheckBoxListProps {
    items: Item[];
    handleOnChange: (arg0: Item) => void;
}
