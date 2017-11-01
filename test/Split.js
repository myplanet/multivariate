const Split = require('../src/Split');
const InMemoryConnector = require('../src/connector/InMemoryConnector');

const TEST_CLIENT_ID = 'TEST_CLIENT_ID';
const EXPERIMENT_NAME = 'TEST_EXPERIMENT';
const CONTROL = 'CONTROL';
const ALT_1 = 'ALT_1';
const ALT_2 = 'ALT_2';
const ALTERNATIVE_NAMES = [CONTROL, ALT_1, ALT_2];

describe('Split', () => {
    let connector = null;

    beforeEach(() => {
        connector = new InMemoryConnector();
    });

    it('generates a clientId', async () => {
        const split = new Split(connector);
        var alternativeName = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);

        expect(alternativeName).toBeDefined();
    });

    it('picks the same alternative for participate and complete', async () => {
        const split = new Split(connector, {
            clientId: TEST_CLIENT_ID
        });
    
        const alternativeName = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);
        const alternativeNameCompletion = await split.complete(EXPERIMENT_NAME);

        expect(alternativeNameCompletion).toEqual(alternativeName);
    });

    it('always returns the control for bots', async () => {
        const split = new Split(connector, {
            clientId: TEST_CLIENT_ID,
            userAgent: 'googlebot'
        });
    
        const alternativeName = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);
        const alternativeNameCompletion = await split.complete(EXPERIMENT_NAME);
        
        expect(alternativeName).toEqual(CONTROL);
        expect(alternativeNameCompletion).toBeUndefined();
    });

    it('always returns the control for ignored IP addresses', async () => {
        Split.IGNORED_IP_ADDRESSES = [ '1.1.1.1' ];

        const split = new Split(connector, {
            clientId: TEST_CLIENT_ID,
            ipAddress: '1.1.1.1'
        });
    
        const alternativeName = await split.participate(EXPERIMENT_NAME, ...ALTERNATIVE_NAMES);
        const alternativeNameCompletion = await split.complete(EXPERIMENT_NAME);

        expect(alternativeName).toEqual(CONTROL);
        expect(alternativeNameCompletion).toBeUndefined();
    });

    it('returns the winner if defined', async () => {
        const split = new Split(connector, {
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

})