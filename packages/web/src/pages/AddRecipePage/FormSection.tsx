import type { ReactNode } from 'react';

export interface FormSectionProps {
    title: string;
    children: ReactNode;
}

export const FormSection = ({ title, children }: FormSectionProps) => (
    <section className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {children}
    </section>
);
