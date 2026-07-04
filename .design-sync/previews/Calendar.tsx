import { Calendar } from '@shoppingo/web';

export const DueDate = () => (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, width: 'fit-content' }}>
        <Calendar mode="single" defaultMonth={new Date(2026, 0, 1)} selected={new Date(2026, 0, 15)} />
    </div>
);
