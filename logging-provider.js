// @ts-check
const sentry = require('@sentry/node');

/**
 * Logging Provider Service
 */
class LoggingProvider {

    constructor() {
        sentry.init({
            dsn: process.env.LOG_DSN
        });

        sentry.configureScope((scope) => {
            scope.setTag("source", process.env.LOG_SOURCE);
        });
    }

    logInfo(msg, user = null, toConsole = true) {

        sentry.withScope((scope) => {
            if (user) {
                scope.setUser({
                    id: user.userId,
                    providerId: user.providerId,
                    isAdmin: user.isAdmin
                })
            }
            sentry.captureMessage(String(msg), sentry.Severity.Info);
        })

        if (toConsole) {
            console.log(msg);
        }
    }

    logWarn(msg, user = null, toConsole = true) {

        sentry.withScope((scope) => {
            if (user) {
                scope.setUser({
                    id: user.userId,
                    providerId: user.providerId,
                    isAdmin: user.isAdmin
                })
            }
            sentry.captureMessage(String(msg), sentry.Severity.Warning);
        })

        if (toConsole) {
            console.warn(msg);
        }
    }

    logException(err, user = null, toConsole = true) {

        sentry.withScope((scope) => {
            if (user) {
                scope.setUser({
                    id: user.userId,
                    providerId: user.providerId,
                    isAdmin: user.isAdmin
                })
            }
            sentry.captureException(err);
        })

        if (toConsole) {
            console.error(String(err));
        }
    }
}

module.exports = LoggingProvider;
