/**
 * Pricing JS for Weaviate.io
 */

 var wcsPrice = function(embeddingSize, amountOfDataObjs, queriesPerMonth, resultsPerQuery, slaTier, highAvailability){
    var base = 0.05;
    var baseUnit = 1000000;
    var baseCur = 'USD';
    var maxAmountOfDataObjs = 250000000;
    var maxQueriesPerMonth = 500000000;
    var baseFloor = {
        'standard': 25,
        'enterprise': 135,
        'businessCritical': 450,
        'hybrid': 0
    }
    var baseMultiplier = {
        'standard': 1, // 100%
        'enterprise': 2, // 200%
        'businessCritical': 3.5, // 350%
        'hybrid': 0
    }
    var returnObj = {
        'error': false,
        'message': null,
        'priceInt': 0,
        'priceStr': "0.00",
        'dimensionsToBuy': 0
    }

    // calc price
    var storage = embeddingSize * amountOfDataObjs;
    var queries = embeddingSize * queriesPerMonth * resultsPerQuery;
    returnObj['dimensionsToBuy'] = storage + queries;

    // return contact sales if numbers are too high
    if(amountOfDataObjs > maxAmountOfDataObjs || queriesPerMonth > maxQueriesPerMonth){
        returnObj = {
            'error': true,
            'message': 'Contact sales',
        }
        return returnObj;
    }

    // SLA tier check
    switch(slaTier) {
        case 'standard':
            break;
        case 'enterprise':
            break;
        case 'businessCritical':
            break;
        case 'hybrid':
            returnObj['message'] = 'Contact sales';
            return returnObj;
        default:
            returnObj['error'] = true;
            returnObj['message'] = 'Unknown SLA type';
            return returnObj
    }

    // SLA tier mixin
    returnObj['priceInt'] = returnObj['priceInt'] * baseMultiplier[slaTier];

    // set price to floor price
    if(returnObj['dimensionsToBuy'] > returnObj['priceInt']){
        returnObj['priceInt'] = returnObj['dimensionsToBuy'];
    }

    // divide by baseUnit
    returnObj['priceInt'] = parseInt(returnObj['priceInt'] / baseUnit);

    // mixin HA
    if(highAvailability === true){
        returnObj['priceInt'] = returnObj['priceInt'] * 2;
    }

    // set float string before returning
    returnObj['priceStr'] = (Math.round(((returnObj['priceInt'] / 100) + Number.EPSILON) * 100) / 100).toFixed(2);

    // return
    return returnObj;
}