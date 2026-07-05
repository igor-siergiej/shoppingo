import { Button, Card, CardAction, CardDescription, CardHeader, CardTitle } from '@shoppingo/web';

export const WithAction = () => (
    <Card style={{ width: 320 }}>
        <CardHeader>
            <CardTitle>Groceries</CardTitle>
            <CardDescription>12 items · updated 2h ago</CardDescription>
            <CardAction>
                <Button variant="ghost" size="sm">
                    Share
                </Button>
            </CardAction>
        </CardHeader>
    </Card>
);
