const Alternative = require('./Alternative');

const WINNER_NAME_KEY = 'winner_name';
const EXPERIMENT_START_TIME_KEY = 'experiment_start_time';
const ALTERNATIVE_NAMES_KEY = 'alternative_names';

class Experiment {
    constructor(connector, name, ...alternative_names) {
        this.connector = connector;
        this.name = name;
        this.key = this.name;
        this.alternatives = alternative_names.map((alternative_name) => 
            new Alternative(connector, alternative_name, this)
        )
    }

    get control() {
        return this.alternatives[0];
    }

    get winner() {
        const winner_name = this.connector.get(this, WINNER_NAME_KEY);
        return winner_name && new Alternative(this.connector, winner_name, this);
    }

    set winner(winner_name) {
        this.connector.set(this, WINNER_NAME_KEY, winner_name);
    }

    reset_winner() {
        this.winner = null;
    }

    get start_time() {
        const t = this.connector.get(this, EXPERIMENT_START_TIME_KEY);
        return t && new Date(parseInt(t));
    }

    get total_participants() {
        return (async () => 
            await this.alternatives.reduce(async (sum, alt) => Promise.resolve(await sum + await alt.participant_count), Promise.resolve(0))
        )();
    }

    get total_completed() {
        return (async () => 
            await this.alternatives.reduce(async (sum, alt) => Promise.resolve(await sum + await alt.completed_count), Promise.resolve(0))
        )();
    }

    get total_weight() {
        return this.alternatives.reduce((sum, alt) => sum += alt.weight, 0);
    }

    get alternative_names() {
        return this.alternatives.map(alt => alt.name);
    }

    next_alternative() {
        return this.winner || this.random_alternative();
    }

    random_alternative() {
        const total_weight = this.total_weight;

        let point = total_weight * Math.random();

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
            [ALTERNATIVE_NAMES_KEY]: this.alternative_names.join('|')
        });
    }

    async reset() {
        for (let alt of this.alternatives) {
            await alt.delete();
        }
        this.reset_winner();
    }

    static async find(connector, name) {
        const data = await connector.load(name);
        return new Experiment(connector, name, ...data[ALTERNATIVE_NAMES_KEY].split('|')); 
    }

    static async find_or_create(connector, name, ...alternative_names) {
        try {
            return await Experiment.find(connector, name);
        } catch (err) {
            const experiment = new Experiment(connector, name, ...alternative_names);
            await experiment.save();
            return experiment;
        }
    }

}

module.exports = Experiment;