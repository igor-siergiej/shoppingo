import { apiCreateList } from '../api-helpers';
import { expect, test } from '../fixtures';
import { mockSpokenItemsParse } from '../mocks/ai';
import { installFakeSpeech } from '../mocks/speech';

const LIST_TITLE = 'Voice List';

// Chromium can't drive a real microphone, so recognition is faked and the LLM parse is stubbed;
// the confirmation UI and the bulk add against the real API are what's under test.
test.describe('Add items by voice', () => {
    test('speech becomes separate items that are confirmed before adding', async ({ authenticatedPage }) => {
        await installFakeSpeech(authenticatedPage, { kind: 'transcript', transcript: 'two loaves of bread and milk' });
        await mockSpokenItemsParse(authenticatedPage, {
            ok: { items: [{ name: 'bread', quantity: 2, unit: 'loaf' }, { name: 'milk' }] },
        });
        await apiCreateList(LIST_TITLE);
        await authenticatedPage.goto(`/list/${LIST_TITLE}`);

        await authenticatedPage.getByRole('button', { name: 'Actions' }).click();
        await authenticatedPage.getByRole('button', { name: 'Add by voice' }).click();
        await authenticatedPage.getByRole('button', { name: 'Start listening' }).click();

        await expect(authenticatedPage.getByRole('list', { name: 'Items heard' })).toBeVisible();
        await expect(authenticatedPage.getByText('2 loaf')).toBeVisible();

        await authenticatedPage.getByRole('button', { name: 'Add 2 items' }).click();

        await expect(authenticatedPage.getByText('bread')).toBeVisible();
        await expect(authenticatedPage.getByText('milk')).toBeVisible();
    });
});
