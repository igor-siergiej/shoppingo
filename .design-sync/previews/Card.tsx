import {
    Button,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@shoppingo/web';

export const RecipeCard = () => (
    <Card style={{ width: 340 }}>
        <CardHeader>
            <CardTitle>Weekend Pasta</CardTitle>
            <CardDescription>Serves 4 · 25 min</CardDescription>
            <CardAction>
                <Button variant="ghost" size="sm">
                    Edit
                </Button>
            </CardAction>
        </CardHeader>
        <CardContent>
            <div style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
                Spaghetti, garlic, olive oil, parmesan, fresh basil, chilli flakes.
            </div>
        </CardContent>
        <CardFooter style={{ gap: 8 }}>
            <Button size="sm">Add to list</Button>
            <Button variant="outline" size="sm">
                View
            </Button>
        </CardFooter>
    </Card>
);

export const ListSummary = () => (
    <Card style={{ width: 300 }}>
        <CardHeader>
            <CardTitle>Groceries</CardTitle>
            <CardDescription>12 items · 4 checked</CardDescription>
        </CardHeader>
        <CardContent>
            <div style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
                Milk, eggs, bread, spinach, tomatoes…
            </div>
        </CardContent>
    </Card>
);
