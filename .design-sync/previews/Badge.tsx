import { Badge } from '@shoppingo/web';

export const Variants = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Badge>Groceries</Badge>
        <Badge variant="secondary">4 checked</Badge>
        <Badge variant="destructive">Out of stock</Badge>
        <Badge variant="outline">Recipe</Badge>
    </div>
);
