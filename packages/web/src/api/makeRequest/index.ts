import { MakeRequestProps } from '../types';

export const makeRequest = async ({
    pathname,
    method,
    operationString,
    body,
}: MakeRequestProps) => {
    try {
        const response = await fetch(pathname, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
        });

        if (response.ok) {
            return await response.json();
        } else {
            console.error(
                `Failed to ${operationString}:`,
                response.status,
                response.statusText
            );
            throw new Error(
                `Response was not ok ${response.status}: ${response.statusText}`
            );
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(
                `Error while trying to ${operationString}: ${error.message}`
            );
        }
    }
};
