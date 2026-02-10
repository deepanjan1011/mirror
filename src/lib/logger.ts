type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
    private log(level: LogLevel, message: string, meta?: any) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta,
        };

        // In production, this would send to Sentry/LogRocket
        // For now, we print to console in a structured way
        if (level === 'error') {
            console.error(JSON.stringify(logEntry));
        } else if (level === 'warn') {
            console.warn(JSON.stringify(logEntry));
        } else {
            console.log(JSON.stringify(logEntry));
        }
    }

    info(message: string, meta?: any) {
        this.log('info', message, meta);
    }

    warn(message: string, meta?: any) {
        this.log('warn', message, meta);
    }

    error(message: string, meta?: any) {
        this.log('error', message, meta);
    }

    debug(message: string, meta?: any) {
        this.log('debug', message, meta);
    }
}

export const logger = new Logger();
