const Multivariate = require('./Multivariate');
const Connector = require('./connector/Connector');
const RedisConnector = require('./connector/RedisConnector');

module.exports = {
    Multivariate: Multivariate,
    Connector: Connector,
    RedisConnector: RedisConnector
}