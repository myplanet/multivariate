const Multivariate = require('./Multivariate');
const Connector = require('./connector/Connector');
const RedisConnector = require('./connector/RedisConnector');
const FirebaseConnector = require('./connector/FirebaseConnector');

module.exports = {
    Multivariate: Multivariate,
    Connector: Connector,
    RedisConnector: RedisConnector,
    FirebaseConnector: FirebaseConnector
}