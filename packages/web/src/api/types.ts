export interface MakeRequestProps {
    pathname: string;
    method: MethodType;
    operationString: string;
    body?: BodyInit;
    queryParams?: Record<string, string>;
}

export enum MethodType {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    DELETE = 'DELETE',
}
