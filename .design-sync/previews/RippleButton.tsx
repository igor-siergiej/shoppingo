import { RippleButton } from '@shoppingo/web';

export const Variants = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <RippleButton>Add to list</RippleButton>
        <RippleButton variant="secondary">Save</RippleButton>
        <RippleButton variant="outline">Share</RippleButton>
        <RippleButton variant="destructive">Remove</RippleButton>
    </div>
);
