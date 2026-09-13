import { createContext, type ReactNode, type RefObject, useContext } from 'react';

const ScrollContainerContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export const useScrollContainer = () => useContext(ScrollContainerContext);

interface ScrollContainerProviderProps {
    scrollRef: RefObject<HTMLDivElement | null>;
    children: ReactNode;
}

export const ScrollContainerProvider = ({ scrollRef, children }: ScrollContainerProviderProps) => (
    <ScrollContainerContext.Provider value={scrollRef}>{children}</ScrollContainerContext.Provider>
);
