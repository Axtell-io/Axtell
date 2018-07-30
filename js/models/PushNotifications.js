import Data, { EnvKey } from '~/models/Data';
import ErrorManager from '~/helpers/ErrorManager';
import WebAPNToken from '~/models/Request/WebAPNToken';

export const PNAPNUnknownResponseState = Symbol('PN.APN.Error.UnknownResponseState');

/**
 * Manages push notifications across different platforms.
 */
export default class PushNotification {
    /**
     * The main PN service
     * @type {PushNotification}
     */
    static shared = new PushNotification({
        webAPNId: Data.shared.envValueForKey(EnvKey.webAPNId) || null
    });

    /**
     * Creates PN but you probably want to use {@link PushNotification.shared}
     * @param {Object} [options={}]
     * @param {?string} options.webAPNId - The web APN ID or null if not supported.
     */
    constructor({ webAPNId = null } = {}) {
        /**
         * Apple Web Push Notification ID
         * @readonly
         * @type {?string}
         */
        this.webAPNId = webAPNId;
    }

    /**
     * If to use APN flow
     * @type {boolean}
     */
    get useAPN() { return !!global.safari.pushNotification }

    /**
     * If APN is setup
     * @type {boolean}
     */
    get backendSupportsAPN() { return this.webAPNId !== null; }

    /**
     * The APN URL. `null` if we don't support
     * @type {?string}
     */
    get apnURL() {
        if (!this.backendSupportsAPN) return null;
        return `${Data.shared.envValueForKey(EnvKey.host)}/static/webapn`
    }

    /**
     * If has permission
     * @type {boolean}
     */
    get hasPermissions() {
        if (this.useAPN) {
            return global.safari.pushNotification.permission(this.webAPNId).permission === "granted";
        } else {
            return false;
        }
    }

    /**
     * If should ask for permission
     * @type {boolean}
     */
    get needsRequest() {
        if (this.useAPN) {
            return global.safari.pushNotification.permission(this.webAPNId).permission === "default";
        } else {
            return false;
        }
    }

    /**
     * If we have been denied perms
     * @type {boolean}
     */
    get denied() {
        // If we don't have perms and can't ask then yeah...
        if (this.useAPN) {
            return global.safari.pushNotification.permission(this.webAPNId).permission === "denied";
        } else {
            return false;
        }
    }

    /**
     * Requests
     * @async
     * @return {boolean} If priviledge was obtained or not
     */
    requestPriviledge() {
        return new Promise(async (resolve, reject) => {
            if (this.useAPN) {
                // Use APN api
                if (this.hasPermissions) {
                    // Setup APN
                    return resolve(true)
                }

                // If we don't have permission then ¯\_(ツ)_/¯
                if (this.denied) { return resolve(false) }

                if (!this.backendSupportsAPN) {
                    alert("Axtell instance is not configured for APN");
                    return resolve(false);
                }

                if (!this.needsRequest) {
                    return ErrorManager.raise('Not denied or accepted but request not needed', PNAPNUnknownResponseState);
                }

                const authorizationToken = await new WebAPNToken().run();
                console.log(authorizationToken);
                safari.pushNotification.requestPermission(
                    this.apnURL,
                    this.webAPNId,
                    {
                        token: authorizationToken
                    },
                    ({ deviceToken, permission }) => {
                        if (this.denied) { resolve(false); }
                        if (this.hasPermissions) {
                            // Talk with server
                            resolve(true);
                        }

                        return ErrorManager.silent('Not denied or accepted but request completed', PNAPNUnknownResponseState);
                    }
                )
            } else {
                // Use service worker Push API
            }
        });
    }
}
