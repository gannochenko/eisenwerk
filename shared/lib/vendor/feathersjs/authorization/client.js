import auth from '@feathersjs/authentication-client';
import AuthorizationBoth from './both';

export default class Authorization extends AuthorizationBoth {
    /**
     * Tune feathersjs client app with appropriate configuration.
     * @param application
     * @param storage
     * @param userEntity
     */
    static prepare(application, storage, userEntity) {
        application.configure(
            auth({
                // todo: use custom storage in order to obtain the token either from localStorage or the URL
                storage,
                storageKey: 'jwt',
            }),
        );
    }

    /**
     * Authenticate a user through oauth2 Google.
     * @returns {Promise<*>}
     */
    async signInThroughGoogle() {
        if (!window) {
            return null;
        }

        const ctx = this.getSettings();

        // we don't want this when doing ssr
        const openLoginPopup = (await import('feathers-authentication-popups'))
            .default;
        openLoginPopup(`${ctx.getAPIURL()}/auth/google`, {
            width: 600,
            height: 600,
        });

        if (_.isFunction(window.__authAgentPrevReject)) {
            window.__authAgentPrevReject(new Error('ABANDONED_WINDOW'));
            window.__authAgentPrevReject = null;
        }

        const token = await new Promise((resolve, reject) => {
            window.__authAgentPrevReject = reject;
            window.authAgent.once('login', resToken => {
                resolve(resToken);
            });
        });

        this.getNetwork().passport.setJWT(token);
        window.__authAgentPrevReject = null;

        const userId = await this.getUserId(token);
        this.getNetwork().emit('authenticated');

        return userId;
    }

    async extractPayload(token) {
        if (!_.isStringNotEmpty(token)) {
            token = await this.getToken(false);
        }

        if (!_.isStringNotEmpty(token)) {
            return null;
        }

        return this.getNetwork().passport.verifyJWT(token);
    }

    async isTokenValid(token) {
        if (!_.isStringNotEmpty(token)) {
            return false;
        }

        return this.getNetwork().passport.payloadIsValid(token);
    }
}
