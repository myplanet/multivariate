[![Travis CI](https://img.shields.io/travis/myplanet/multivariate.svg)](https://travis-ci.org/myplanet/multivariate)
[![Coverage Status](https://img.shields.io/coveralls/myplanet/multivariate.svg)](https://coveralls.io/github/myplanet/multivariate?branch=master)
[![NPM Package](https://img.shields.io/npm/v/@myplanet/multivariate.svg)](https://www.npmjs.com/package/@myplanet/multivariate)

# multivariate

An multivariate testing (also called A/B testing) backend library with the aim of providing:

1. A stable multivarate test selection algorithm
2. A pluggable persistence connector layer for storing the multivariate test participation and completion events
3. A statistics calculator for a given multivariate test.

This library is *not* intended to be used client-side, but is instead meant to sit behind a thin HTTP API for serving multivariate test participation and completion calls.

The library comes with a Redis persistence connector out of the box for storing experiment data in a Redis database. Alternative persistence connectors can easily be written by implementing a simple interface.

## Installation

```
npm install --save @myplanet/multivariate
```

## Basic Usage

```js
const { Multivariate, RedisConnector } = require('@myplanet/multivariate');
const client = require('redis').createClient();
const connector = new RedisConnector(client);

// A unique id is needed to identify the client/user
// so that they are always shown the same alternative
const multivariate = new Multivariate(connector, {
    clientId: 'TEST_CLIENT_ID',
});

// Let's pick an alternative for this client and record the selection
multivariate.participate('experiment_name', 'control', 'alt_1', 'alt_2')
    .then(selectedAlternative => console.log(selectedAlternative));

// Later on, when the user has converted, call the complete method
// which will record a completion event for this user
multivariate.complete('experiment_name')
    .then(convertedAlternative => console.log(convertedAlternative));

// When you want to get some statistics for how the experiment is running
multivariate.getStatistics('experiment_name')
    .then(statistics => console.log(statistics));
```

## Methods

### new Multivariate(options)

The `Multivariate` constructor takes an `options` object that has the following fields:

- `clientId`: This field is used to uniquely identify the user/client for which the experiment is being run. If this identifier is not supplied, the library will generate an UUID and use it instead. This identifier should be persisted on the client-side and used for every request to the library to ensure follow-on calls are recorded properly. *Failure to do so will corrupt conversion data and other participation calls*.
- `userAgent`: You probably don't want to run any experimentation for bots, so you can supply the `userAgent` field to so that `Multivariate` can identify if the client is a bot and doesn't record any participation or conversion data for that client. The regular expression for matching bots is stored in `Multivariate.ROBOT_REGEX` and can be set to something else before calling the constructor.
- `ipAddress`: In certain cases, you might not want to run any experimentation for clients coming in from certain IP addresses. For example, you might want to exclude your office IP addresses from experimentation so as not to skew results. Supplying the IP address of the client allows the library to match against a list of ignored IP addresses (which is empty by default). The list can be populated by setting `Multivariate.IGNORED_IP_ADDRESSES` to an array of ignored IP address strings before calling the class constructor.

### Multivariate#participate(experimentName, ...alternativeNames)

The `participate` method looks up a stored experiment or creates one with the given alternatives, selects a variant for the client, records the selection event and returns a Promise for the selected alternative name. The first supplied alternative is used as the **control** and that alternative is served for clients that do not participate in the experiment. All statistical calculations measure how better (or worse) a given alternative behaves as compared to this control.

### Multivariate#complete(experimentName)

The `complete` method looks up a stored experiment (and fails if it can't find one), calculates the variant the client should have been served with, records a convertion event and returns a Promise for the alternative name (which should match the alternative name for participation if the `clientID` parameters are the same).

### Multivariate#getStatistics(experimentName)

Returns statistics for the experiment. The return value is an array of statistics for each alternative, sorted in the order of best to worst conversion rate. Each entry includes the following fields:

- `name`: Alternative name
- `participant`: Total number of participants who got this alternative
- `completed`: Total number of participants who converted with this alternative
- `conversionRate`: The ration of conversions to the number of participants for this alternative
- `zScore`: The number of standard deviations this alternative's conversion rate is from the conversion rate of the control.
- `confidenceLevel`: A percentage value that indicates how confidently the statistics imply that the deviation from the control is not a fluke but is the result of a real effect. The possible values are:
    - `null`: no change
    - `0`: no confidence
    - `90`: 90% confidence
    - `95`: 95% confidence
    - `99`: 99% confidence
    - `99.9`: 99.9% confidence
- `confidenceLevelString`: String representation (in English) of the `confidenceLevel` value.

### Multivariate#setWinner(experimentName, alternativeName)

Once you are satisfied that one of the variants is a winner, you might want the code to return variant that for all participants (until you remove the experiment code from the codebase). In this case, a call to this method with the experiment name and the desired winning alternative name ensures that all further `participate` calls are short-circuited to return the winner and all further `complete` methods become no-ops.

### Multivariate#getTotalParticipants(experimentName)

Returns the total number of participations recorded across all alternatives for this experiment.

### Multivariate#getTotalCompleted(experimentName)

Returns the total number of conversions recorded across all alternatives for this experiment.

### Multivariate#resetExperiment(experimentName)

Resets an experiment, clearing all records related to it completely.

## Persistence Connectors

The library comes with a default persistence connector for Redis which takes in a `node-redis` client instance for connecting to the database.

If your need to connect to a different persistence backend, you must extend from the `Connector` class and implement the following methods:

- `get(type: string, key: string, field: string): Promise<any>`
- `set(type: string, key: string, field: string, value: any): Promise<undefined>`
- `increment(type: string, key: string, field: string, amount = 1: int): Promise<undefined>`
- `save(type: string, key: string, map: object): Promise<any>`
- `load(type: string, key: string): Promise<object>`
- `reset(type: string, key: string, ...fields: string[]): Promise<undefined>`
- `delete(type, key): Promise<undefined>`

where `type` will be of:

- `Connector.TYPE_EXPERIMENT`
- `Connector.TYPE_ALTERNATIVE`