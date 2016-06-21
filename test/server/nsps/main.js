'use strict';

var kiss = require('../../..'),
    main = kiss.Namespace('/');


/*!
 * Init namespace
 */
main.use(function verify(socket, heads, next)
{
  var token = heads['x-token'];

  if(token == '123123')
  {
    next();
  }
  else
  {
    next('bad token (pass 123123 with header x-token)');
  }
});

main.on('connection', function(socket)
{
  // Should not get here.
  console.log('Welcome; sid: %s', socket.id);
});

main.on('disconnection', function(socket)
{
  console.log('Bye bye; sid: %s', socket.id);
});

/*!
 * Exports
 */
module.exports = main;