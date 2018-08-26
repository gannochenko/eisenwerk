import BaseService from '../../lib/entity/service/index.js';
import Entity from './entity/server.js';
import roleEnum from './enum/role.js';
import AuthorizationHook from './hooks/authorization.js';

export default class UserService extends BaseService {

    /**
     * Returns an entity this service provides an access to
     * @returns {Entity}
     */
    static getEntity() {
        return Entity;
    }

    /**
     * Enable automatic generation of createdAt and updatedAt fields for the entity
     * @returns {{timeStamps}}
     */
    getSettings() {
        const settings = super.getSettings();
        settings.timeStamps = true;

        return settings;
    }

    declarePreProcessHooks(hooks) {
        AuthorizationHook.declarePreProcess(hooks);
        super.declarePreProcessHooks(hooks);
    }

    declareSecurityHooks(hooks) {
        AuthorizationHook.declare(hooks, this.getApplication());
        super.declareSecurityHooks(hooks);
    }

    /**
     * Returns access rights for exposing this entity over the wire. They don't get applied when working server-side.
     * @returns {{}}
     */
    getCRUDAccessRules() {
        return {
            get: this.getRuleRead(),
            find: this.getRuleRead(),
            create: this.getRuleCreate(),
            update: this.getRulePut(),
            patch: this.getRuleUpdate(),
            default: this.getRuleRemove(),
        };
    }

    /**
     * Returns integrity checkers (functions) for each operation: create, update, patch, delete. These functions get
     * executed every time, regardless over the wire you make your call or not. So by implementing the function you
     * may control the integrity of your data: prevent some fields from changing by certain users, etc.
     * @returns {{}}
     */
    getIntegrityCheckers() {
        return {
            create: this.checkIntegrityOnCreate.bind(this),
        };
    }

    /**
     * Any authorized user being in any of three legal roles can read data from the entity,
     * but with additional limitations for certain roles.
     * @returns {{deny: boolean, authorized: boolean, roleAny: *[], custom: (function(*, *, *=): boolean)}}
     */
    getRuleRead() {
        return {
            deny: false,
            authorized: true,
            roleAny: [roleEnum.ADMINISTRATOR],
            // custom: (user, context) => {
            //     if (user.hasRole(roleEnum.SOME_ROLE)) {
            //         this.attachMandatoryCondition(context, {
            //             $or: [
            //                 {_id: user.getId()},
            //                 {role: roleEnum.SOME_ROLE},
            //             ],
            //         });
            //     }
            //
            //     return true;
            // },
        };
    }

    /**
     * Everybody can create a new user, but see the limitations in .checkIntegrityOnCreate()
     * @returns {{deny: boolean, authorized: boolean}}
     */
    getRuleCreate() {
        return {
            deny: false,
            authorized: false,
        };
    }

    getRuleUpdate() {
        return {
            deny: false,
            authorized: true,
            roleAny: [roleEnum.ADMINISTRATOR],
            custom: async (user, context) => {
                const id = context.id;
                const data = context.data;

                if (id) {
                    // for patching an existing entity: nobody except an administrator can change other
                    // user accounts but their own
                    if (!user.hasRole(roleEnum.ADMINISTRATOR)) {
                        if (id.toString() !== user.getId().toString()) {
                            this.throw403('You are not allowed to update other users');
                        }
                    }
                }

                if (_.isArrayNotEmpty(data.role)) {
                    const previous = await this.getPrevious(context);

                    const oRole = previous.getRole();
                    const nRole = data.role;
                    if (!_.deepEqual(nRole, oRole)) {
                        // you are not allowed to change roles in general,
                        this.throw403('You are not allowed to change roles');
                    }
                }
            },
        };
    }

    /**
     * We forbid PUT for this entity, it is inappropriate.
     * @returns {{deny: boolean}}
     */
    getRulePut() {
        return {
            deny: true,
        };
    }

    /**
     * Only admins can remove the entity
     * @returns {{deny: boolean, authorized: boolean, roleAll: *[]}}
     */
    getRuleRemove() {
        return {
            deny: false,
            authorized: true,
            roleAll: [roleEnum.ADMINISTRATOR],
        };
    }

    async checkIntegrityOnCreate(data, context) {
        const params = context.params;
        const email = _.getValue(data, 'profile.email') || data['profile.email'];
        const isGoogle = _.isObjectNotEmpty(params.oauth) && params.oauth.provider === 'google';
        const legalGoogleEmail = AuthorizationHook.isLegalGoogleEmail(email);

        // you are not allowed to create administrators, unless you came from google
        if (_.contains(data.role, roleEnum.ADMINISTRATOR)) {
            if (!isGoogle || !legalGoogleEmail) {
                this.throw403('You are not allowed to create administrators');
            }
        }

        // you are not allowed to register with random emails through google
        // if (isGoogle && !legalGoogleEmail) {
        //     this.throw403('You are not allowed to register with that kind of email');
        // }

        return context;
    }
}
