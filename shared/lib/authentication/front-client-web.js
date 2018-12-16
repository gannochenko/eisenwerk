export default class FrontClientWeb {
    constructor(params = {}) {
        this._params = params;
    }

    prepare() {}

    getParams() {
        return this._params || {};
    }

    async signIn(how = 'local', params = {}) {
        if (!_.isStringNotEmpty(how)) {
            throw new Error('Illegal way of authorizing');
        }

        if (how === 'local') {
            return this.signInLocal(params);
        }

        return this.signInOAuth2(how, params);
    }

    async signOut() {}

    async signInLocal() {}

    async signInOAuth2(how, params = {}) {
        const openLoginPopup = (await import('feathers-authentication-popups'))
            .default;
        openLoginPopup(`/auth/${how}`, {
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

        // //this.getNetwork().passport.setJWT(token);
        // window.__authAgentPrevReject = null;
        //
        // // const userId = await this.getUserId(token);
        //
        // return userId;
    }
}
