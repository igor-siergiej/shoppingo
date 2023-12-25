import { TextField, Box } from '@mui/material';
import AcceptButton from '../AcceptButton';
import CancelButton from '../CancelButton';
import { useState } from 'react';
import AddButton from '../AddButton';
import { NewItemFormProps } from './types';

const NewItemForm = ({ handleAdd }: NewItemFormProps) => {
    const [open, setOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState(false);

    const validateForm = () => {
        return newName.length === 0;
    };

    return open ? (
        <>
            <TextField
                size="small"
                value={newName}
                autoComplete="off"
                error={error}
                onChange={(event) => {
                    setError(false);
                    setNewName(event.target.value);
                }}
                sx={{
                    borderRadius: '10px',
                    mb: '0.5em',
                    width: '100%',
                }}
                color="primary"
                label="Add New Item"
                helperText={error ? 'Name cannot be blank.' : ''}
                variant="filled"
                inputRef={(input) => {
                    if (input != null) {
                        input.focus();
                    }
                }}
            />
            <Box sx={{ width: '100%', display: 'flex', pb: '10em' }}>
                <AcceptButton
                    handleClick={async () => {
                        if (validateForm()) {
                            setError(true);
                            return;
                        }
                        await handleAdd(newName);
                        setOpen(false);
                        setNewName('');
                    }}
                />
                <CancelButton
                    handleClick={() => {
                        setOpen(false);
                    }}
                />
            </Box>
        </>
    ) : (
        <AddButton
            handleClick={() => {
                setOpen(true);
            }}
        />
    );
};

export default NewItemForm;
