'use strict';


const InternalContext = require( '../ctx/InternalContext' );


module.exports = class TestContext extends InternalContext {

    // 关闭 beginTx()，使得被测试对象无法启动事务
    beginTx() {
        return this;
    }

}
