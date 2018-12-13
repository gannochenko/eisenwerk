import local from '@feathersjs/authentication-local';
import commonHooks from 'feathers-hooks-common';
import roleEnum from '../enum/role.js';
import hash from '../../../vendor/feathersjs/hasher.js';
import Context from '../../../lib/context';

export default class AuthorizationHook {
    static async isAdmin(auth) {
        return async context => {
            await Context.extractUser(context, auth)
                .then(user => {
                    return user.hasRole(roleEnum.ADMINISTRATOR);
                })
                .catch(() => {});
            return false;
        };
    }

    static async declare(hooks, application) {
        const auth = application.getAuthorization();
        hooks.declare({
            before: {
                create: [
                    // on create we hash the given password
                    commonHooks.iff(
                        commonHooks.isProvider('external'),
                        // todo: in order to be able to detect weak passwords, move hashing somewhere else
                        local.hooks.hashPassword({
                            passwordField: auth.getPasswordField(),
                            hash,
                        }),
                    ),
                ],
                update: [
                    // on update we also hash the given password
                    commonHooks.iff(
                        commonHooks.isProvider('external'),
                        // todo: in order to be able to detect weak passwords, move hashing somewhere else
                        local.hooks.hashPassword({
                            passwordField: auth.getPasswordField(),
                            hash,
                        }),
                    ),
                ],
                patch: [
                    commonHooks.iff(
                        commonHooks.isProvider('external'),
                        commonHooks.iffElse(
                            this.isAdmin(auth),
                            commonHooks.preventChanges(
                                'isVerified',
                                'verifyToken',
                                'verifyShortToken',
                                'verifyExpires',
                                'verifyChanges',
                                'resetToken',
                                'resetShortToken',
                                'resetExpires',
                            ),
                            commonHooks.preventChanges(
                                'password',
                                auth.getLoginField(),
                                auth.getPasswordField(),
                                'isVerified',
                                'verifyToken',
                                'verifyShortToken',
                                'verifyExpires',
                                'verifyChanges',
                                'resetToken',
                                'resetShortToken',
                                'resetExpires',
                            ),
                        ),
                    ),
                    context => {
                        if (
                            _.isStringNotEmpty(_.get(context, 'data.password'))
                        ) {
                            // move password to the right place
                            context.data[auth.getPasswordField()] =
                                context.data.password;
                            delete context.data.password;
                        }
                    },
                    // on patch we also hash the given password
                    commonHooks.iff(
                        commonHooks.isProvider('external'),
                        local.hooks.hashPassword({
                            passwordField: auth.getPasswordField(),
                            hash,
                        }),
                    ),
                ],
            },
            after: {
                all: [
                    // when called over the wire, we prevent some fields from exposing to the client
                    commonHooks.iff(commonHooks.isProvider('external'), [
                        local.hooks.protect(auth.getPasswordField()),
                        local.hooks.protect('password'),
                        local.hooks.protect('service'),
                    ]),
                ],
                find: [
                    context => {
                        if (_.isArrayNotEmpty(_.get(context, 'result.data'))) {
                            const data = context.result.data;
                            for (let i = 0; i < data.length; i++) {
                                if (
                                    _.isStringNotEmpty(
                                        _.get(data[i], auth.getPasswordField()),
                                    )
                                ) {
                                    data[i].password = _.get(
                                        data[i],
                                        auth.getPasswordField(),
                                    );
                                }
                            }
                        }
                    },
                ],
            },
        });
    }

    static declarePreProcess(hooks, application) {
        hooks.declare({
            before: {
                all: [
                    ctx => {
                        if (ctx.method !== 'create') {
                            return ctx;
                        }

                        // GOOGLE support
                        // when the user gets created through google oauth2, we need to extract
                        // their data and put on the right place
                        const google = _.getValue(ctx, 'data.google');
                        if (_.isObjectNotEmpty(google)) {
                            let userEmail = null;
                            const emails = _.getValue(google, 'profile.emails');
                            if (_.isArrayNotEmpty(emails)) {
                                userEmail = emails.find(
                                    email => email.type === 'account',
                                ).value;
                            }

                            delete ctx.data.google;

                            const gProfile = google.profile;

                            delete gProfile._raw;
                            delete gProfile._json;

                            // set google service
                            const sProfile = _.cloneDeep(gProfile);
                            delete sProfile.id;
                            delete sProfile.name;
                            delete sProfile.displayName;

                            ctx.data.service = ctx.data.service || {};
                            ctx.data.service.google = {
                                id: gProfile.id,
                                profile: sProfile,
                            };

                            ctx.data.profile = ctx.data.profile || {};

                            // set email
                            ctx.data.profile.email = userEmail;

                            // set names
                            const names = _.get(google, 'profile.name');
                            if (_.isObjectNotEmpty(names)) {
                                ctx.data.profile.firstName =
                                    names.givenName || '';
                                ctx.data.profile.lastName =
                                    names.familyName || '';
                            }
                        }

                        return ctx;
                    },
                ],
            },
        });
    }

    static isLegalEmail(email, domain) {
        if (!_.isStringNotEmpty(email)) {
            return false;
        }
        if (!_.isStringNotEmpty(domain)) {
            return true;
        }
        return email.slice(email.lastIndexOf('@') + 1) === 'some-domain.com';
    }
}