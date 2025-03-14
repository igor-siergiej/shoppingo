import { ObjectId } from 'mongodb';

export interface Item {
    name: string;
    isSelected: boolean;
    dateAdded: Date;
}

export interface List {
    _id: ObjectId;
    name: string;
    dateAdded: Date;
    items: Array<Item>;
}
