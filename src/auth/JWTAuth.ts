import * as ApiRole from '../ApiRole';
import JWToken from './JWToken';
import SimpleAuth from './SimpleAuth';
import JWTCodec from './JWTCodec';
import Beans from 'qnode-beans/dist/Beans';


declare module global {
    const config:any;
}


export default class JWTAuth extends SimpleAuth {

    public jwtCodec:JWTCodec;


    init() {
        this.jwtCodec = new JWTCodec();
    }


    codec() {
        return this.jwtCodec;
    }

    createEmptyToken() {
        return new JWToken( null, null, null, [ApiRole.any] );
    }


    static globalAuthBean():JWTAuth {
        const cfg = global.config;
        if( !cfg.server.auth ) cfg.server.auth = 'JWTAuth';
        return Beans.DEFAULT.get(cfg.server.auth);
    }

}
