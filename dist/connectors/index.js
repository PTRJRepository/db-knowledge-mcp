"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgreSQLConnector = exports.MySQLConnector = exports.SQLServerConnector = exports.BaseDatabaseConnector = void 0;
exports.createConnector = createConnector;
const sqlserver_1 = require("./sqlserver");
const mysql_1 = require("./mysql");
const postgresql_1 = require("./postgresql");
var base_1 = require("./base");
Object.defineProperty(exports, "BaseDatabaseConnector", { enumerable: true, get: function () { return base_1.BaseDatabaseConnector; } });
var sqlserver_2 = require("./sqlserver");
Object.defineProperty(exports, "SQLServerConnector", { enumerable: true, get: function () { return sqlserver_2.SQLServerConnector; } });
var mysql_2 = require("./mysql");
Object.defineProperty(exports, "MySQLConnector", { enumerable: true, get: function () { return mysql_2.MySQLConnector; } });
var postgresql_2 = require("./postgresql");
Object.defineProperty(exports, "PostgreSQLConnector", { enumerable: true, get: function () { return postgresql_2.PostgreSQLConnector; } });
function createConnector(config) {
    switch (config.type) {
        case 'sqlserver':
            return new sqlserver_1.SQLServerConnector(config);
        case 'mysql':
            return new mysql_1.MySQLConnector(config);
        case 'postgresql':
            return new postgresql_1.PostgreSQLConnector(config);
        default:
            throw new Error(`Unsupported database type: ${config.type}`);
    }
}
//# sourceMappingURL=index.js.map