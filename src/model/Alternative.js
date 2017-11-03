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

    get participantCount() {
        return (async () =>
            parseInt(await this.connector.get(this, PARTICIPANT_COUNT_KEY) || 0)
        )();
    }

    set participantCount(count) {
        (async () =>
            await this.connector.set(this, PARTICIPANT_COUNT_KEY, count)
        )();
    }

    get completedCount() {
        return (async () =>
            parseInt(await this.connector.get(this, COMPLETED_COUNT_KEY) || 0)
        )();
    }

    set completedCount(count) {
        (async () =>
            await this.connector.set(this, COMPLETED_COUNT_KEY, count)
        )();
    }

    async incrementParticipation() {
        return this.connector.increment(this, PARTICIPANT_COUNT_KEY);
    }

    async incrementCompletion() {
        return this.connector.increment(this, COMPLETED_COUNT_KEY);
    }

    get isControl() {
        return this.experiment.control.name === this.name;
    }

    get conversionRate() {
        return (async () =>
            await this.participantCount === 0
            ? 0
            : await this.completedCount / await this.participantCount
        )();
    }

    async delete() {
        return this.connector.delete(this);
    }

    get zScore() {
        return (async () => {
            const control = this.experiment.control;

            if (this.isControl) {
                return 0;
            }

            const partCountAlternative = await this.participantCount;
            const partCountControl = await control.participantCount;

            if (partCountAlternative === 0 || partCountControl === 0) {
                return 0;
            }

            const convRateAlternative = await this.conversionRate;
            const convRateControl = await control.conversionRate;

            const mean = convRateAlternative - convRateControl;
            const varianceOfAlternative = convRateAlternative * (1 - convRateAlternative) / partCountAlternative;
            const varianceOfControl = convRateControl * (1 - convRateControl) / partCountControl;

            if (varianceOfAlternative + varianceOfControl === 0) {
                return 0;
            }

            return mean / Math.sqrt(varianceOfAlternative + varianceOfControl);
        })();
    }

    get confidenceLevel() {
        return (async () => {
            const z = await this.zScore;

            if (z === null) {
                return NaN;
            }

            const zAbs = Math.abs(z);

            return Z_SCORE_CONFIDENCE_PERCENT_LEVELS.map(
                    ([limit, confidencePercent])=>
                        (z <= limit) ? confidencePercent : undefined
                ).filter(x => x !== undefined)[0];
        })();
    }

    get confidenceLevelString() {
        return (async () => {
            const confidenceLevel = await this.confidenceLevel;

            return confidenceLevel === null
                ? 'no change'
                : isNaN(confidenceLevel)
                    ? 'N/A'
                    :confidenceLevel === 0
                        ? 'no confidence'
                        : `${confidenceLevel}% confidence`;
        })();
    }
}

module.exports = Alternative;