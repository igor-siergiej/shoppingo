export interface Item {
    name: string;
    isSelected: boolean;
    dateAdded: Date;
}

export interface List {
    name: string;
    dateAdded: Date;
    items: Item[];
}
