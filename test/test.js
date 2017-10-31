const RC = require('../src/connector/RedisConnector');
const Experiment = require('../src/model/Experiment');
const redis = require('redis');
const client = redis.createClient();

const connector = new RC(client);

(async () => {
    const exp = await Experiment.find_or_create(connector, 'test3', 'hede', 'hodo', 'mede', 'modo', 'sodo');

    // await exp.reset();

    const loop_count = Math.trunc(Math.random() * 100);

    for (let i = 0; i < loop_count; i++) {
        const alternative = exp.random_alternative();
        const part_count = Math.trunc(Math.random() * 1000);
        const comp_count = Math.trunc(Math.random() * part_count * 0.3);
        for (let p = 0; p < part_count; p++) {
            await alternative.increment_participation();        
        }
        for (let p = 0; p < comp_count; p++) {
            await alternative.increment_completion();        
        }
    }

    console.log(`Experiment ${exp.name} - participated: ${await exp.total_participants}, completed: ${await exp.total_completed}`);

    for (var alt of exp.alternatives) {
        console.log(`
    Alternative: ${alt.name}
        is control: ${alt.is_control}
        part count: ${ await alt.participant_count }
        comp count: ${ await alt.completed_count }
        conv rate: ${ (await alt.conversion_rate * 100).toFixed(2) }%
        confidence level: ${await alt.confidence_level_string}
        `);
    }

    client.quit();
})();

