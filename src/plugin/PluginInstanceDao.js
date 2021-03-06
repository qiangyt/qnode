'use strict';

const GraphQLMongooseDao = require('../graphql/GraphQLMongooseDao');


/* eslint global-require:'off' */


module.exports = class PluginInstanceDao extends GraphQLMongooseDao {

    
    constructor() {
        super('PluginInstance');
        this.$id = 'PluginInstanceDao';
    }


    /** @override */
    _resolveInstance() {
        const r = super._resolveInstance();

        const schema = require('./PluginInstance.mongoose');
        r.importSchema( schema, 'PluginInstance' );

        return r;
    }

}

