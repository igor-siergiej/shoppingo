import type { MakeRequestProps } from '../types';

export const makeRequest = async ({ pathname, method, operationString, body, queryParams }: MakeRequestProps) => {
    try {
        let url = pathname;

        if (queryParams) {
            const searchParams = new URLSearchParams(queryParams);

            url = `${pathname}?${searchParams.toString()}`;
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
        });

        if (response.ok) {
            return await response.json();
        } else {
            // Try to parse error message from response body
            let errorMessage = response.statusText;
            try {
                const errorBody = await response.json();
                if (errorBody?.error) {
                    errorMessage = errorBody.error;
                }
            } catch {
                // If parsing fails, use status text
            }

            console.error(`Failed to ${operationString}:`, response.status, errorMessage);
            throw new Error(errorMessage);
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`Error while trying to ${operationString}`);
    }
};
