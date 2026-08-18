export interface MakeRequestProps {
    pathname: string;
    method: MethodType;
    operationString: string;
    body?: BodyInit;
    queryParams?: Record<string, string>;
    signal?: AbortSignal;
}

export enum MethodType {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    DELETE = 'DELETE',
}
