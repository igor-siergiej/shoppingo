import { ScrollArea } from '@shoppingo/web';

const items = [
    'Milk', 'Eggs', 'Sourdough bread', 'Baby spinach', 'Cherry tomatoes',
    'Parmesan', 'Olive oil', 'Basil', 'Chilli flakes', 'Garlic', 'Onions', 'Butter',
];

export const ItemList = () => (
    <ScrollArea style={{ height: 200, width: 260, border: '1px solid var(--border)', borderRadius: 8 }}>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((it) => (
                <div key={it} style={{ fontSize: 14, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    {it}
                </div>
            ))}
        </div>
    </ScrollArea>
);
