import * as ApiRole from '../ApiRole';
const Errors = require('qnode-beans').Errors;
import SwaggerHelper from './SwaggerHelper';
import ApiServer from '../ApiServer';
import Context from '../ctx/Context';


/**
 *
 */
export default class GetSwaggerAPI {

    public swaggerHelper:SwaggerHelper = null;
    public apiServer:ApiServer = null;
    

    init() {
        this.swaggerHelper = new SwaggerHelper();
        this.apiServer = new ApiServer();
    }


    check( ctx:Context, apiName:string ) {

        if( apiName ) {
            if( !this.apiServer.apiDefinitions[apiName] ) {
                return ctx.error( Errors.API_NOT_FOUND, apiName );
            }
        }

        ctx.ok();
    }

    exec( ctx:Context,
        apiName?:string/* required:false, description:'指定输出的API名字。未指定的话输出全部API' */,
        ignoreInternalApi=true /* required:false, type:'boolean', description:'是否忽略内部API，默认为true' */,
        ignoreGetSwaggerApi=true /* required:false, type:'boolean', description:'是否忽略GetSwagger API，默认为true' */,
        ignoreGetBlueprintApi=true /* required:false, type:'boolean', description:'是否忽略GetSwagger API，默认为true' */,
        ignoreNames?:string[] /* required:false, type:'array', items:{type:'string'}, description:'需忽略的API名字，默认无' */ ) {

        const options = this.swaggerHelper.buildOptions( ignoreInternalApi, ignoreGetSwaggerApi, ignoreGetBlueprintApi, ignoreNames );

        return this.swaggerHelper.root( this.apiServer, apiName, options );
    }

}

Object.assign( GetSwaggerAPI, {
    apiName:    'GetSwagger',
    role:       ApiRole.any,
    summary:    '获取swagger 2.0格式的接口文档',
    customizeJsonResponse:   true,
    result: {
        description: 'swagger 2.0格式的接口文档',
        schema: {
            type: 'string'
        }
    },
    validateResponse: false
} );

module.exports = GetSwaggerAPI;
