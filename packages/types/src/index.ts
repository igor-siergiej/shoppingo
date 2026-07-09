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

export interface Friendship {
    id: string;
    /** Canonical sorted pair key — userIds[0] < userIds[1] lexicographically. */
    userIds: [string, string];
    /** {id, username} snapshots for display without a kivo roundtrip. */
    users: [User, User];
    createdAt: Date;
}

export interface PairingCode {
    code: string;
    creatorId: string;
    creatorUsername: string;
    /** createdAt + 15 minutes. */
    expiresAt: Date;
    /** Set when redeemed — enforces single use. */
    usedAt?: Date;
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

export interface RecipeImportResult {
    title: string;
    ingredients: Ingredient[];
    instructions: string[];
    link: string;
    /** Absolute cover image URL scraped from the page, if any. */
    image?: string;
    prepTime?: string;
    cookTime?: string;
    recipeYield?: string;
}

export interface Recurrence {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    /** Recurrence end, as a timezone-agnostic YYYY-MM-DD day. */
    until?: string;
}

export interface Todo {
    id: string;
    ownerId: string;
    title: string;
    done: boolean;
    dateAdded: Date;
    /** Scheduled day, as a timezone-agnostic YYYY-MM-DD string. */
    dueDate?: string;
    time?: string;
    labelId?: string;
    recurrence?: Recurrence;
    completedDates?: string[];
    /** Friends this todo is shared with (excludes the owner, who is implicit via ownerId). */
    users?: Array<User>;
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

export { expandOccurrences, isoDay, type Occurrence, occursOn, parseDay } from './recurrence';
