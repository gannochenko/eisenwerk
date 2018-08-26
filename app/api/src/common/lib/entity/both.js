import Query from './query.js';
import Result from './result.js';

let networkRef = null;

export default class Entity {

    static getUId() {
        throw new Error(`Not implemented .getUId() for ${this.name}`);
    }

    /**
     * Sets the default network provider for all entities to make REST calls
     * @param network
     */
    static setNetwork(network) {
        networkRef = network;
    }

    /**
     * Returns the default network to make REST calls through
     * @returns {*|null}
     */
    static getNetwork() {
        return networkRef;
    }

    static getService() {
        return this.getNetwork().service(this.getUId());
    }

    static async get(id, parameters = {}) {
        const lean = parameters.lean === true;
        const params = {};
        if (_.isObjectNotEmpty(parameters.select)) {
            params.$select = _.deepClone(parameters.select);
        }
        if (_.isArrayNotEmpty(parameters.populate)) {
            params.$populate = _.deepClone(parameters.populate);
        }

        try {
            const data = await this.getService().get(id, params);
            return lean ? data : new this(data);
        } catch (e) {
            if (e.name !== 'NotFound') {
                throw e;
            }

            return null;
        }
    }

    static async find(parameters = {}) {
        return this.query(parameters).exec();
    }

    static async findOne(parameters = {}) {
        const query = this.query(parameters);
        query.limit(1);

        const res = await query.exec();

        if (_.isArrayNotEmpty(res.data)) {
            return res.data[0];
        }

        return null;
    }

    static query(parameters = {}) {
        return new Query(this, parameters);
    }

    static async save(id, data) {
        const result = new Result();

        if (id) {
            // update
            try {
                result.setData(await this.getService().patch(id, data));
            } catch (e) {
                this.setErrorsToResult(result, e);
            }
        } else {
            // create
            try {
                result.setData(await this.getService().create(data));
            } catch (e) {
                this.setErrorsToResult(result, e);
            }
        }

        return result;
    }

    static async delete(id) {
        const result = new Result();
        result.setData(this);

        try {
            await this.getService().remove(id);
        } catch (e) {
            result.setErrors(_.isArrayNotEmpty(e.errors) ? e.errors : {message: e.message});
        }

        return result;
    }

    static async remove(id) {
        return this.delete(id);
    }

    static async deleteMany(filter = {}) {
        return this.getService().remove(null, {
            query: filter,
        });
    }

    static setErrorsToResult(result, e) {
        let errors = [];
        if (_.isArrayNotEmpty(e.errors)) {
            errors = e.errors;
        } else {
            errors.push(e);
        }

        result.setErrors(errors);
    }

    constructor(data) {
        this.setData(data);
    }

    async save() {
        const result = new Result();
        result.setData(this);

        if (this.getId()) {
            // update
            try {
                const data = await this.getService().patch(this.getId(), this.getData());
                this.setData(data);
            } catch (e) {
                this.setErrorsToResult(result, e);
            }
        } else {
            // create
            try {
                const data = await this.getService().create(this.getData());
                this.setData(data);
            } catch (e) {
                this.setErrorsToResult(result, e);
            }
        }

        return result;
    }

    async delete() {
        const result = new Result();
        result.setData(this);

        try {
            await this.getService().remove(this.getId());
        } catch (e) {
            result.setErrors(_.isArrayNotEmpty(e.errors) ? e.errors : {message: e.message});
        }

        delete this._data._id;

        return result;
    }

    getId() {
        return this.getData()._id;
    }

    getData() {
        if (!this._normalized) {
            this.normalizeData(this._data);
        }

        return this._data;
    }

    setData(data) {
        this.invalidateCaches();
        this._normalized = false;
        this._data = data || {};
    }

    extractData() {
        return _.deepClone(this.getData());
    }

    invalidateCaches() {
    }

    getCreatedAt() {
        return this.getData().createdAt;
    }

    getUpdatedAt() {
        return this.getData().updatedAt;
    }

    /**
     * This function needs to be defined for each entity.
     * The purpose: define all nested objects on the first demand, to avoid making getters like
     *  return this.getData().something || '';
     * because that kind of getters being used in Rect component properties forces the component to re-render EACH TIME!
     * Besides, it reduces the use of _.getValue(), which is great, but kills performance.
     *
     * @param data
     * @return void
     */
    normalizeData(data) {
    }

    clone() {
        const Constructor = this.constructor;
        return new Constructor(this.extractData());
    }

    getNetwork() {
        return this.constructor.getNetwork();
    }

    getService() {
        return this.constructor.getService();
    }

    setErrorsToResult(result, e) {
        return this.constructor.setErrorsToResult(result, e);
    }
}
