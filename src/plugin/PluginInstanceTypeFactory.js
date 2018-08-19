'use strict';

const MongooseTypeFactory = require('../graphql/MongooseTypeFactory');


module.exports = class PluginInstanceTypeFactory extends MongooseTypeFactory {

    constructor( provider ) {
        super(provider);
        this.$id = 'PluginInstanceTypeFactory';
    }

}
