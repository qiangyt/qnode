const AliyunSdk = require('waliyun-sdk');
import Memcached from './Memcached';


// See https://github.com/chylvina/node_memcached

export default class AliMemcached extends Memcached {

    createClient( cfg:any ) {
         return AliyunSdk.MEMCACHED.createClient( cfg.port, cfg.host );
    }
  
}
