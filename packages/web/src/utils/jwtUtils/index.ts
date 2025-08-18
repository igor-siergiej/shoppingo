export interface DecodedToken {
    username: string;
    id: string;
    exp: number;
    iat: number;
    [key: string]: string | number | boolean;
}

export const decodeJWT = (token: string): DecodedToken | null => {
    try {
        const parts = token.split('.');

        if (parts.length !== 3) {
            throw new Error('Invalid JWT token format');
        }

        const payload = parts[1];

        const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);

        const decodedPayload = atob(paddedPayload);

        const parsedPayload = JSON.parse(decodedPayload);

        return parsedPayload as DecodedToken;
    } catch (error) {
        console.error('Failed to decode JWT token:', error);

        return null;
    }
};

export const isTokenExpired = (token: string): boolean => {
    const decoded = decodeJWT(token);

    if (!decoded) {
        return true;
    }

    const currentTime = Date.now() / 1000;

    return decoded.exp < currentTime;
};

export const getTokenExpirationTime = (token: string): Date | null => {
    const decoded = decodeJWT(token);

    if (!decoded) {
        return null;
    }

    return new Date(decoded.exp * 1000);
};

export const extractUserFromToken = (token: string): { username: string; id: string } | null => {
    const decoded = decodeJWT(token);

    if (!decoded || !decoded.username || !decoded.id) {
        return null;
    }

    return {
        username: decoded.username,
        id: decoded.id
    };
};
