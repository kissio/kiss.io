'use strict';

var kiss = require('../../..'),
    main = kiss.Namespace('/');


/*!
 * Init namespace
 */
main.use(function middleware()
{
  console.log('just a middleware passing by.. don\'t mind me');
});

main.use(function crashConnection()
{
  throw new Error('Main namespace is closed; ' +
    'error has been thrown automatically from middleware.\n' +
    'Check /math.');
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