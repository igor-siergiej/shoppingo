import { Textarea } from '@shoppingo/web';

export const Default = () => (
    <div style={{ width: 320 }}>
        <Textarea defaultValue={'Buy ripe avocados.\nAsk the deli for thin-cut ham.'} rows={3} />
    </div>
);

export const Placeholder = () => (
    <div style={{ width: 320 }}>
        <Textarea placeholder="Notes for this list…" rows={3} />
    </div>
);
