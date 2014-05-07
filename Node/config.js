var _ = require('lodash');

var config = {
  defaults: {
  postGIS: {
      host: 'localhost'
    , port: 5432
    , dbname: 'gps_routes'
    , user: 'user_name'
    , password: 'password'
    , type: 'postgis'
    , initial_size: '10'
    , geometry_field: 'the_web_geom'
    , srid: 3857
    , table: 'gps_routes_simplified'
    }
  }
    

, dev: {
    env: 'dev'
  , isDev: true
  }

, prod: {
    env: 'prod'
  , isProd: true
  , postGIS: {
      host: 'localhost'
    , port: 5432
    , dbname: 'gps_routes'
    , user: 'user_name'
    , password: 'password'
    , type: 'postgis'
    , initial_size: '10'
    , geometry_field: 'the_web_geom'
    , srid: 3857
    , table: 'gps_routes_simplified'
    }
  }
};

var ROUTES_ENV = process.env['ROUTES_ENV'] = process.env['ROUTES_ENV'] || 'dev';
if (ROUTES_ENV == null || !config.hasOwnProperty(ROUTES_ENV)) ROUTES_ENV = 'dev';

module.exports = _.defaults(config[ROUTES_ENV], config.defaults);
console.log('Loading',  ROUTES_ENV, 'config');
