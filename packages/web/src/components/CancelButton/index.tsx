import CloseIcon from '@mui/icons-material/Close';
import StyledButton from '../../style/style';

interface CancelButtonProps {
    handleClick(): void;
}

const CancelButton = ({ handleClick }: CancelButtonProps) => {
    return (
        <StyledButton onClick={handleClick} variant="outlined">
            <CloseIcon />
        </StyledButton>
    );
};

export default CancelButton;
