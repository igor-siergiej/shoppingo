import { useUser } from '@imapps/web-utils';
import type { Label } from '@shoppingo/types';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { createLabel as apiCreate, deleteLabel as apiDelete, updateLabel as apiUpdate, getLabelsQuery } from '../api';

export const useLabels = () => {
    const queryClient = useQueryClient();
    const { user } = useUser();
    const invalidate = () => {
        queryClient.invalidateQueries('labels');
        queryClient.invalidateQueries('todos');
    };

    const { data, isLoading, refetch } = useQuery<Label[]>(getLabelsQuery(user?.id ?? ''));

    const createMutation = useMutation((body: { name: string; color: string }) => apiCreate(body), {
        onSuccess: invalidate,
    });
    const updateMutation = useMutation(
        ({ id, body }: { id: string; body: { name?: string; color?: string } }) => apiUpdate(id, body),
        { onSuccess: invalidate }
    );
    const deleteMutation = useMutation((id: string) => apiDelete(id), { onSuccess: invalidate });

    return {
        labels: data ?? [],
        isLoading,
        refetch,
        createLabel: (body: { name: string; color: string }) => createMutation.mutateAsync(body),
        updateLabel: (id: string, body: { name?: string; color?: string }) => updateMutation.mutateAsync({ id, body }),
        deleteLabel: (id: string) => deleteMutation.mutateAsync(id),
    };
};
