import * as ApiRole from '../ApiRole';
const Errors = require('qnode-beans').Errors;
import * as marked from 'marked';
import ApiServer from '../ApiServer';
import SwaggerHelper from '../swagger/SwaggerHelper';
import BlueprintHelper from './BlueprintHelper';
import Context from '../ctx/Context';

//hint: use MWeb Lite to view blueprint

/**
 *
 */
export default class GetBlueprintAPI {

    public apiServer:ApiServer = null;
    public swaggerHelper:SwaggerHelper = null;
    public blueprintHelper:BlueprintHelper = null;


    init() {
        this.apiServer = new ApiServer();
        this.swaggerHelper = new SwaggerHelper();
        this.blueprintHelper = new BlueprintHelper();
    }

    
    check( ctx:Context, apiName:string /* required:false */ ) {
        if( apiName ) {
            if( !this.apiServer.apiDefinitions[apiName] ) {
                return ctx.error( Errors.API_NOT_FOUND, apiName );
            }
        }

        ctx.ok();
    }

    exec( ctx:Context, 
        apiName:string /* required:false */, 
        html:boolean /* type:'boolean', required:false, description:'true:输出html' */,
        ignoreInternalApi:boolean /* required:false, type:'boolean', description:'是否忽略内部API，默认为true' */,
        ignoreGetSwaggerApi:boolean /* required:false, type:'boolean', description:'是否忽略GetSwagger API，默认为true' */,
        ignoreGetBlueprintApi:boolean /* required:false, type:'boolean', description:'是否忽略GetSwagger API，默认为true' */,
        ignoreNames:string[] /* required:false, type:'array', items:{type:'string'}, description:'需忽略的API名字，默认无' */ ) {
        
        const options = this.swaggerHelper.buildOptions( ignoreInternalApi, ignoreGetSwaggerApi, ignoreGetBlueprintApi, ignoreNames );

        this.blueprintHelper.output( this.apiServer, apiName, options, function(err:any, blueprint:any) {
            if( err ) return ctx.error( err );

            if( !html ) return ctx.ok(blueprint);

            ctx.produce = 'text/html';
            return ctx.ok(marked(blueprint));
        } );
    }

}

Object.assign( GetBlueprintAPI, {
    apiName:   'GetBlueprint',
    role:       ApiRole.any,
    summary:    '获取blueprint格式的接口文档',
    produce:    'text/markdown',
    charset:    'utf-8',
    result: { 
        description: 'blueprint格式的接口文档',
        schema: {
            type: 'string'
        }
    }
} );


module.exports = GetBlueprintAPI;
