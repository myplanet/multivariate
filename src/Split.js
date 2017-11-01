const uuid = require('uuid');

const Experiment = require('./model/Experiment');
const RedisConnector = require('./connector/RedisConnector');

class Split {
    constructor(connector, config = {}) {
        this.connector = connector;
        this.config = config;
        this.config.clientId = this.config.clientId || uuid.v4();
    }

    async participate(experimentName, ...alternativeNames) {
        const experiment = await Experiment.findOrCreate(this.connector, experimentName, ...alternativeNames);

        if (this._isVisitorExcluded) {
            return experiment.control.name;           
        }

        const winner = await experiment.winner;

        if (winner) {
            return winner.name;
        }
        
        const alternative = await experiment.randomAlternative(this.config.clientId);

        await alternative.incrementParticipation();

        return alternative.name;
    }

    async complete(experimentName) {
        if (this._isVisitorExcluded) {
            return;
        }

        const experiment = await Experiment.find(this.connector, experimentName);
        const winner = await experiment.winner;

        if (winner) {
            return;
        }

        const alternative = experiment.randomAlternative(this.config.clientId);

        await alternative.incrementCompletion();

        return alternative.name;
    }

    async setWinner(experimentName, winnerName) {
        const experiment = await Experiment.find(this.connector, experimentName);
        experiment.winner = winnerName;
    }

    get _isVisitorExcluded() {
        return this._isRobot || this._isIgnoredIpAddress;
    }

    get _isRobot() {
        return !!(this.config.userAgent && Split.ROBOT_REGEX.test(this.config.userAgent));
    }

    get _isIgnoredIpAddress() {
        return !!(this.config.ipAddress && Split.IGNORED_IP_ADDRESSES.indexOf(this.config.ipAddress) !== -1);
    }
}

Split.IGNORED_IP_ADDRESSES = [];
Split.ROBOT_REGEX = /$^|trivial|facebook|MetaURI|butterfly|google|amazon|goldfire|sleuth|xenu|msnbot|SiteUptime|Slurp|WordPress|ZIBB|ZyBorg|pingdom|bot|yahoo|slurp|java|fetch|spider|url|crawl|oneriot|abby|commentreader|twiceler/i;

module.exports = Split;