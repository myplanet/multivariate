const Connector = require('./Connector');

class InMemoryConnector extends Connector {
    constructor() {
        super();
        this.map = {}
    }

    async get(type, key, field) {
        return this.map[key] && this.map[key][field];
    }

    async set(type, key, field, value) {
        this.map[key] = this.map[key] || {};
        this.map[key][field] = value;
    }

    async increment(type, key, field, amount = 1) {
        const value = await this.get(type, key, field) | 0;
        return await this.set(type, key, field, value + amount);
    }

    async save(type, key, map) {
        this.map[key] = Object.assign({}, (this.map[key] || {}), map);

        return this.map[key];
    }

    async load(type, key) {
        if (this.map[key]) return this.map[key];
        throw new Error(`'${key}' not found`);
    }

    async reset(type, key, ...fields) {
        const map = fields.reduce((map, field) => (map[field] = 0, map), {});

        return this.save(type, key, map);
    }

    async delete(type, key) {
        delete this.map[key];
    }
}

module.exports = InMemoryConnector;