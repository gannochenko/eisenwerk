/**
 * This class is used on the client serving server to enable integration with OAuth2.
 *
 */

import passport from 'passport';
import { OAuth2Strategy } from 'passport-google-oauth';
import axios from 'axios';

export default class FrontServer {
    constructor(params = {}) {
        this._params = params;
    }

    attach() {
        const { settings, network } = this.getParams();
        passport.use(
            new OAuth2Strategy(
                {
                    clientID: settings.get('auth.oauth2.google.client-id'),
                    clientSecret: settings.get('auth.oauth2.google.secret'),
                    callbackURL: `${settings.get(
                        'url.root',
                        '/',
                    )}auth/google/callback`,
                },
                (accessToken, refreshToken, profile, done) => {
                    // console.dir('resolving user');
                    // console.dir(accessToken);
                    // console.dir(profile);

                    const authURL = settings.get('url.auth.inner');
                    if (!_.isStringNotEmpty(authURL)) {
                        throw new Error('No url.auth parameter specified');
                    }

                    axios
                        .post(`${authURL}oauth2`, {
                            provider: 'google',
                            token: accessToken,
                        })
                        .then(res => {
                            // console.dir('res::::');
                            // console.dir(res);
                            done(null, res);
                        })
                        .catch(err => {
                            // console.dir(err);
                            done(err);
                        });
                },
            ),
        );

        // use also local strategy here

        passport.serializeUser((user, cb) => {
            cb(null, user);
        });

        passport.deserializeUser((obj, cb) => {
            cb(null, obj);
        });

        network.use(passport.initialize());
        network.use(passport.session());

        network.all('/auth/result', (req, res) => {
            if (req.query.failure) {
                res.send('FUCK!');
            } else {
                res.send('SUCCESS!');
            }
        });

        network.get('/failure', (req, res) => {
            res.send('FAILURE!');
        });

        network.get(
            '/auth/google',
            passport.authenticate('google', {
                scope: ['email', 'profile'],
            }),
        );

        network.get(
            '/auth/google/callback',
            passport.authenticate('google', {
                failureRedirect: '/auth/result?failure',
            }),
            (req, res) => {
                const token = _.get(req, 'session.passport.user.data.token');
                if (!_.isStringNotEmpty(token)) {
                    return res.redirect('/auth/result?failure');
                }

                // set header
                res.redirect('/success');
            },
        );
    }

    getParams() {
        return this._params || {};
    }
}
