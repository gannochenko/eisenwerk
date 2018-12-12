import intersection from 'lodash.intersection';
import difference from 'lodash.difference';

export default class BothAccess {
    static testRoute(user, rule) {
        if (rule.deny === true) {
            return false;
        }

        return this.testUser(user, rule);
    }

    /**
     * Test the given rule against the given user
     * @param user
     * @param rule
     * @param context
     * @returns boolean True if the access can be granted
     */
    static testUser(user, rule, context = null) {
        if (rule.authorized === true && !_.isObjectNotEmpty(user)) {
            return false;
        }

        const userRole = _.isObjectNotEmpty(user) ? user.getRole() : [];

        if (_.isArray(rule.roleAny)) {
            // at least one role should match
            if (!_.isArrayNotEmpty(intersection(rule.roleAny, userRole))) {
                return false;
            }
        }

        if (_.isArray(rule.roleAll)) {
            // all roles should match
            if (_.isArrayNotEmpty(difference(rule.roleAll, userRole))) {
                return false;
            }
        }

        if (_.isFunction(rule.custom)) {
            return rule.custom(user, context);
        }

        return true;
    }
}
