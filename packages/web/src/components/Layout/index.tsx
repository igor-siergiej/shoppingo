import { Box } from '@mui/material';
import { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    return (
        <>
            <Box
                m="auto"
                sx={{
                    pt: '1em',
                    maxWidth: '500px',
                }}
            >
                {children}
            </Box>
        </>
    );
};
