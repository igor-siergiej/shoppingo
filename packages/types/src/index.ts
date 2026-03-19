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
    ownerId?: string;
}

export interface ListResponse {
    id: string;
    title: string;
    dateAdded: Date;
    items: Array<Item>;
    users: Array<{ username: string }>;
    listType: ListType;
    ownerId?: string;
}

export interface User {
    id: string;
    username: string;
}

export interface Ingredient {
    id: string;
    name: string;
    quantity?: number;
    unit?: string;
}

export interface Recipe {
    id: string;
    name: string;
    ingredients: Array<Ingredient>;
    coverImageKey?: string;
    ownerId?: string;
    users: Array<User>;
    dateAdded: Date;
}

export interface RecipeResponse {
    id: string;
    name: string;
    ingredients: Array<Ingredient>;
    coverImageKey?: string;
    ownerId?: string;
    users: Array<{ username: string }>;
    dateAdded: Date;
}
