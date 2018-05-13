import Data from '~/models/Data';
import Request from '~/models/Request/Request';
import querystring from 'querystring';

/**
 * Talks to SE API
 */
export default class StackExchangege {
    /**
     * Logs in and gets auth key
     * @return {string}
     */
    static loginAuthKey() {
        return new Promise((resolve, reject) => {
            const authWindow = window.open(
                `https://stackexchange.com/oauth?` +
                `client_id=${Data.shared.envValueForKey('SE_CLIENT_ID')}` +
                `&scope=` +
                `&state=${btoa(JSON.stringify({
                    provider: 'se',
                    target_client: true
                }))}` +
                `&redirect_uri=${Data.shared.envValueForKey('OAUTH_CALLBACK')}`,
                'Axtell authentication for Stack Exchange',
                'width=800,height=800,toolbar=0,menubar=0'
            );

            window.addEventListener('message', (event) => {
                // The response
                if (event.source === authWindow) {
                    const data = event.data;
                    if (data.success === true) {
                        event.source.postMessage({ received: true }, '*');
                        resolve(data.authKey);
                    } else {
                        reject();
                    }
                }
            });
        });
    }

    /**
     * Authorizes to SE object
     * @return {StackExchange}
     */
    static async authorize() {
        const authKey = await this.loginAuthKey();
        return new this(authKey);
    }

    constructor(authKey) {
        /** @private */
        this.authKey = authKey;
    }

    apiRequest(path, params) {
        return new Request({
            path: `https://api.stackexchange.com${path}`,
            params: {
                ...params,
                key: Data.shared.envValueForKey('SE_KEY'),
                access_token: this.authKey
            }
        });
    }

    async pagingApiRequest(path, params) {
        let allItems = [],
            page = 1,
            hasMore;

        do {
            let { items, has_more } = await this.apiRequest(path, {
                ...params,
                page: page++
            }).run();

            hasMore = has_more;

            for (let i = 0; i < items.length; i++) {
                allItems.push(items[i]);
            }
        } while(hasMore);

        return allItems;
    }

    /**
     * Gets the posts
     */
    async getQuestions() {
        return await this.pagingApiRequest('/2.2/me/questions', {
            order: 'desc',
            sort: 'activity',
            site: 'codegolf',
            filter: '!5RCKNP5Mc6Rvk2i(0CxGveeZ-' // This is from the SE api explorer
        });
    }
}
