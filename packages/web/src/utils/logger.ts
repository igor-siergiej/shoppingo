/**
 * Frontend logger that sends logs to the backend /api/logs endpoint
 * Logs are then collected by Promtail and sent to Loki
 */

interface LogEntry {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, unknown>;
    timestamp: string;
    userAgent: string;
    url: string;
}

class FrontendLogger {
    private queue: LogEntry[] = [];
    private batchSize = 10;
    private batchTimeout = 5000; // 5 seconds
    private batchTimer: NodeJS.Timeout | null = null;
    private apiUrl = '/api/logs';

    private createLogEntry(level: LogEntry['level'], message: string, context?: Record<string, unknown>): LogEntry {
        return {
            level,
            message,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
        };
    }

    private async flushLogs() {
        if (this.queue.length === 0) return;

        const logsToSend = [...this.queue];
        this.queue = [];

        // Clear batch timer
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        // Send logs to backend
        for (const log of logsToSend) {
            try {
                await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(log),
                    // Don't wait for response, fire and forget
                }).catch((err) => {
                    // Silently fail for network errors
                    console.error('Failed to send log to backend:', err);
                });
            } catch (err) {
                // Fallback to console if something goes wrong
                console.error('Logger error:', err);
            }
        }
    }

    private scheduleBatchFlush() {
        if (this.batchTimer) return;

        this.batchTimer = setTimeout(() => {
            this.flushLogs();
        }, this.batchTimeout);
    }

    private addToQueue(entry: LogEntry) {
        this.queue.push(entry);

        // Also log to console in development
        if (import.meta.env.DEV) {
            console[entry.level](`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context || {});
        }

        // Flush if batch size is reached
        if (this.queue.length >= this.batchSize) {
            this.flushLogs();
        } else {
            // Schedule a flush if not already scheduled
            this.scheduleBatchFlush();
        }
    }

    debug(message: string, context?: Record<string, unknown>) {
        this.addToQueue(this.createLogEntry('debug', message, context));
    }

    info(message: string, context?: Record<string, unknown>) {
        this.addToQueue(this.createLogEntry('info', message, context));
    }

    warn(message: string, context?: Record<string, unknown>) {
        this.addToQueue(this.createLogEntry('warn', message, context));
    }

    error(message: string, context?: Record<string, unknown>) {
        this.addToQueue(this.createLogEntry('error', message, context));
    }

    /**
     * Flush remaining logs before page unload
     */
    async flushBeforeUnload() {
        // Use sendBeacon for unload events (more reliable)
        if (this.queue.length > 0 && navigator.sendBeacon) {
            for (const log of this.queue) {
                navigator.sendBeacon(this.apiUrl, JSON.stringify(log));
            }
            this.queue = [];
        }
    }
}

// Create singleton instance
export const logger = new FrontendLogger();

// Flush logs before page unload
window.addEventListener('beforeunload', () => {
    logger.flushBeforeUnload();
});

// Flush logs before page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        logger.flushBeforeUnload();
    }
});

export default logger;
