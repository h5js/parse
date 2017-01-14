var                 TITLE=1,                                  DIV=2,          QUALIFY=3,    END=5,                 SYM=7,                                         REG=8,                                                    REFINE=9,                               KEY=10,MID=11,
reInitGrammar = /(\$?[a-zA-Z]\w*(?:\[\w+(?:,\w+)*\])?)\s*:|([\n\r|]|#.*)|\[([+~])(\w+)\]|(\})|([?+*~!&=])?(?:(?:([a-zA-Z]\w*(?:\[[?+~]\w+(?:,[?+~]\w+)*\])?)|\/((?:[^\/\\[\n\r]|\\.|\[(?:[^\]\\\n\r]|\\.)*\])+)\/)(?:[>=](\w+(?:\[[?+~]\w+(?:,[?+~]\w+)*\])?))?|`(\w+)`|(\{)|(\S+))/g,
                                                                                    USE=4,       FLAG=6,                                                                                                                                                                        REST=12;
function initGrammar(text) {
  var grammar = object(), text_end = text.length;
  var re = reInitGrammar, got;
  re.lastIndex = 0;
  // var token = get();
  // if (!token)
  //   throw error('Grammar is empty.');
  // grammar.$ = token.s;   //记录语法根符号

  while (token = get(1)) {
    if (token.t !== TITLE)
      throw error('Grammar error: %s', token.s);
    var symbol = getSymbol(token.s);
    grammar[token.s] = symbol;
    if(token.r) symbol.r = token.r;
    if(token.p) symbol.p = token.p;
  }

  return grammar;

  function getSymbol(name) {
    var symbol = object(), p = 0;
    var produc = object(), i = 0;
    var token, item;
    while (token = get()) {
      var type = token.t;
      if(type === SYM || type === REG) {
        get(1);
        if(token.r) {
          item = object();
          item.s = token.s;
          item.r = token.r;
        }
        else {
          item = token.s;
        }
        produc[i++] = item;
      }
      else if(type === MID) {
        get(1);
        item = getSymbol();
        if(token.f) item.f = token.f;
        produc[i++] = item;
      }
      else {
        if (i) {
          symbol[p++] = produc;
          produc = object(), i = 0;
        }
        if(type === TITLE) {
          if (!name)
            throw error('Grammar error: %s', token.s);
          break;
        }
        get(1);
        if (type === END) {
          if (name)
            throw error('Grammar error: %s', token.s);
          break;
        }
        if(type === QUALIFY) {
          produc.q = token.q, produc.u = token.u;
        }
      }
    }
    if (i)
      symbol[p] = produc;
    return symbol;
  }

  function get(out) {
    var token;
    if (got) {
      token = got;
      if (out) got = 0;
    }
    else if (re.lastIndex < text_end) {
      var ms = scan(re, text);
      if (ms) {
        token = object();
        var s;
        if (s = ms[TITLE]) {
          token.t = TITLE, token.s = s;
        }
        else if (ms[DIV]) {
          token.t = DIV;
        }
        else if (s = ms[QUALIFY]) {
          token.t = QUALIFY, token.q = s, token.u = ms[USE];
        }
        else if (ms[END]) {
          token.t = END;
        }
        else {
          var f = ms[FLAG] || '';
          if (s = ms[SYM]) {
            token.t = SYM;
            token.s = f + s;
            if(s = ms[REFINE]) {
              token.r = s;
            }
          }
          else if (s = ms[REG]) {
            token.t = REG;
            token.s = f + s + '|';
            if(s = ms[REFINE]) {
              token.r = s;
            }
          }
          else if (s = ms[KEY]) {
            token.t = REG;
            token.s = f + '\\b' + s + '\\b|';
          }
          else if (ms[MID]) {
            token.t = MID;
            if(f) token.f = f;
          }
          else /* ms[REST] */ {
            token.t = REG;
            token.s = f + ms[REST] + '|';
          }
        }
        if (!out) got = token;
      }
      else {
        text_end = 0;
      }
    }
    return token;
  }
}

var reNameParams = /(\w+)\[(\w+(?:,\w+)*)\]/;
var reSymArgs = /(\w+)\[([?+~]\w+(?:,[?+~]\w+)*)\]/g;
function expandGrammar(srcGrammar) {
  var desGrammar = object();

  var srcNames = getOwnPropertyNames(srcGrammar);
  for (var sn = 0, srcName; srcName = srcNames[sn]; sn++) {
    var srcSymbol = srcGrammar[srcName];
    var params, ms;
    params = (ms = match(srcName, reNameParams)) ? (srcName = ms[1], split(ms[2], ',')) : [];
    // 生成可能的符号参数组合：
    for (var mix = 1, len = params.length; mix < len; mix++)
      for (var bas = 0, end = len - mix; bas < end; bas++)
        for (var pos = bas + 1; pos <= end; pos++)
          push(params, params[bas] + join(piece(params, pos, pos + mix), ''));

    // 从符号初始符号名开始，生成所有参数组合后的可能的符号：
    var param = '';   // 初始符号名的后缀参数为空
    for (var p = -1; p < params.length;) {  // p 从 -1 开始将先处理初始符号名
      var desSymbol = object();
      var desName = srcName + param;
      desSymbol._ = desName;    // for debug

      for (var dp = 0, sp = 0, srcProduc; srcProduc = srcSymbol[sp]; sp++) {
        var use;
        if( (use = srcProduc.u ) && (indexOf(param, use)<0) ^ (srcProduc.q==='~') )
          continue;

        var desProduc = desSymbol[dp++] = object();

        // 对每一产生项进行后缀变异：
        for (var i = 0, item; item = srcProduc[i]; i++) {
          desProduc[i] = replace(item, reSymArgs, function (s, name, args) {
            args = split(args, ',');
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
}

function makeGrammar(grammar) {

}

function linkGrammar(grammar) {

}