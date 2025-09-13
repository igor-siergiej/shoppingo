import React from 'react';
import { useRouteError } from 'react-router-dom';

import ErrorPage from '../ErrorPage';

const RouterErrorHandler: React.FC = () => {
    const error = useRouteError();

    let errorObject: Error;

    if (error instanceof Error) {
        errorObject = error;
    } else if (typeof error === 'string') {
        errorObject = new Error(error);
    } else if (error && typeof error === 'object' && 'message' in error) {
        errorObject = new Error(error.message as string);
    } else {
        errorObject = new Error('An unknown routing error occurred');
    }

    return <ErrorPage error={errorObject} />;
};

export default RouterErrorHandler;
