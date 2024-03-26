import { Box } from '@mui/material';
import { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    return (
        <>
            <Box
                m={'auto'}
                sx={{
                    maxWidth: '500px',
                }}
            >
                {children}
            </Box>
        </>
    );
};
