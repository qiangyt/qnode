import * as Fs from 'fs';
const Path = require('path');
import ApiDefinition from './ApiDefinition';
import * as Restify from 'restify';
const RestifyAny = <any>(Restify);
import ServerContext from './ctx/ServerContext';
import * as ApiRole from './ApiRole';
import * as Log from 'qnode-beans/dist/Logger';
import Bean from 'qnode-beans/dist/Bean';
const Errors = require('qnode-beans').Errors;
import CodePath from 'qnode-beans/dist/util/CodePath';
const CookieParser = require('restify-cookies');
const FileUploader = require('./file/FileUploader');
import JWTAuth from './auth/JWTAuth';
import SwaggerHelper from './swagger/SwaggerHelper';
import BlueprintHelper from './blueprint/BlueprintHelper';
import SimpleAuth from './auth/SimpleAuth';

declare let StaticSupport:any;

declare module global {
    const module:string;
}


export default class ApiServer extends Bean {
  
    public $proxy = false;
    public swaggerHelper:SwaggerHelper = null;
    public auth:SimpleAuth;
    public restify:Restify.Server;
    public apiDefinitions:any = {};
    public fileUploader:any;

    
    /**
     * 
     */
    init() {
        const cfg = this._config;

        cfg.name = cfg.name || global.module;
        if( !cfg.path ) cfg.path = cfg.name;
        if( !cfg.httpPort ) throw new Error( '<httpPort> not configured' );
        if( cfg.cors === undefined ) cfg.cors = true;
        if( !cfg.apiDir ) cfg.apiDir = './api';

        let errs = cfg.errors;
        if( !errs ) errs = cfg.errors = {};

        if( !errs.codeStart ) errs.codeStart = 1001;
        if( !errs.codeEnd ) errs.codeEnd = 2000;

        if( errs.paths === undefined ) errs.paths = ['./Errors.json'];
        errs.paths.forEach( (p:string) => Errors.register( errs.codeStart, errs.codeEnd, CodePath.resolve(p) ) );
        
        this.swaggerHelper = new SwaggerHelper();
        this.auth = JWTAuth.globalAuthBean();
    }

    /**
     * 
     */
    initRestify() {
        const cfg_server = this._config;

        //TODO: formatters, log, HTTPS, versioning
        const binaryFormatter = RestifyAny.formatters['application/octet-stream; q=0.2'];
        const textFormatter = RestifyAny.formatters['text/plain; q=0.3'];

        const restify:Restify.Server = this.restify = RestifyAny.createServer( {
            name: cfg_server.name,
            acceptable: 'application/json',
            formatters: {
                'image/bmp': binaryFormatter,
                'image/jpeg': binaryFormatter,
                'text/markdown': textFormatter,
                'text/html': textFormatter
            }
        } );

        //restify.use( Restify.acceptParser(restify.acceptable) );
        //restify.use( Restify.requestLogger() );
        restify.use( Restify.plugins.queryParser({mapParams: true}) );
        restify.pre( Restify.pre.userAgentConnection() );
        restify.use( Restify.plugins.bodyParser({
            maxBodySize: cfg_server.maxBodySize ? cfg_server.maxBodySize : 8 * 1024,
            mapParams: true,
            mapFiles: false,
            overrideParams: true
        }));
        restify.use(CookieParser.parse);

        this.restify.on('MethodNotAllowed', function(req:Restify.Request, res:Restify.Response) {
            if (req.method.toLowerCase() === 'options') {
                //if (res.methods.indexOf('OPTIONS') === -1) res.methods.push('OPTIONS');

                if( cfg_server.cors ) {
                    res.header('Access-Control-Allow-Credentials', true);
                    res.header('Access-Control-Allow-Headers', 'aauth,Content-Type,Content-Length, Authorization, Accept,X-Requested-With');
                    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
                    res.header('Access-Control-Allow-Origin', '*');
                    res.header('Access-Control-Max-Age', '3600');
                }

                return res.send(204);
            }
        
            return res.send(405);//new Restify.MethodNotAllowedError());
        });
    }

    buildApi( apiDir:string ) {
        this.buildApiDefinitions( apiDir, apiDir );
    }


    buildGraphQL() {
        this.buildInternalApiDefinition('graphql/GraphQLAPI.js');
        this.buildInternalApiDefinition('graphql/GraphiQLAPI.js');

        const graphqlModuleDir = Path.parse(require('./').module.filename);

        this.restify.get( new RegExp(`graphiql/?.*`), StaticSupport({
                directory: graphqlModuleDir.dir,
                default: 'index.html',
                charSet: 'utf-8'
            }));
    }


    buildApis() {
        const apiDir = CodePath.resolve( this._config.apiDir );
        this._logger.info( 'service api directory: ' + apiDir );
        this.buildApi(apiDir);

        const graphql = this._config.graphql;
        if( graphql && graphql.auto ) {
            this.buildGraphQL();
        }

        this.buildInternalApiDefinition('swagger/GetSwaggerAPI.js');
        this.buildInternalApiDefinition('blueprint/GetBlueprintAPI.js');
    }


    buildInternalApiDefinition( relative:string ) {
        const wnodeSrcDir = Path.dirname(module.filename);
        this.buildApiDefinition(Path.join(wnodeSrcDir, relative), relative);
    }


    /**
     * 
     */
    initApi() {
        this.buildApis();

        const cfg = this._config;
        const exposedToRootURL = (cfg.exposedToRootURL === undefined) ? false : cfg.exposedToRootURL;//是否同时把API放到根URL
        const path = '/' + cfg.path + '/';

        for( let apiName in this.apiDefinitions ) {
            const def = this.apiDefinitions[apiName];
            const spec = def.spec;

            const handler = ( req:Restify.Request, res:Restify.Response, next:Function ) => {
                const ctx = new ServerContext( this, def, req, res, next );

                if( def.transactional ) {
                    try {
                        // 自动启动事务
                        ctx.beginTx(def.transactionOptions);
                    } catch( error ) {
                        ctx.error( error );
                        return;
                    }
                }

                this.auth.auth( ctx, def, req )
                .then( function() {
                    def.respond( ctx, spec.parameters, req.params );
                } ).catch( function( error:any ) {
                    ctx.error( error );
                } );
            };

            this.expose( def, path, handler );

            if( exposedToRootURL ) this.expose( def, '/', handler );

            const apiLog = [];
            apiLog.push( def.method.toUpperCase() );
            apiLog.push( ': ' );
            apiLog.push( def.buildWebUrlSample(path, spec.parameters) );
            apiLog.push( 'Roles: ' );
            apiLog.push( ApiRole.byValueArray(def.roles) );

            this._logger.info( apiLog.join('') );
        }
    }

    /**
     * 
     */
    expose( def:ApiDefinition, path:string, handler:Restify.RequestHandler ) {
        this.restify.post( path + def.name, handler );
        this.restify.get( path + def.name, handler );

        //this.restify[def.method]( path + def.name, handler );
        //if( def.method.toLowerCase() !== 'get' ) {
        //    this.restify.get( path + def.name, handler );
        //}
    }

    /**
     * 
     */
    start( listen:boolean ) {
        this._logger.info('start server initialization');

        this.init();

        this.initRestify();
        this.initApi();
        this.buildStaticWeb();

        if( listen ) {
            this.restify.listen( this._config.httpPort, () => {
                this._logger.info('%s listening at %s', this.restify.name, this.restify.url);
            } );
        }

        this._logger.info('finish server initialization');

        this.validateApi();

        this.buildUploader();
    }

    /** blueprint has a swagger spec validator that we could easily reuse */
    validateApi() {
        const logger = this._logger;
        const options = {
            ignoreInternalApi: false,
            ignoreGetBlueprintApi: true,
            ignoreGetSwaggerApi: true,
            ignoreNames: <any[]>[]
        };

        const blueprint:BlueprintHelper = this._beans.load('BlueprintHelper');
        blueprint.output( this, null, options, function(err:any/*, blueprint*/) {
            if( err ) {
                logger.fatal( err, 'validation failure by blueprint' );
            } else {
                logger.info( 'validation passed by blueprint' );
            }
        } );
    }

    buildStaticWeb() {
        const cfg = this._config;
        //const exposedToRootURL = (cfg.exposedToRootURL === undefined) ? false : cfg.exposedToRootURL;//是否同时把API放到根URL
        
        const dir = CodePath.resolve( cfg.staticDir ? cfg.staticDir : './static' );
        try {
            Fs.statSync(dir);
        } catch( e ) {
            this._logger.info( 'no static directory' );
            return;
        }
        this._logger.info( 'static directory: ' + dir );
        
        for( const fileName of Fs.readdirSync(dir) ) {
            const full = Path.join(dir, fileName);
            const stat = Fs.statSync(full);
            if( stat.isDirectory() ) {
                this.restify.get( new RegExp('/' + cfg.path + '/' + fileName + '/?.*'), StaticSupport({
                    directory: dir,
                    default: 'index.html',
                    charSet: 'utf-8'
                }));
            }
        }
        
    }
    

    buildUploader() {
        let cfg = this._config.file;
        if( !cfg ) return;

        cfg = cfg.upload;
        if( !cfg ) return;        
        if( !cfg.enable ) return;

        this.fileUploader = this._beans.load('FileUploader');
        
        this.fileUploader.start();
    }


    buildApiDefinitions( apiDir:string, dir?:string ) {
        const relative = dir.substring(apiDir.length);
         
        /*eslint no-sync: "off"*/
        for( const fileName of Fs.readdirSync(dir) ) {
            const full = Path.join( dir, fileName );
            const stat = Fs.statSync(full);
            if( stat.isDirectory() ) {
                this.buildApiDefinitions( apiDir, full );
            } else {
                this.buildApiDefinition( full, relative );
            }
        }
    }


    buildApiDefinition( full:string, relative:string ) {
        const path = Path.parse( full );
        if( '.js' === path.ext ) {
            path.full = full;
            path.relative = relative;
                    
            const def = ApiDefinition.build(this._beans, path);
            if( this.apiDefinitions[def.name] ) {
               throw new Error( 'duplicated API: name=' + def.name + ', path=' + full );
            }
            this.apiDefinitions[def.name] = def;
        }
    }

}

//Object.freeze({});
//test: mocha: should.js/expect/chai/better-assert
