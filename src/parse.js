// parse.js ----------------------------------------------------------------------------------------

/* 由以下代码生成 reInit, reNonterminal, reSymbol:
 function $(r) {
 return RegExp(r.source.replace(/@([a-zA-Z]\w*);?/g, function(s, n) {
 s = eval(n);
 if (!s._) {
 s = eval(n + '=$(' + n + ')');
 s._ = 1;
 }
 s = s.source;
 return (n = s.slice(-2)) != '\\b' ? s : s.slice(0, -2);
 }));
 }
 var reInit = /@title|@divide|@item|@unknow/;

 //           1.title        4.children     5.ident
 var title = /((\$)?(@id|_)(?:\[(@children)\])?(\.(@id)?)?\s*:)/;
 //      node.2    3.name/id                   6.id

 //            7.divide
 var divide = /(@qualify|@spliter)/;

 //              8.use 9.qualify
 var qualify = /\[([+~])(@id)\]/;
 //          10.item
 var item = /(@token(?:@direc)?@tag?|[~;])/;

 //            11.unknow
 var unknow = /(\S+)/;

 var reNonterminal = /^(@id)\[(@vary)\]|(@id)\[(@vary)\](?!.*\/)/;

 //                 1.name/source/id            4.turn/id 6.id
 var reSymbol = /(?:(@id|_)|\/(@regtxt)\/(!)?)(?:>(@id))?(\.(@id)?)?(@tag?)/;
 //                       2.source     3.lookahead     5.ident    7.tag 必须内置以匹配出''
 var children = /@id(?:@ids)*\b/;
 var token = /(?:@id(?:\[@vary\])?|@regexp)/;
 var direc = /(?:@turn)?(?:@ident)?/;
 var turn = />@id(?:\[@vary\])?/;
 var ident = /\.(?:@id)?/;
 var ids = /,@id/;
 var vary = /@arg(?:@args)*\b/;
 var arg = /[?+~]@id/;
 var args = /,@arg/;
 var tag = /[?+*]/;
 var id = /[a-zA-Z]\w*\b/;
 var regexp = /\/@regtxt\/!?/;
 var regtxt = /(?:[^\/\\[\n\r]|\\.|\[(?:[^\]\\\n\r]|\\.)*\])+/;
 var spliter = /\n|\r|#.*|\|/;
 console.log('var reInit = %sg;\nvar reNonterminal = %sg;\nvar reSymbol = %s;\n\n', $(reInit), $(reNonterminal), $(reSymbol));
 */


var reInit = /((\$)?([a-zA-Z]\w*|_)(?:\[([a-zA-Z]\w*(?:,[a-zA-Z]\w*)*)\])?(\.([a-zA-Z]\w*)?)?\s*:)|(\[([+~])([a-zA-Z]\w*)\]|\n|\r|#.*|\|)|((?:[a-zA-Z]\w*(?:\[[?+~][a-zA-Z]\w*(?:,[?+~][a-zA-Z]\w*)*\])?|\/(?:[^\/\\[\n\r]|\\.|\[(?:[^\]\\\n\r]|\\.)*\])+\/!?)(?:(?:>[a-zA-Z]\w*(?:\[[?+~][a-zA-Z]\w*(?:,[?+~][a-zA-Z]\w*)*\])?)?(?:\.(?:[a-zA-Z]\w*)?)?)?[?+*]?|[~;])|(\S+)/g;
var reNonterminal = /^([a-zA-Z]\w*)\[([?+~][a-zA-Z]\w*(?:,[?+~][a-zA-Z]\w*)*)\]|([a-zA-Z]\w*)\[([?+~][a-zA-Z]\w*(?:,[?+~][a-zA-Z]\w*)*)\](?!.*\/)/g;
var reSymbol = /(?:([a-zA-Z]\w*|_)|\/((?:[^\/\\[\n\r]|\\.|\[(?:[^\]\\\n\r]|\\.)*\])+)\/(!)?)(?:>([a-zA-Z]\w*))?(\.([a-zA-Z]\w*)?)?([?+*]?)|(~)|(;)/;
var tags = ' ?+*';
var reNext = /\S+|$/g;

function Parse(grammar, test) {
  grammar = compileGrammar(grammar, test);
  return bind(parse, grammar);
}

function compileGrammar(grammar, test) {
  if (isString(grammar))
    grammar = initGrammar(grammar, test);
  grammar = makeGrammar(grammar, test);
  grammar = linkGrammar(grammar, test);
  if (!grammar._) {  // 默认空白符号
    var blank = object();
    blank[0] = /\s+|/g;
    blank[1] = /[ \t\v\f\u00a0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff\ufffe]+|/g;
    blank[0]._ = 1;
    grammar._ = blank;
  }
  return grammar;
}

// initGrammar(code)
//    将文法原文处理为初始文法表

function initGrammar(code, test) {
  var grammar = object(), ms, name, symbol, produce, p = 0, s = 0;
  code = trim(code);
  reInit.lastIndex = 0;
  if (ms = scan(reInit, code)) {
    if (!ms[1])   // title
      throw error('Grammar error: %s', ms[0]);
    grammar[0] = name = ms[3]; // 记录根语法符号名
    symbol = object();
    produce = object();

    do {
      if (ms[11])    // bad
        throw error('Grammar error: %s', ms[0]);
      if (ms[10]) {  // item
        produce[s++] = ms[0];
      }
      else {  // divide or title 产生式分隔符或符号标题
        if (s) {
          symbol[p++] = produce;
          produce = object();
          s = 0;
        }
        if (ms[7]) { // divide 产生式分隔符
          if (ms[8]) {  // qualify 有产生式限定条件
            produce.u = +(ms[8] == '+');  // use 产生是启用标志
            produce.c = ms[9];           // id 产生式限定标识
          }
        }
        else if (ms[1]) {  // title 符号标题
          if (p) {
            grammar[name] = symbol;
            symbol = object();
            p = 0;
          }
          name = ms[3];
          if (ms[2]) { // grammar 文法起点
            symbol.g = 1;
          }
          var x;
          if (x = ms[4])  // derive 有参数化的派生符号
            symbol.p = split(x, ',');
          if (ms[5])  // ident 有编程标识
            symbol.$ = ms[6] || name;   // id
        }
      }
    } while (ms = scan(reInit, code));

    if (s)
      symbol[p++] = produce;

    if (p)
      grammar[name] = symbol;
  }

  return grammar;
}

// makeGrammar(srcGrammar)
//   将初始文法表处理为未连接的文法表
function makeGrammar(srcGrammar, test) {
  var desGrammar = object();
  desGrammar[0] = srcGrammar[0];
  delete srcGrammar[0];

  var srcNames = getOwnPropertyNames(srcGrammar);
  for (var sn = 0, srcName; srcName = srcNames[sn]; sn++) {
    var srcSymbol = srcGrammar[srcName];

    // 生成可能的符号参数组合：
    var params = srcSymbol.p ? piece(srcSymbol.p) : [];
    for (var mix = 1, len = params.length; mix < len; mix++)
      for (var bas = 0, end = len - mix; bas < end; bas++)
        for (var pos = bas + 1; pos <= end; pos++)
          push(params, params[bas] + join(piece(params, pos, pos + mix), ''));

    // 从符号初始符号名开始，生成所有参数组合后的可能的符号：
    var param = '';   // 初始符号名的后缀参数为空
    for (var p = -1; p < params.length;) {  // p 从 -1 开始将先处理初始符号名
      var desSymbol = object();
      var desName = srcName + param;
      if (test) desSymbol._ = desName;

      for (var dp = 0, sp = 0, srcProduce; srcProduce = srcSymbol[sp]; sp++) {
        var condition = srcProduce.c;
        if (condition) {
          condition = +(indexOf(param, condition) > -1);
          if (condition ^ srcProduce.u)
            continue;   // 若产生式的条件与符号后缀参数不符，则不引入此产生式
        }
        var desProduce = desSymbol[dp++] = object();
        if (srcSymbol.$)
          desSymbol.$ = srcSymbol.$;  // 设置符号类型
        if (srcSymbol.g)
          desSymbol.g = srcSymbol.g;

        // 对每一产生项进行后缀变异：
        for (var i = 0, item; item = srcProduce[i]; i++) {
          desProduce[i] = replace(item, reNonterminal, function (s, name, args, name2, args2) {
            if (name2) name = name2;
            args = split(args || args2, ',');
            for (var a = 0, arg; arg = args[a]; a++) {
              s = arg[0];
              arg = slice(arg, 1);
              if (s === '+' || s === '?' && indexOf(param, arg) >= 0)
                name += arg;
            }
            return name;
          });
        }
      }
      desGrammar[desName] = desSymbol;
      param = params[++p];  //因为从 -1 开始，一定要先增
    }
  }
  return desGrammar;
}

// linkGrammar(grammar)
//   连接文法表中的符号关系，形成最终可用于解析代码的文法表
function linkGrammar(symbols, test) {
  var grammar = object(), cache = object();
  var root = symbols[0];
  delete symbols[0];
  var names = getOwnPropertyNames(symbols);

  for (var i = names.length, name; name = names[--i];) {
    var symbol = linking(name, [], test);
    if (name == '_') { // 空白符（包括注释）
      for (var j = 0; name = symbol[j]; j++)
        symbol[j] = name[0];
      grammar._ = symbol;
    } else if (symbol.g || test) {
      grammar[name] = symbol;
    }
  }

  grammar[0] = symbols[root]; // 重设根语法符号
  return grammar;

  function linking(name, trail, test) {
    var ms = match(name, reSymbol), source, i;
    if ((source = ms[1]) && (i = indexBy(trail, source)) >= 0)
      throw error('Circle grammar: %s->%s', join(piece(trail, i), '->'), name);
    var symbol = cache[name], p, produce;
    if (!symbol) {
      var turn = ms[4];
      var ident = ms[5] && (ms[6] || ms[4] || ms[1]);
      var tag = indexOf(tags, ms[7]);

      if (ms[2]) { //正则表达式
        symbol = cache[name] = RegExp(ms[2] + '|', 'g');
        if (ms[3])   // 前探标志
          symbol.f = 1;
      }
      else if (tag || turn || ident) {  // 产生项:
        symbol = cache[name] = object();
        source = linking(source, trail, test);
        for (p = 0; produce = source[p]; p++)
          symbol[p] = produce;
        if (source.$) symbol.$ = source.$;
        if (test)
          symbol._ = name;
      }
      else {  // 符号:
        symbol = cache[name] = symbols[name];
        if (!symbol)
          throw error('Undefined grammar: %s', name);
        push(trail, name);
        for (p = 0; produce = symbol[p]; p++) {
          var option = 1;   // 产生式初始可空
          for (i = 0; name = produce[i]; i++) {
            if (name == '~' || name == ';') {
              produce[i] = name;
            }
            else {
              produce[i] = linking(name, option ? trail : [], test);  // 可空态需递归循追踪环语法
            }
            if (indexOf('?+*', slice(name, -1)) % 2)
              option = 0;
          }
        }
        pop(trail);
      }
      if (turn) {
        symbol.t = turn = linking(turn, trail, test);
        if (turn.$) symbol.$ = turn.$;
      }
      if (ident) symbol.$ = ident;
      if (tag % 2) symbol.o = 1;
      if (tag > 1) symbol.m = 1;
    }
    return symbol;
  }
}

// parse(symbol, code)
function parse(code, name) {
  var token,
    stream = {s: code, i: 0, e: 0, r: 0, c: 0, b: this._},
    symbol = this[name || 0];

  if (!symbol)
    throw error('Unknown symbol %s.', name);

  //debugger;
  token = read(symbol, stream, '');

  while (skip(stream));
  if (stream.i < code.length || !symbol.o && !token) {
    stream.i = stream.e;
    while (skip(stream));
    lined(stream);
    var row = stream.r + 1, col = stream.c + 1;
    token = reget(reNext, stream);
    if (token) {
      token = 'token ' + token + ' at ' + row + ':' + col;
    }
    else {
      token = 'end of input';
    }
    throw error('SyntaxError: Unexpected %s', token);
  }
  return token || '';
}


// token|err = read(symbol, stream)
function read(symbol, stream) {
  var token, item, idx, okey;
  idx = okey = stream.i;
  for (var p = 0, produce; produce = symbol[p]; p++) {
    item = reads(produce, stream);
    if (item) {
      if (stream.i > okey) {
        token = item;
        okey = stream.i;
      }
      break;
    }
    if (stream.i > idx) {
      stream.i = idx;  //回溯
    }
  }
  if (token) {
    if (symbol.$)
      token.$ = symbol.$;
    stream.i = okey;
  }
  return token;
}

var reLns = /[\n\r\u2028\u2029]|/g;
var reSemicon = /;|/g;

function reads(produce, stream) {
  var token, items = object(), len = 0, symbol, item;
  for (var s = 0; symbol = produce[s]; s++) {
    if (symbol === '~') {
      if (see(reLns, stream, 1))
        break;
    }
    else if (symbol.f) {
      if (see(symbol, stream))
        break;
    }
    else {
      while (item = skip(stream))
        put(item);
      if (symbol === ';') {
        if(item = reget(reSemicon, stream)) {
          put(item);
        }
        else {

        }
      }
      else {
        var got = 0;
        do {
          var idx = stream.i;
          if (symbol.exec) {
            item = reget(symbol, stream);
          }
          else {
            item = read(symbol, stream);
          }
          if (!item) break;
          if (symbol.t) {
            var shred = {s: slice(stream.s, idx, stream.i), i: 0, e: 0, b: stream.b};
            item = read(symbol.t, shred);
            if (!item) {
              stream.e = idx + shred.e;
              break;
            }
          }
          put(item);
          got = 1;
        } while(symbol.m);

        if (!got && !symbol.o)
          break;
      }
    }
  }
  if (!symbol)
    token = items;
  return token;

  function put(item) {
    if (isObject(item)) {
      var id;
      if (id = item.$) {
        items[len++] = item;
        if (items[id]) {
          push(items[id], item);
        }
        else {
          items[id] = [item];
        }
      }
      else {
        for (var i = 0, sub; sub = item[i]; i++) {
          put(sub);
        }
      }
    }
    else {
      items[len++] = item;
    }
  }
}

function reget(regexp, stream) {
  var token, err;
  regexp.lastIndex = stream.i;
  if (token = scan(regexp, stream.s)[0]) {
    stream.i = regexp.lastIndex;
    if (stream.e < stream.i)
      stream.e = stream.i;
  }
  else {
    err = stream.i;
  }
  if (!token && err > stream.e)
    stream.e = err;
  return token;
}

function skip(stream, inline) {
  var regexps = stream.b, pos = stream.i, s = stream.s, i, regexp, space;
  for (i = 0; regexp = regexps[i]; i++) {
    if (!inline || !regexp._) {
      regexp.lastIndex = pos;
      if (space = scan(regexp, s)[0]) {
        pos = object();
        pos[0] = space;
        space = pos;
        if (regexp.$)
          space.$ = regexp.$;
        stream.i = regexp.lastIndex;
        return space;
      }
    }
  }
}

function see(regexp, stream, inline) {
  var token, pos = stream.i;
  while (skip(stream, inline));
  regexp.lastIndex = stream.i;
  token = scan(regexp, stream.s)[0];
  stream.i = pos;
  return token;
}

var reLn = /[\n\u2028\u2029]|\r\n?/g;

function lined(stream) {
  var str = stream.s, len = stream.i, row = 0, col = len;
  reLn.lastIndex = 0;
  while (scan(reLn, str)) {
    if (reLn.lastIndex > len)
      break;
    row++;
    col = len - reLn.lastIndex;
  }
  stream.r = row;
  stream.c = col;
  return stream;
}

