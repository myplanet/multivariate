const Connector = require('./Connector');

class FirebaseConnector extends Connector {
    constructor(firebaseClient, rootRef) {
        super();
        this.firebaseClient = firebaseClient;
        this.rootRef = rootRef;
    }

    getReference(key, field) {
        const path = field ? `${key}/${field}` : `${key}`;
        return this.firebaseClient.ref(this.rootRef).child(path);
    }

    async get(type, key, field) {
        const experimentsStatsRef = this.getReference(key, field);
        return experimentsStatsRef.once('value')
            .then(dataSnapshot => {
                return dataSnapshot.val();
            });
    }

    async set(type, key, field, value) {
        return value
            ? this.getReference(key).update({ [field]: value })
            : this.getReference(key, field).remove();
    }

    async increment(type, key, field, amount = 1) {
        const experimentsStatsRef = this.getReference(key);
        const childRef = experimentsStatsRef.child(field);
        const child = await childRef.once('value');
        if (child.val) {
            const currentVal = child.val();
            return experimentsStatsRef.update({ [field]: currentVal + amount });
        } else {
            return this.save(type, key, { [field]: amount });
        }

    }

    async save(type, key, saveData) {
        return this.getReference(key).set(saveData);
    }

    async load(type, key) {
        const experimentsStatsRef = this.getReference(key);
        return experimentsStatsRef.once('value')
            .then(dataSnapshot => {
                return dataSnapshot.val();
            });
    }

    async reset(type, key, ...fields) {
        const saveData = fields.reduce((res, el) => res[field] = 0, {});
        return this.getReference(key).set(saveData);
    }

    async delete(type, key) {
        return this.getReference(key).remove();
    }
}

module.exports = FirebaseConnector;
