export interface AddItemDrawerProps {
    handleAdd: (name: string) => Promise<void>;
    placeholder?: string;
}
