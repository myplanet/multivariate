const Multivariate = require('../src/Multivariate');
const InMemoryConnector = require('../src/connector/InMemoryConnector');

const TEST_CLIENT_ID = 'TEST_CLIENT_ID';
const EXPERIMENT_NAME = 'TEST_EXPERIMENT';
const CONTROL = 'CONTROL';
const ALT_1 = 'ALT_1';
const ALT_2 = 'ALT_2';
const ALTERNATIVE_NAMES = [CONTROL, ALT_1, ALT_2];

describe('Multivariate', () => {
    let connector = null;

    beforeEach(() => {
        connector = new InMemoryConnector();
    });

    it('generates a clientId', async () => {
        const split = new Multivariate(connector);
        var alternativeName = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);

        expect(alternativeName).toBeDefined();
    });

    it('picks the same alternative for participate and complete', async () => {
        const split = new Multivariate(connector, {
            clientId: TEST_CLIENT_ID
        });

        const alternativeName = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);
        const alternativeNameCompletion = await split.complete(EXPERIMENT_NAME);

        expect(alternativeNameCompletion).toEqual(alternativeName);
    });

    it('always returns the control for bots', async () => {
        const split = new Multivariate(connector, {
            clientId: TEST_CLIENT_ID,
            userAgent: 'googlebot'
        });

        const alternativeName = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);
        const alternativeNameCompletion = await split.complete(EXPERIMENT_NAME);

        expect(alternativeName).toEqual(CONTROL);
        expect(alternativeNameCompletion).toBeUndefined();
    });

    it('always returns the control for ignored IP addresses', async () => {
        Multivariate.IGNORED_IP_ADDRESSES = [ '1.1.1.1' ];

        const split = new Multivariate(connector, {
            clientId: TEST_CLIENT_ID,
            ipAddress: '1.1.1.1'
        });

        const alternativeName = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);
        const alternativeNameCompletion = await split.complete(EXPERIMENT_NAME);

        expect(alternativeName).toEqual(CONTROL);
        expect(alternativeNameCompletion).toBeUndefined();
    });

    it('returns the winner if defined', async () => {
        const split = new Multivariate(connector, {
            clientId: TEST_CLIENT_ID  // generates alternative ALT_1
        });

        // first get a normal alternative
        const initialAlternativeName = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);
        // set the winner as ALT_2
        await split.setWinner(EXPERIMENT_NAME, ALT_2);
        // get another alternative
        const alternativeName = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);
        // now mark completion
        const alternativeNameCompletion = await split.complete(EXPERIMENT_NAME);

        expect(initialAlternativeName).not.toEqual(ALT_2);
        expect(alternativeName).toEqual(ALT_2);
        expect(alternativeNameCompletion).toBeUndefined();
    });

    it('returns proper statistics', async () => {
        let split = null;

        for (let i = 0; i < 10000; i++) {
            split = new Multivariate(connector);

            const alternative = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);

            // always record conversion for ALT_2 so that it wins
            // record conversion for other only 10% of the time
            const conversionCutoff = alternative === ALT_2 ? 1 : 0.1;

            if (Math.random() < conversionCutoff) {
                await split.complete(EXPERIMENT_NAME);
            }
        }

        const statistics = await split.getStatistics(EXPERIMENT_NAME);

        expect(statistics).toHaveLength(3);
        expect(statistics[0]).toMatchObject({
            name: ALT_2,
            conversionRate: 1,
            confidenceLevel: 99.9
        });

        const totalCompleted = await split.getTotalCompleted(EXPERIMENT_NAME);
        const totalParticipants = await split.getTotalParticipants(EXPERIMENT_NAME);

        expect(statistics.reduce((sum, s) => sum += s.completed, 0)).toEqual(totalCompleted);
        expect(statistics.reduce((sum, s) => sum += s.participant, 0)).toEqual(totalParticipants);
    });

    it('properly cleans up Experiment with reset', async () => {
        let split = null;

        for (let i = 0; i < 10000; i++) {
            split = new Multivariate(connector);

            const alternative = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);

            // always record conversion for ALT_2 so that it wins
            // record conversion for other only 10% of the time
            const conversionCutoff = alternative === ALT_2 ? 1 : 0.1;

            if (Math.random() < conversionCutoff) {
                await split.complete(EXPERIMENT_NAME);
            }
        }

        const statistics = await split.getStatistics(EXPERIMENT_NAME);

        expect(statistics).toHaveLength(3);
        expect(statistics[0]).toMatchObject({
            name: ALT_2,
            conversionRate: 1,
            confidenceLevel: 99.9
        });

        await split.resetExperiment(EXPERIMENT_NAME);

        // Ensure stats are reset
        const statsAfterReset = await split.getStatistics(EXPERIMENT_NAME);

        expect(statsAfterReset).toHaveLength(3);
        expect(statsAfterReset).toMatchObject([{
            name: CONTROL,
            conversionRate: 0,
            confidenceLevel: null
        }, {
            name: ALT_1,
            conversionRate: 0,
            confidenceLevel: null
        }, {
            name: ALT_2,
            conversionRate: 0,
            confidenceLevel: null
        }]);
    })
})