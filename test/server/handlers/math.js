'use strict';


module.exports =
{
  onIncrement: onIncrement,
  onDecrement: onDecrement,
  onCalculate: onCalculate,
  onPrint: onPrint
};

function onIncrement(socket)
{
  var math = socket.nsp;
  math.counter++;
}

function onDecrement(socket)
{
  var math = socket.nsp;
  math.counter--;
}

function onCalculate(socket)
{
  var math = socket.nsp;
  socket.emit('math.results', math.counter);
}

function onPrint(socket)
{
  var math = socket.nsp;
  console.log("'/math': Events Triggered: %d; " +
    "Counter: %d", math.eventsTriggered, math.counter);
}
