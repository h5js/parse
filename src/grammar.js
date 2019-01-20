var rePrepareGrammar = /(\$?)(\w+(?:\[\w+(?:,\w+)*\])?)\s*:\s*|([?+*&~!=])?(\{)\s*|([\n\r|]|#.*)\s*|(\[[+~]\w+\])|(\})|(\S+)/g;
var reGrammarWords = /(?:(\w+)(?:\[(\w+(?:,\w+)*)\])?([:=#])|([\n\r]|\||#.*)|\[([+~])(\w+)\]|(?:(\})|([?+*&=!~]?)(?:(\{)|((\w+)(?:\[([?+~]\w+(?:,[?+~]\w+)*)\])?|`(\w+)`|((?:[^\s\\>]|\\.)+))))(?:>(\w+)(?:\[([?+~]\w+(?:,[?+~]\w+)*)\])?)?)(?=\s|$)/g;
var                      NAME=1,   PARAMS=2,         AS=3,   DIVS=4,           BY=5, USE=6,     END=7,TAG=8,     BEG=9,  ITEM=10,SYM=11,ARGS=12,                  KEY=13,REG=14,                   RSYM=15,  RARGS=16;

var tags = ' ?+*&=!~';
function initGrammar(text) {
  var grammar = [], g = 0;
  reGrammarWords.lastIndex = 0;
  reGrammarWords.ms = 1;
  prepareSymbol(-1);
  return grammar;

  function prepareSymbol(tag) {
    var name, params, as, symbol = [], p = 0, produc = [], i = 0;
    if(tag>0)
      symbol[p++] = tag;
    while (reGrammarWords.ms && (reGrammarWords.ms = scan(reGrammarWords, text))) {
      var ms = reGrammarWords.ms, item, s;
      if(s = ms[ITEM]) {
        if(ms[REG]) {
          item = {r: s + '|'};
        }
        else if( s = ms[KEY] ) {
          item = {r: '\\b' + s + '\\b|'};
        }
        else {
          item = {s: ms[SYM]};
          if (s = ms[ARGS]) item.a = s;
        }
        if (s = ms[TAG]) item.f = s;
        if (s = ms[RSYM]) {
          item.R = s;
          if (s = ms[RARGS])
            item.A = s;
        }
        produc[i++] = item;
      }
      else if(ms[BEG]) {  // 开始子语法项：
        if( s = prepareSymbol(indexOf(tags, ms[TAG]))) {
          produc[i++] = s;
        }
      }
      else {
        if(i)
          symbol[p++] = produc, produc = [], i = 0;
        if(s = ms[USE]) {
          produc.q = ms[BY];
          produc.u = s;
        }
        else if(ms[END]){   // 结束子语法项：
          if(tag<0)
            throw error('Grammar error: }');
          if (s = ms[RSYM]) {
            symbol.R = s;
            if (s = ms[RARGS])
              symbol.A = s;
          }
          break;
        }
        else if(s = ms[NAME]) {   // 语法项
          if(tag>=0)
            throw error('Grammar error: %s', s);
          if(p) {
            if(name) symbol.n = name;
            if(params) symbol.p = params;
            if(as) symbol.as = as;
            grammar[g++] = symbol, symbol = [], p = 0;
          }
          name = s, params = ms[PARAMS], as = ms[AS] === ':' ? 0 : ms[AS];
        }
      }
    }
    if(i)
      symbol[p++] = produc;
    if(p) {
      if(tag>=0)
        return symbol;
      if(name) symbol.n = name;
      if(params) symbol.p = params;
      if(as) symbol.as = as;
      grammar[g++] = symbol;
    }
  }
}

var reNameParams = /(\w+)\[(\w+(?:,\w+)*)\]/;
var reSymArgs = /(\w+)\[([?+~]\w+(?:,[?+~]\w+)*)\]/g;
function expandGrammar(srcGrammar) {
  var desGrammar = [], ds = 0, used = object();

  for (var ss = 0, srcSymbol; srcSymbol = srcGrammar[ss]; ss++) {
    var srcName, params, desSymbol;
    if( (srcName = srcSymbol.n) && (params = srcSymbol.p) ){
      params = split(params, ',');
      // 生成可能的符号参数组合：
      for (var mix = 1, len = params.length; mix < len; mix++)
        for (var bas = 0, end = len - mix; bas < end; bas++)
          for (var pos = bas + 1; pos <= end; pos++)
            push(params, params[bas] + join(piece(params, pos, pos + mix), ''));

      // 从符号初始符号名开始，生成所有参数组合后的可能的符号：
      var param = '';   // 初始符号名的后缀参数为空
      for (var p = -1; p < params.length;) {  // p 从 -1 开始将先处理初始符号名
        desSymbol = expandSymbol(srcSymbol, param);
        desSymbol.n = srcName + param;
        desGrammar[ds++] = desSymbol;
        param = params[++p];  //因为从 -1 开始，一定要先增
      }
    }
    else {
      desSymbol = expandSymbol(srcSymbol, []);
      if(srcName) desSymbol.n = srcName;
      desGrammar[ds++] = desSymbol;
    }
  }

  srcGrammar = desGrammar;
  desGrammar = [srcGrammar[0]];
  for(ss = 1, ds = 1; srcSymbol = srcGrammar[ss]; ss++) {
    if(used[srcSymbol.n])
      desGrammar[ds++] = srcGrammar[ss];
  }

  return desGrammar;

  function expandSymbol(srcSymbol, param) {
    var desSymbol = object();
    for (var dp = 0, sp = 0, srcProduc; srcProduc = srcSymbol[sp]; sp++) {
      var use;
      if( (use = srcProduc.u ) && (indexOf(param, use)<0) ^ (srcProduc.q==='~') )
        continue;

      var desProduc = desSymbol[dp++] = object();

      // 对每一产生项进行后缀变异：
      for (var i = 0, srcItem; srcItem = srcProduc[i]; i++) {
        var desItem, s;
        if(s = srcItem.s) {
          desItem = object();
          desItem.s = expand(s, srcItem.a, param);
        }
        else if(s = srcItem.r) {
          desItem = object();
          desItem.r = s;
        }
        else {
          desItem = expandSymbol(srcItem, param);
        }
        if(s = srcItem.R) {
          desItem.R = expand(s, srcItem.A, param);
        }
        if(s = srcItem.f) {
          desItem.f = s;
        }
        desProduc[i] = desItem;
      }
    }
    return desSymbol;
  }

  function expand(name, arg, param) {
    if(arg) {
      arg = split(arg, ',');
      for (var i = 0, f, a; a = arg[i]; i++) {
        f = a[0];
        a = slice(a, 1);
        if (f === '+' || f === '?' && indexOf(param, a) >= 0)
          name += a;
      }
    }
    used[name] = 1;
    return name;
  }
}

function linkGrammar(srcGrammar) {
  var desGrammar = object(), linked = object();
  for(var srcSymbolIdx=srcGrammar.length, srcSymbol; srcSymbol = srcGrammar[--srcSymbolIdx];) {
    if(srcSymbol.a === '#') {
      var name = srcSymbol.n;
      var desSymbol = linkSymbol(name, []);
      desGrammar[name] = desSymbol;
    }
  }

  return desGrammar;

  function linkSymbol(name, trail) {
    var i = indexBy(trail, name);
    if( i >=0)
      throw error('Circle grammar: %s->%s', join(piece(trail, i), '->'), name);

    var desSymbol = linked[name];
    if(!srcSymbol) {
      desSymbol = linked[name] = object();
      srcSymbol = srcGrammar[name];
      if(srcSymbol)
        throw error('Undefined symbol: %s', name);
      push(trail, name);

      for(var srcProducIdx=0, srcProduc; srcProduc = srcSymbol[srcProducIdx]; srcProducIdx++) {
        var option = 1;
        for(var srcItemIdx=0, srcItem; srcItem = srcProduc[srcItemIdx]; srcItemIdx++) {

        }
      }

      pop(trail);
    }
  }
}

function compressGrammar(text) {
  var words = [], w=0, ms, p = 0, s, x;
  reGrammarWords.lastIndex = 0;
  while(ms = scan(reGrammarWords, text)) {
    if(s = ms[NAME]) {
      if(x = ms[PARAMS])
        s += '[' + x + ']';
      s += ms[AS];
      if(!p && w>0) {
        words[w-1] = s;
      }
      else {
        words[w++] = s;
      }
      p = 0;
    }
    else if(ms[DIVS]) {
      if(p) {
        words[w++] = '|';
        p = 0;
      }
    }
    else if(s = ms[BY]) {
      words[w++] = '[' + s + ms[USE] + ']';
      p = 1;
    }
    else {
      s = ms[TAG];
      if (x = ms[BEG]) {
        s += x;
        words[w++] = s;
        p = 0;
      }
      else {
        if(x = ms[SYM]){
          s += x;
          if(x = ms[ARGS]) s += '[' + x + ']';
        }
        else if(x = ms[REG]) {
          s += x;
        }
        else {
          s = ms[END];
        }

        if (x = ms[RSYM]) {
          s += x;
          if (x = ms[RARGS])
            s += '[' + x + ']';
        }
        if(s === '}' && !p ) {
          words[w-1] = s;
        }
        else {
          words[w++] = s;
        }
        p = 1;
      }
    }
  }
  if(!p) words.pop();
  return words.join(' ');
}

