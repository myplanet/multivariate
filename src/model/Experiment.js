const Alternative = require('./Alternative');

const WINNER_NAME_KEY = 'winner_name';
const EXPERIMENT_START_TIME_KEY = 'experiment_start_time';
const ALTERNATIVE_NAMES_KEY = 'alternative_names';

class Experiment {
    constructor(connector, name, ...alternativeNames) {
        this.connector = connector;
        this.name = name;
        this.key = this.name;
        this.alternatives = alternativeNames.map((alternativeName) =>
            new Alternative(connector, alternativeName, this)
        )
    }

    get control() {
        return this.alternatives[0];
    }

    get winner() {
        return (async () => {
            const winnerName = await this.connector.get(this, WINNER_NAME_KEY);
            return winnerName && new Alternative(this.connector, winnerName, this);
        })();
    }

    set winner(winnerName) {
        this.connector.set(this, WINNER_NAME_KEY, winnerName);
    }

    resetWinner() {
        this.winner = null;
    }

    get startTime() {
        const t = this.connector.get(this, EXPERIMENT_START_TIME_KEY);
        return t && new Date(parseInt(t));
    }

    get totalParticipants() {
        return (async () => 
            await this.alternatives.reduce(async (sum, alt) => Promise.resolve(await sum + await alt.participantCount), Promise.resolve(0))
        )();
    }

    get totalCompleted() {
        return (async () => 
            await this.alternatives.reduce(async (sum, alt) => Promise.resolve(await sum + await alt.completedCount), Promise.resolve(0))
        )();
    }

    get totalWeight() {
        return this.alternatives.reduce((sum, alt) => sum += alt.weight, 0);
    }

    get alternativeNames() {
        return this.alternatives.map(alt => alt.name);
    }

    async nextAlternative(clientId) {
        return await this.winner || this.randomAlternative(clientId);
    }

    randomAlternative(clientId) {
        const totalWeight = this.totalWeight;

        // @todo use clientId for randomness
        let point = totalWeight * Math.random();

        for (const alternative of this.alternatives) {
            point -= alternative.weight;
            if (point <= 0) {
                return alternative;
            }            
        }
    }

    async save() {
        this.connector.save(this, {
            [EXPERIMENT_START_TIME_KEY]: new Date().getTime(),
            [ALTERNATIVE_NAMES_KEY]: this.alternativeNames.join('|')
        });
    }

    async reset() {
        for (let alt of this.alternatives) {
            await alt.delete();
        }
        this.resetWinner();
    }

    static async find(connector, name) {
        const data = await connector.load(name);
        return new Experiment(connector, name, ...data[ALTERNATIVE_NAMES_KEY].split('|')); 
    }

    static async findOrCreate(connector, name, ...alternativeNames) {
        try {
            return await Experiment.find(connector, name);
        } catch (err) {
            const experiment = new Experiment(connector, name, ...alternativeNames);
            await experiment.save();
            return experiment;
        }
    }

}

module.exports = Experiment;