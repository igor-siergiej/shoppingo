export interface MakeRequestProps {
    pathname: string;
    method: MethodType;
    operationString: string;
    body?: BodyInit;
}

export enum MethodType {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    DELETE = 'DELETE',
}
