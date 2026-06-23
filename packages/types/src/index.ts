export enum ListType {
    SHOPPING = 'shopping',
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
    users: Array<User>;
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
    /** The AI-generated image key, generated once and kept so the cover can revert to it for free. */
    aiImageKey?: string;
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
    aiImageKey?: string;
    users: Array<{ username: string }>;
    ownerId?: string;
    dateAdded: Date;
    link?: string;
    instructions?: string[];
}

export interface Recurrence {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    until?: Date;
}

export interface Todo {
    id: string;
    ownerId: string;
    title: string;
    done: boolean;
    dateAdded: Date;
    dueDate?: Date;
    time?: string;
    labelId?: string;
    recurrence?: Recurrence;
    completedDates?: string[];
}

export interface TodoResponse extends Todo {}

export interface Label {
    id: string;
    ownerId: string;
    name: string;
    color: string;
}

export interface LabelResponse extends Label {}

export interface PushSubscription {
    /** Push service endpoint URL — unique per browser/device. Used as the document id. */
    endpoint: string;
    userId: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    dateAdded: Date;
}
