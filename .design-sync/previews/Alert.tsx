import { Alert, AlertDescription, AlertTitle } from '@shoppingo/web';

export const Default = () => (
    <Alert style={{ maxWidth: 420 }}>
        <AlertTitle>List shared</AlertTitle>
        <AlertDescription>Anna can now edit “Groceries”.</AlertDescription>
    </Alert>
);

export const Offline = () => (
    <Alert
        style={{
            maxWidth: 420,
            borderColor: 'var(--destructive)',
            color: 'var(--destructive)',
        }}
    >
        <AlertTitle>You’re offline</AlertTitle>
        <AlertDescription>Changes will sync when the connection is back.</AlertDescription>
    </Alert>
);
