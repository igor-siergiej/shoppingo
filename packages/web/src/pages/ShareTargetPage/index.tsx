import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ShareTargetPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const url = searchParams.get('url') ?? '';
        const title = searchParams.get('title') ?? '';
        const params = new URLSearchParams();
        if (url) params.set('sharedUrl', url);
        if (title) params.set('sharedTitle', title);
        navigate(`/recipes?${params.toString()}`, { replace: true });
    }, [searchParams, navigate]);

    return null;
};

export default ShareTargetPage;
