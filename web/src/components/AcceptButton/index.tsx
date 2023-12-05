import CheckIcon from '@mui/icons-material/Check';
import StyledButton from '../../style/style';

interface AcceptButtonProps {
    handleClick(): void;
}

const AcceptButton = ({ handleClick }: AcceptButtonProps) => {
    return (
        <StyledButton onClick={handleClick} color="primary" variant="contained">
            <CheckIcon />
        </StyledButton>
    );
};

export default AcceptButton;
