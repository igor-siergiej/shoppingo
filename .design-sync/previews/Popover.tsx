import { Button, Label, Popover, PopoverContent, PopoverTrigger } from '@shoppingo/web';

export const Open = () => (
    <div style={{ padding: 24, minHeight: 260 }}>
        <Popover open>
            <PopoverTrigger asChild>
                <Button variant="outline">Quantity & unit</Button>
            </PopoverTrigger>
            <PopoverContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Label>Amount</Label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button size="sm" variant="secondary">
                            500
                        </Button>
                        <Button size="sm" variant="secondary">
                            g
                        </Button>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                        Set how much of this item to buy.
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    </div>
);
