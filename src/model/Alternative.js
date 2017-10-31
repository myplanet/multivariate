const Z_SCORE_CONFIDENCE_PERCENT_LEVELS = [
    [0,                        null],
    [1.64,                     0   ],
    [1.96,                     90  ],
    [2.57,                     95  ],
    [3.29,                     99  ],
    [Number.POSITIVE_INFINITY, 99.9]
];

const PARTICIPANT_COUNT_KEY = 'participant_count';
const COMPLETED_COUNT_KEY = 'completed_count';

class Alternative {
    constructor(connector, name, experiment) {
        this.connector = connector;
        this.experiment = experiment;
        if (Array.isArray(name)) {
            [this.name, this.weight] = name 
        } else {
            this.name = name;
            this.weight = 1;
        }
        this.key = `${experiment.name}:${this.name}`
    }

    get participant_count() {
        return (async () => 
            parseInt(await this.connector.get(this, PARTICIPANT_COUNT_KEY) || 0)
        )();
    }

    set participant_count(count) {
        (async () => 
            await this.connector.set(this, PARTICIPANT_COUNT_KEY, count)
        )();
    }

    get completed_count() {
        return (async () => 
            parseInt(await this.connector.get(this, COMPLETED_COUNT_KEY) || 0)
        )();
    }

    set completed_count(count) {
        (async () => 
            await this.connector.set(this, COMPLETED_COUNT_KEY, count)
        )();
    }

    async increment_participation() {
        return this.connector.increment(this, PARTICIPANT_COUNT_KEY);
    }

    async increment_completion() {
        return this.connector.increment(this, COMPLETED_COUNT_KEY);
    }

    get is_control() {
        return this.experiment.control.name === this.name;
    }

    get conversion_rate() {
        return (async () => 
            await this.participant_count === 0 
            ? 0 
            : await this.completed_count / await this.participant_count
        )();
    }

    async delete() {
        return this.connector.delete(this);
    }

    get z_score() {
        return (async () => {
            const control = this.experiment.control;

            if (this.is_control) {
                return null;
            }

            const part_count_alternative = await this.participant_count;
            const part_count_control = await control.participant_count;

            if (part_count_alternative === 0 || part_count_control === 0) {
                return null;
            }

            const conv_rate_alternative = await this.conversion_rate;
            const conv_rate_control = await control.conversion_rate;

            const mean = conv_rate_alternative - conv_rate_control;
            const variance_of_alternative = conv_rate_alternative * (1 - conv_rate_alternative) / part_count_alternative;
            const variance_of_control = conv_rate_control * (1 - conv_rate_control) / part_count_control;

            if (variance_of_alternative + variance_of_control === 0) {
                return null;
            }

            return mean / Math.sqrt(variance_of_alternative + variance_of_control);
        })();
    }

    get confidence_level() {
        return (async () => {
            const z = await this.z_score;

            if (z === null) {
                return NaN;
            }

            const z_abs = Math.abs(z);

            return Z_SCORE_CONFIDENCE_PERCENT_LEVELS.map(
                    ([limit, confidence_percent])=> 
                        (z <= limit) ? confidence_percent : undefined
                ).filter(x => x !== undefined)[0];
        })();
    }

    get confidence_level_string() {
        return (async () => {
            const confidence_level = await this.confidence_level;

            return confidence_level === null 
                ? 'no change'
                : isNaN(confidence_level)
                    ? 'N/A' 
                    :confidence_level === 0
                        ? 'no confidence'
                        : `${confidence_level}% confidence`;
        })();
    }
}

module.exports = Alternative;