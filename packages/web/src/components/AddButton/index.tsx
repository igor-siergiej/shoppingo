import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export interface AddButtonProps {
    handleClick: () => void;
}

const AddButton = ({ handleClick }: AddButtonProps) => {
    return (
        <Button
            onClick={() => {
                handleClick();
            }}
            variant="contained"
            sx={{
                border: 3,
                borderRadius: '10px',
                textAlign: 'center',
                width: '100%',
            }}
        >
            <AddIcon />
        </Button>
    );
};

export default AddButton;
