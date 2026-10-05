import { useUser } from '@imapps/web-utils';
import { useListRealtime } from '../../hooks/useListRealtime';
import { ViewerBanner } from './ViewerBanner';

// Owns the list's live connection: mounted while the list is on screen, it keeps the list query
// fresh as other members edit and shows who else is looking at it.
export const ListViewers = ({ listTitle }: { listTitle: string }) => {
    const { user } = useUser();
    const viewers = useListRealtime(listTitle, user?.id);

    return <ViewerBanner viewers={viewers} />;
};
