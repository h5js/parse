/**
 * lib.js
 */

var Function_prototype = Function.prototype;
var String_prototype = String.prototype;
var Array_prototype = Array.prototype;
var RegExp_prototype = RegExp.prototype;

// JavaScript: -------------------------------------------------------------------------------------
// stringify(str)
var stringify = JSON.stringify;

// Functions: --------------------------------------------------------------------------------------

var _call = Function_prototype.call;
var _bind = Function_prototype.bind;

var _replace = String_prototype.replace;

var _test = RegExp_prototype.test;

// fn = func(method)
var func = _call.bind(_bind, _call);

// fn = bind(method, thisArg, ...)
var bind = func(_bind);

// Objects: ----------------------------------------------------------------------------------------
// isObject(any)
function isObject(any) {
  return typeof any === 'object';
}

// obj = object(proto=null)
function object(proto) {
  return Object.create(proto || null)
}

// getOwnPropertyNames(obj)
var getOwnPropertyNames = Object.getOwnPropertyNames;

// Number: -----------------------------------------------------------------------------------------

// isInteger(any)
var isInteger = Number.isInteger || function (any) {
    return any - any % 1 === any
  };

// Strings: ----------------------------------------------------------------------------------------

// isString(any)
function isString(any) {
  return typeof any === "string"
}

// indexOf(str, substr)
var indexOf = func(String_prototype.indexOf);

// trim(str)
var trim = func(String_prototype.trim);

// slice(str, begin, end)
var slice = func(String_prototype.slice);

// split(str, regexp)
var split = func(String_prototype.split);

// match(str, regexp)
var match = func(String_prototype.match);

var isId = _test.bind(/^[a-zA-Z_$][\w$]*$/);

// replace(str, regexp|substr, newSubStr|function)
var replace = func(_replace);

// Array: -----------------------------------------------------------------------------------------
// push(ary, any)
var push = func(Array_prototype.push);

// pop(ary)
var pop = func(Array_prototype.pop);

// join(ary, s)
var join = func(Array_prototype.join);

// piece(ary, begin, end)
var piece = func(Array_prototype.slice);

// splice(ary, idx, len)
var splice = func(Array_prototype.splice);

// indexBy(aray, any)
var indexBy = func(Array_prototype.indexOf);

// RegExp: ----------------------------------------------------------------------------------------
// scan(regexp, str)
var scan = func(RegExp_prototype.exec);

function keynames(obj, fit) {
  var keys = [], key;
  if (typeof fit === 'function') {
    for (key in obj)
      if (fit(key)) {
        keys.push(key);
      }
  }
  else {
    key = 0;
    for (keys[key] in obj) key++;
  }
  return keys;
}

//err = error(msg, ...)
var error = bind(function (msg) {
  if (msg != undefined) {
    var args = arguments, i = 1;
    msg = replace(msg, this, function (s) {
      return i < args.length ? args[i++] : s;
    })
  }
  return Error(msg);
}, /%[sd]/g);

// Web utilities: ----------------------------------------------------------------------------------
// get(url)
function get(url) {
  var http = new XMLHttpRequest;
  http.open('GET', url, false);
  http.send();
  return http.status / 100 ^ 2 ? '' : http.responseText;
}
