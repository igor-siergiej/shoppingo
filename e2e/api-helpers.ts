import { MOCK_TOKEN } from './mocks/auth';

const API_BASE = 'http://localhost:4001';

const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${MOCK_TOKEN}`,
};

export async function apiCreateList(title: string, listType = 'shopping') {
    const res = await fetch(`${API_BASE}/api/lists`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ title, listType, dateAdded: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`apiCreateList failed: ${await res.text()}`);
    return res.json() as Promise<{ id: string; title: string }>;
}

export async function apiAddItem(
    listTitle: string,
    itemName: string,
    overrides: { quantity?: number; unit?: string; isSelected?: boolean; dueDate?: string } = {}
) {
    const res = await fetch(`${API_BASE}/api/lists/${encodeURIComponent(listTitle)}/items`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ itemName, dateAdded: new Date().toISOString(), ...overrides }),
    });
    if (!res.ok) throw new Error(`apiAddItem failed: ${await res.text()}`);
    return res.json() as Promise<{ id: string; name: string }>;
}

export async function apiUpdateItem(
    listTitle: string,
    itemName: string,
    updates: { isSelected?: boolean; newItemName?: string; quantity?: number; unit?: string }
) {
    const res = await fetch(
        `${API_BASE}/api/lists/${encodeURIComponent(listTitle)}/items/${encodeURIComponent(itemName)}`,
        {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(updates),
        }
    );
    if (!res.ok) throw new Error(`apiUpdateItem failed: ${await res.text()}`);
    return res.json();
}

export async function apiCreateRecipe(
    title: string,
    ingredients: Array<{ name: string; quantity?: number; unit?: string }> = []
) {
    const res = await fetch(`${API_BASE}/api/recipes`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
            title,
            dateAdded: new Date().toISOString(),
            user: { id: 'user-testuser', username: 'testuser' },
            selectedUsers: [],
            ingredients,
        }),
    });
    if (!res.ok) throw new Error(`apiCreateRecipe failed: ${await res.text()}`);
    return res.json() as Promise<{ id: string; title: string; ingredients: Array<{ id: string; name: string }> }>;
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${path} failed: ${await res.text()}`);
    return res.json() as Promise<T>;
}

export const apiCreateTodo = (body: {
    title: string;
    dueDate?: string;
    time?: string;
    labelId?: string;
    recurrence?: { freq: string; interval: number; until?: string };
}) => apiPut<{ id: string; title: string }>('/api/todos', body);

export const apiCreateLabel = (body: { name: string; color: string }) =>
    apiPut<{ id: string; name: string; color: string }>('/api/labels', body);
