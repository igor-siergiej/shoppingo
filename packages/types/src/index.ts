export interface Item {
    id: string;
    name: string;
    isSelected: boolean;
    dateAdded: Date;
}

export interface List {
    id: string;
    title: string;
    dateAdded: Date;
    items: Array<Item>;
    users: Array<User>;
}

export interface User {
    id: string;
    username: string;
}
