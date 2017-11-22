const promisify = require('es6-promisify');
const Connector = require('./Connector');

const promisifyAll = (obj, ...keys) =>
    keys.reduce((obj, key) => (obj[key + 'Async'] = promisify(obj[key], obj), obj), obj);

class RedisConnector extends Connector {
    constructor(redisClient) {
        super();
        this.redisClient = promisifyAll(redisClient,
            'hget', 'hset', 'hdel', 'hgetall', 'hmset', 'hincrby', 'del'
        );
    }

    async get(type, key, field) {
        return this.redisClient.hgetAsync(key, field);
    }

    async set(type, key, field, value) {
        return value
            ? this.redisClient.hsetAsync(key, field, value)
            : this.redisClient.hdelAsync(key, field);
    }

    async increment(type, key, field, amount = 1) {
        return this.redisClient.hincrbyAsync(key, field, amount);
    }

    async save(type, key, map) {
        let saveData = [];
        for (let field in map) {
            if (map.hasOwnProperty(field)) {
                saveData.push(field, map[field]);
            }
        }
        return this.redisClient.hmsetAsync(key, saveData);
    }

    async load(type, key) {
        return this.redisClient.hgetallAsync(key);
    }

    async reset(type, key, ...fields) {
        const saveData = fields.map(field => [field, 0]).reduce((res, el) => res.concat(el));

        return this.redisClient.hmsetAsync(key, saveData);
    }

    async delete(type, key) {
        return this.redisClient.delAsync(key);
    }
}

module.exports = RedisConnector;