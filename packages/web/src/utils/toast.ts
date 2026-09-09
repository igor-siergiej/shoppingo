import { toast } from 'sonner';

const successStyle = { backgroundColor: '#10b981', color: '#ffffff', border: 'none' } as const;
const errorStyle = { backgroundColor: '#ef4444', color: '#ffffff', border: 'none' } as const;
const warningStyle = { backgroundColor: '#f59e0b', color: '#ffffff', border: 'none' } as const;

export const notifySuccess = (message: string) => toast.success(message, { style: successStyle });

export const notifyError = (message: string) => toast.error(message, { style: errorStyle });

export const notifyWarning = (message: string) => toast(message, { style: warningStyle });
