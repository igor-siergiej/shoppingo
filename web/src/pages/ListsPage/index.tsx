import { useQuery } from 'react-query';
import { FormGroup, Toolbar, Typography } from '@mui/material';
import { addList, getListsQuery } from '../../api';
import Appbar from '../../components/Appbar';
import NewItemForm from '../../components/NewItemForm';
import ListsList from '../../components/ListsList';
import { Layout } from '../../components/Layout';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

const ListsPage = () => {
    const { data, isLoading, isError, refetch } = useQuery({
        ...getListsQuery(),
    });

    const pageContent = (
        <>
            <FormGroup
                sx={{
                    display: 'flex',
                }}
            >
                {data ? (
                    <ListsList lists={data} refetch={refetch} />
                ) : (
                    <Typography
                        sx={{ textAlign: 'center', pb: '1em', pt: '1em' }}
                    >
                        This list is empty...
                    </Typography>
                )}
            </FormGroup>

            <NewItemForm
                handleAdd={async (listName) => {
                    await addList(listName);
                    await refetch();
                }}
            />
        </>
    );

    const errorPageContent = <div>Error has occured</div>;

    return (
        <Layout>
            <Appbar />
            <Toolbar />
            {isError && errorPageContent}
            {isLoading && <LoadingSkeleton />}
            {!isLoading && !isError && pageContent}
        </Layout>
    );
};

export default ListsPage;
