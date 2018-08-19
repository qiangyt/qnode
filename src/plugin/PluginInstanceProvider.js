'use strict';

const MongooseProvider = require('../graphql/MongooseProvider');
const PluginInstanceTypeFactory = require('./PluginInstanceTypeFactory');


module.exports = class PluginInstanceProvider extends MongooseProvider {

    constructor() {
        super();
        this.$id = 'PluginInstanceProvider';
    }


    typeFactory() {
        return new PluginInstanceTypeFactory(this);
    }

}

