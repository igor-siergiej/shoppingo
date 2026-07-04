import { Skeleton } from '@shoppingo/web';

export const ListLoading = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 300 }}>
        {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Skeleton style={{ height: 40, width: 40, borderRadius: 8 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <Skeleton style={{ height: 12, width: '70%' }} />
                    <Skeleton style={{ height: 12, width: '40%' }} />
                </div>
            </div>
        ))}
    </div>
);
