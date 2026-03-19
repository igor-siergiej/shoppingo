import { differenceInHours, format } from 'date-fns';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface DueDateBadgeProps {
    dueDate?: Date | string;
}

export const DueDateBadge = ({ dueDate }: DueDateBadgeProps) => {
    if (!dueDate) return null;

    const parsedDate = dueDate instanceof Date ? dueDate : new Date(dueDate);
    const hoursUntilDue = differenceInHours(parsedDate, new Date());
    const isAlertRed = hoursUntilDue < 24;
    const isWarningYellow = hoursUntilDue < 72 && !isAlertRed;

    return (
        <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ml-2 shrink-0 ${
                isAlertRed
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : isWarningYellow
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      : ''
            }`}
        >
            {isAlertRed && <AlertCircle className="h-4 w-4" />}
            {isWarningYellow && <AlertTriangle className="h-4 w-4" />}
            <span className="text-sm font-semibold whitespace-nowrap">{format(parsedDate, 'dd/MM/yyyy')}</span>
        </div>
    );
};
