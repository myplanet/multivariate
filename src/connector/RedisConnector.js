const promisify = require('es6-promisify');

const promisifyAll = (obj, ...keys) =>
    keys.reduce((obj, key) => (obj[key + 'Async'] = promisify(obj[key], obj), obj), obj);

class RedisConnector {
    constructor(redisClient) {
        this.redisClient = promisifyAll(redisClient,
            'hget', 'hset', 'hdel', 'hgetall', 'hmset', 'hincrby', 'del'
        );
    }

    async get(obj, field) {
        return this.redisClient.hgetAsync(obj.key, field);
    }

    async set(obj, field, value) {
        return value 
            ? this.redisClient.hsetAsync(obj.key, field, value) 
            : this.redisClient.hdelAsync(obj.key, field);
    }

    async increment(obj, field, amount = 1) {
        return this.redisClient.hincrbyAsync(obj.key, field, amount);
    }

    async save(obj, map) {
        let saveData = [];
        for (var key in map) {
            if (map.hasOwnProperty(key)) {
                var value = map[key];
                saveData.push(key, value);
            }
        }
        return this.redisClient.hmsetAsync(obj.key, saveData);    
    }

    async load(key) {
        return this.redisClient.hgetallAsync(key);
    }

    async reset(obj, ...fields) {
        const saveData = fields.map(field => [field, 0]).reduce((res, el) => res.concat(el));

        return this.redisClient.hmsetAsync(obj.key, saveData);
    }

    async delete(obj) {
        return this.redisClient.delAsync(obj.key);
    }
}

module.exports = RedisConnector;