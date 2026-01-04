export enum ListType {
    SHOPPING = 'shopping',
    TODO = 'todo',
}

export interface Item {
    id: string;
    name: string;
    isSelected: boolean;
    dateAdded: Date;
    quantity?: number;
    unit?: string;
    dueDate?: Date;
}

export interface List {
    id: string;
    title: string;
    dateAdded: Date;
    items: Array<Item>;
    users: Array<User>;
    listType: ListType;
}

export interface ListResponse {
    id: string;
    title: string;
    dateAdded: Date;
    items: Array<Item>;
    users: Array<{ username: string }>;
    listType: ListType;
}

export interface User {
    id: string;
    username: string;
}
