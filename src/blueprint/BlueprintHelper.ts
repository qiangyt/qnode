const fury = require('fury');
fury.use(require('fury-adapter-apib-serializer'));
fury.use(require('fury-adapter-swagger'));

import SwaggerHelper from '../swagger/SwaggerHelper';

//hint: use MWeb Lite to view blueprint

/**
 *
 */
export default class BlueprintHelper {

    public swaggerHelper:SwaggerHelper = null;


    init() {
        this.swaggerHelper = new SwaggerHelper();
    }

    
    normalizeOptions( options:any ) {
        options = options || {};
        options.furyValidator = true;
        return options;
    }

    /**
     * 
     */
    output( server:any, apiName:string, options:any, callback:Function ) {
        options = this.normalizeOptions(options);

        const swagger = this.swaggerHelper.root( server, apiName, options );
        const swaggerJson = JSON.stringify(swagger);

        fury.parse( {source: swaggerJson}, function (err:any, response:any) {
            if (err) return callback( err, null );

            fury.serialize( {api: response.api}, function (err:any, blueprint:any) {
                if (err) return callback( err, null );
                callback( null, blueprint );
            } );
        });
    }

}
