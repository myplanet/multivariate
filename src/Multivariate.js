const uuid = require('uuid');

const Experiment = require('./model/Experiment');
const RedisConnector = require('./connector/RedisConnector');

class Multivariate {
    constructor(connector, { clientId = uuid.v4(), ipAddress = null, userAgent = null } = {}) {
        this.connector = connector;
        this.clientId = clientId;
        this.userAgent = userAgent;
        this.ipAddress = ipAddress;
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

        const alternative = await experiment.randomAlternative(this.clientId);

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

        const alternative = experiment.randomAlternative(this.clientId);

        await alternative.incrementCompletion();

        return alternative.name;
    }

    async setWinner(experimentName, winnerName) {
        const experiment = await Experiment.find(this.connector, experimentName);
        experiment.winner = winnerName;
    }

    async getStatistics(experimentName) {
        const experiment = await Experiment.find(this.connector, experimentName);

        const results = await Promise.all(experiment.alternatives.map(async alt => ({
            name: alt.name,
            participant: await alt.participantCount,
            completed: await alt.completedCount,
            conversionRate: await alt.conversionRate,
            zScore: await alt.zScore,
            confidenceLevel: await alt.confidenceLevel,
            confidenceLevelString: await alt.confidenceLevelString
        })));

        return results.sort((a, b) => b.zScore - a.zScore);
    }

    async getTotalCompleted(experimentName) {
        const experiment = await Experiment.find(this.connector, experimentName);

        return experiment.totalCompleted;
    }

    async getTotalParticipants(experimentName) {
        const experiment = await Experiment.find(this.connector, experimentName);

        return experiment.totalParticipants;
    }

    async resetExperiment(experimentName) {
        const experiment = await Experiment.find(this.connector, experimentName);

        await experiment.reset();
    }

    get _isVisitorExcluded() {
        return this._isRobot || this._isIgnoredIpAddress;
    }

    get _isRobot() {
        return !!(this.userAgent && Multivariate.ROBOT_REGEX.test(this.userAgent));
    }

    get _isIgnoredIpAddress() {
        return !!(this.ipAddress && Multivariate.IGNORED_IP_ADDRESSES.indexOf(this.ipAddress) !== -1);
    }
}

Multivariate.IGNORED_IP_ADDRESSES = [];
Multivariate.ROBOT_REGEX = /$^|trivial|facebook|MetaURI|butterfly|google|amazon|goldfire|sleuth|xenu|msnbot|SiteUptime|Slurp|WordPress|ZIBB|ZyBorg|pingdom|bot|yahoo|slurp|java|fetch|spider|url|crawl|oneriot|abby|commentreader|twiceler/i;

module.exports = Multivariate;