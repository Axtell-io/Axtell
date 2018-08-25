import Auth from '~/models/Auth';
import ErrorManager from '~/helpers/ErrorManager';
import Data from '~/models/Data';

export const INVALID_JSON = Symbol('User.Error.InvalidJSON');

/**
 * Represents a User
 *
 * @implements {JSONConvertable}
 */
export default class User {
    /**
     * Creates an instance of a user locally.
     * @param {number} id   Integer uniquely id'ing user.
     * @param {string} name user display name
     * @param {Object} options other options
     * @param {?string} options.avatar avatar URL
     * @param {boolean} options.isFollowing - If current user is following
     */
    constructor(id, name, {
        avatar = null,
        postCount = null,
        answerCount = null,
        isFollowing = null,
    } = {}) {
        this._id = id;
        this._name = name;

        this._avatar = avatar;

        this._postCount = postCount;
        this._answerCount = answerCount;

        this._isFollowing = isFollowing;
    }

    /** @type {number} */
    get id() { return this._id; }

    /**
     * @type {string}
     */
    get name() {
        return this._name;
    }

    /** @type {string} */
    get avatar() { return this._avatar; }

    /** @type {?number} */
    get postCount() { return this._postCount; }

    /** @type {?number} */
    get answerCount() { return this._answerCount; }

    /** @type {string} */
    get profilePage() { return `${Data.shared.envValueForKey('HOST')}/user/${this.id}/${this.name}`; }

    /**
     * If current user is following this one
     * @type {boolean}
     */
    get isFollowing() { return this._isFollowing; }

    /**
     * If current user is following this one
     * @type {boolean}
     */
    set isFollowing(newIsFollowing) { this._isFollowing = newIsFollowing; }

    /**
     * Check if is current user
     * @return {boolean}
     */
    async isMe() {
        const auth = await Auth.shared;
        if (auth.isAuthorized === false) return false;
        return auth.user.id === this.id;
    }

    /**
     * Unwraps from serach Index JSON object
     * @param {Object} JSON Search index JSON
     * @return {?User} Created object
     */
    static fromIndexJSON(json) {
        return this.fromJSON(json);
    }

    /**
     * Unwraps a user from an API JSON object.
     * @param {Object} json User JSON object.
     * @return {?User} User object if succesful, `null` if unauthorized.
     * @throws {TypeError} if invalid JSON object
     */
    static fromJSON(json) {
        if (json.unauthorized === true) return null;
        if (!(json['id'] && json['name']))
            ErrorManager.raise('Invalid input to User#fromJSON', INVALID_JSON);

        return new User(
            json.id,
            json.name,
            {
                avatar: json.avatar,
                postCount: json.post_count,
                answerCount: json.answer_count,
                isFollowing: json.is_following
            }
        );
    }

    /**
     * Gets the schema
     * @return {Object}
     */
    async getSchema() {
        return {
            '@type': 'Person',
            name: this.name,
            identifier: this.profilePage,
            image: this.avatar,
            url: this.profilePage
        }
    }

    /**
     * Converts to json
     * @return {Object} json object
     */
    toJSON() {
        return {
            type: 'user',
            id: this.id,
            name: this.name,
            avatar: this.avatar
        };
    }

    /** @type {number} */
    static MIN_USERNAME_LENGTH = Data.shared.envValueForKey('MIN_USERNAME_LENGTH');

    /** @type {number} */
    static MAX_USERNAME_LENGTH = Data.shared.envValueForKey('MAX_USERNAME_LENGTH');

}
