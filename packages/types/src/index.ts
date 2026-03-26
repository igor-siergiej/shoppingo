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
    title: string;
    ingredients: Ingredient[];
    coverImageKey?: string;
    users: User[];
    ownerId?: string;
    dateAdded: Date;
    link?: string;
    instructions?: string[];
}

export interface RecipeResponse {
    id: string;
    title: string;
    ingredients: Ingredient[];
    coverImageKey?: string;
    users: Array<{ username: string }>;
    ownerId?: string;
    dateAdded: Date;
    link?: string;
    instructions?: string[];
}
