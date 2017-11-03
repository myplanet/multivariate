
class InMemoryConnector {
    constructor() {
        this.map = {}
    }

    async get(obj, field) {
        return this.map[obj.key] && this.map[obj.key][field];
    }

    async set(obj, field, value) {
        this.map[obj.key] = this.map[obj.key] || {};
        this.map[obj.key][field] = value;
    }

    async increment(obj, field, amount = 1) {
        const value = await this.get(obj, field) | 0;
        return await this.set(obj, field, value + amount);
    }

    async save(obj, map) {
        this.map[obj.key] = Object.assign({}, (this.map[obj.key] || {}), map);

        return this.map[obj.key];
    }

    async load(key) {
        if (this.map[key]) return this.map[key];
        throw new Error(`'${key}' not found`);
    }

    async reset(obj, ...fields) {
        const map = fields.reduce((map, field) => (map[field] = 0, map), {});

        return this.save(obj, map);
    }

    async delete(obj) {
        delete this.map[obj.key];
    }
}

module.exports = InMemoryConnector;