'use strict';

var _ = require('lodash');

var ESCAPES = {'n':'\n', 'f':'\f', 'r':'\r', 't':'\t', 'v':'\v', '\'':'\'', '"':'"'};

function Lexer() {
}

Lexer.prototype.lex = function(text) {
  this.text = text;
  this.index = 0;
  this.ch = undefined;
  this.tokens = [];

  //对input的text创建两个循环 如'akey.anotherKey[key]'
  //第一个循环：根据字符确定采用哪种函数进行处理。如字符串？数字？标识符？[],{}:.()？
  //第二个循环：进入相应处理函数，采用循环遍历每个字符。
  //@return tokens数组：akey . anotherKey [ key ]

  while (this.index < this.text.length) {
    this.ch = this.text.charAt(this.index);
    if (this.isNumber(this.ch) ||
         (this.is('.') && this.isNumber(this.peek()))) {
      this.readNumber();
    } else if (this.is('\'"')) {
      this.readString(this.ch);
    //遇到[],{}:.() 仅push进入到tokens  
    } else if (this.is('[],{}:.()')) {
      this.tokens.push({
        text: this.ch
      });
      this.index++;
    } else if (this.isIdent(this.ch)) {
      this.readIdent();
    } else if (this.isWhitespace(this.ch)) {
      this.index++;
    } else {
      throw 'Unexpected next character: ' + this.ch;
    }
  }

  return this.tokens;
};

Lexer.prototype.is = function(chs) {
  return chs.indexOf(this.ch) >= 0;
};
Lexer.prototype.isNumber = function(ch) {
  return '0' <= ch && ch <= '9';
};
Lexer.prototype.isExpOperator = function(ch) {
  return ch === '-' || ch === '+' || this.isNumber(ch);
};
Lexer.prototype.isIdent = function(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
         ch === '_' || ch === '$';
};
Lexer.prototype.isWhitespace = function(ch) {
  return ch === ' ' || ch === '\r' || ch === '\t' ||
         ch === '\n' || ch === '\v' || ch === '\u00A0';
};

Lexer.prototype.readNumber = function() {
  var number = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index).toLowerCase();
    if (ch === '.' || this.isNumber(ch)) {
      number += ch;
    } else {
      var nextCh = this.peek();
      var prevCh = number.charAt(number.length - 1);
      if (ch === 'e' && this.isExpOperator(nextCh)) {
        number += ch;
      } else if (this.isExpOperator(ch) && prevCh === 'e' &&
                 nextCh && this.isNumber(nextCh)) {
        number += ch;
      } else if (this.isExpOperator(ch) && prevCh === 'e' &&
                 (!nextCh || !this.isNumber(nextCh))) {
        throw 'Invalid exponent';
      } else {
        break;
      }
    }
    this.index++;
  }
  number = 1 * number;
  this.tokens.push({
    text: number,
    value: Number(number)
  });
};

Lexer.prototype.readString = function(quote) {
  this.index++;
  var string = '';
  var escape = false;
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (escape) {
      if (ch === 'u') {
        var hex = this.text.substring(this.index + 1, this.index + 5);
        if (!hex.match(/[\da-f]{4}/i)) {
          throw 'Invalid unicode escape';
        }
        this.index += 4;
        string += String.fromCharCode(parseInt(hex, 16));
      } else {
        var replacement = ESCAPES[ch];
        if (replacement) {
          string += replacement;
        } else {
          string += ch;
        }
      }
      escape = false;
    } else if (ch === quote) {
      this.index++;
      this.tokens.push({
        text: string,
        value: string
      });
      return;
    } else if (ch === '\\') {
      escape = true;
    } else {
      string += ch;
    }
    this.index++;
  }
};

Lexer.prototype.readIdent = function() {
  var text = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (this.isIdent(ch) || this.isNumber(ch)) {
      text += ch;
    } else {
      break;
    }
    this.index++;
  }
  //获取标识符完整信息
  var token = {
    text: text,
    identifier: true
  };

  this.tokens.push(token);
};

Lexer.prototype.peek = function() {
  return this.index < this.text.length - 1 ?
    this.text.charAt(this.index + 1) :
    false;
};

//构成AST树
function AST(lexer) {
  this.lexer = lexer;
}

//不同的token node节点类型
AST.Program = 'Program';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
AST.ObjectExpression = 'ObjectExpression';
AST.Property = 'Property';
AST.Identifier = 'Identifier';
AST.ThisExpression = 'ThisExpression';
AST.MemberExpression = 'MemberExpression';
AST.LocalsExpression = 'LocalsExpression';
AST.CallExpression = 'CallExpression';


AST.prototype.ast = function(text) {
  //tokens添加到AST对象上去
  this.tokens = this.lexer.lex(text);
  return this.program();
};
AST.prototype.program = function() {
  return {type: AST.Program, body: this.primary()};
};
//不断shift this.tokens数组，并对数组中的元素根据类型生成不同的tree node
AST.prototype.primary = function() {
  var primary;
  if (this.expect('[')) {
    primary = this.arrayDeclaration();
  } else if (this.expect('{')) {
    primary = this.object();
  } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
    primary = this.constants[this.consume().text];
  //标识符有identifier字段
  } else if (this.peek().identifier){
    primary = this.identifier();
  } else{
    primary = this.constant();
  }
  //如果是key.value形式，则primary被替换掉 替换如下形式
  //primary是key标识符对应的标识符对象
  //property对应的是value标识符对应的标识符对象
  //this.identifier()执行完成以后 判断while条件是否成立
  var next;
  while((next = this.expect('.','[','('))){
    if(next.text === '['){
      primary = {
        type: AST.MemberExpression,
        object: primary,
        //注意[]内的量需要重新primary确定
        property: this.primary(),
        computed: true
      };
      this.consume(']');
    } else if(next.text === '.'){
      primary = {
        type: AST.MemberExpression,
        object: primary,
        //.的时候只能采用identifier，无需再primary
        property: this.identifier(),
        computed: false
      };
    } else if(next.text === '('){
      primary = {
        type: AST.CallExpression,
        callee: primary,
        arguments: this.parseArguments()
      }
      this.consume(')');
    }
  }

  return primary;
};
AST.prototype.arrayDeclaration = function() {
  var elements = [];
  if (!this.peek(']')) {
    do {
      if (this.peek(']')) {
        break;
      }
      //对每个数组元素都需递归进行this.primary()处理。
      elements.push(this.primary());
    } while (this.expect(','));
  }
  this.consume(']');
  return {type: AST.ArrayExpression, elements: elements};
};
AST.prototype.object = function() {
  var properties = [];
  if (!this.peek('}')) {
    do {
      var property = {type: AST.Property};
      //key处理
      if (this.peek().identifier) {
        property.key = this.identifier();
      } else {
        property.key = this.constant();
      }
      this.consume(':');
      //value的primary处理
      property.value = this.primary();
      properties.push(property);
    } while (this.expect(','));
  }
  this.consume('}');
  return {type: AST.ObjectExpression, properties: properties};
};
//name: key
AST.prototype.identifier = function() {
  return {type: AST.Identifier, name: this.consume().text};
};
AST.prototype.constant = function() {
  return {type: AST.Literal, value: this.consume().value};
};
AST.prototype.expect = function(e1, e2, e3, e4) {
  var token = this.peek(e1, e2, e3, e4);
  if (token) {
    //注意shift的使用
    return this.tokens.shift();
  }
};
AST.prototype.peek = function(e1, e2, e3, e4) {
  if (this.tokens.length > 0) {
    var text = this.tokens[0].text;
    if (text === e1 ||text === e2 ||text === e3 ||text === e4 || (!e1 && !e2 && !e3 && !e4)) {
      return this.tokens[0];
    }
  }
};
AST.prototype.consume = function(e) {
  var token = this.expect(e);
  if (!token) {
    throw 'Unexpected. Expecting: ' + e;
  }
  return token;
};
AST.prototype.parseArguments = function() {
  var args = [];
  if (!this.peek(')')) {
    do{
      args.push(this.primary());
    }while(this.expect(','))
  }
  return args;
};

AST.prototype.constants = {
  'null': {type: AST.Literal, value: null},
  'true': {type: AST.Literal, value: true},
  'false': {type: AST.Literal, value: false},
  'this': {type: AST.ThisExpression},
  '$locals': {type: AST.LocalsExpression}
};

function ASTCompiler(astBuilder) {
  this.astBuilder = astBuilder;
}

ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: [],nextId: 0, vars: []};
  this.recurse(ast);
  /* jshint -W054 */
  return new Function('s','l',(this.state.vars.length ? 'var '+this.state.vars.join(',')+';' : '') + this.state.body.join(''));
  /* jshint +W054 */
};
//递归 不同的tree Node生成不同的表达式 以供new Function使用
ASTCompiler.prototype.recurse = function(ast, context) {
  var intoId;
  switch (ast.type) {
    //根节点
    case AST.Program:
      this.state.body.push('return ', this.recurse(ast.body), ';');
      break;
    //字面量  
    case AST.Literal:
      return this.escape(ast.value);
    //数组  
    case AST.ArrayExpression:
      var elements = _.map(ast.elements, _.bind(function(element) {
        return this.recurse(element);
      }, this));
      return '[' + elements.join(',') + ']';
    //对象  
    case AST.ObjectExpression:
      var properties = _.map(ast.properties, _.bind(function(property) {
        var key = property.key.type === AST.Identifier ?
          property.key.name :
          this.escape(property.key.value);
        var value = this.recurse(property.value);
        return key + ':' + value;
      }, this));
      return '{' + properties.join(',') + '}';
    //标识符  
    case AST.Identifier:
        intoId = this.nextId();
        this.if_(this.getHasOwnProperty('l', ast.name),
          this.assign(intoId, this.nonComputedMember('l', ast.name)));
        this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + ' && s',
          this.assign(intoId, this.nonComputedMember('s', ast.name)));
        if (context) {
          context.context = this.getHasOwnProperty('l',ast.name) + '?l:s';
          context.name = ast.name;
          context.computed = false;
        }
      return intoId;
    //this 
    case AST.ThisExpression:
      return 's';
    //成员表达式  
    case AST.MemberExpression:
      intoId = this.nextId();
      var left = this.recurse(ast.object);
      if(context){
        context.context = left;
      }
      if(ast.computed){
        var right = this.recurse(ast.property);
        this.if_(left,
          this.assign(intoId, this.computedMember(left, right)));
        if(context){
          context.name = right;
          context.computed = true;
        }
      }else{
        this.if_(left,
          this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
        if(context){
          context.name = ast.property.name;
          context.computed = false;
        }
      }
      return intoId;
    //$Locals  
    case AST.LocalsExpression:
      return 'l';
    //函数调用  
    case AST.CallExpression:
      var callContext = {};
      var callee = this.recurse(ast.callee, callContext);
      var args = _.map(ast.arguments,_.bind(function(arg){
        return this.recurse(arg);
      },this));
      if (callContext.name) {
        if (callContext.computed) {
          callee = this.computedMember(callContext.context,callContext.name);
        } else {
          callee = this.nonComputedMember(callContext.context,callContext.name);
        }
      }
      return callee + '&&' + callee + '(' + args.join(',') +')';     
  }
};

ASTCompiler.prototype.stringEscapeRegex = /[^ a-zA-Z0-9]/g;
ASTCompiler.prototype.stringEscapeFn = function(c) {
  return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
};
ASTCompiler.prototype.escape = function(value) {
  if (_.isString(value)) {
    return '\'' + value.replace(this.stringEscapeRegex, this.stringEscapeFn) + '\'';
  } else if (_.isNull(value)) {
    return 'null';
  } else {
    return value;
  }
};
//计算a.b
ASTCompiler.prototype.nonComputedMember = function(left, right){
  return '(' + left + ').' + right;
};
ASTCompiler.prototype.computedMember = function(left, right){
  return '(' + left + ')[' + right + ']';
};

//生成if语句，并push到body中
ASTCompiler.prototype.if_ = function(test, consequent){
  this.state.body.push('if ('  , test , ')' + '{' , consequent , '}');
};
//生成id = value；
ASTCompiler.prototype.assign = function(id, value){
  return id + '=' + value + ';';
};
//生成nextId；
ASTCompiler.prototype.nextId = function(){
  return 'v' + (this.state.nextId++);
};
ASTCompiler.prototype.not = function(e){
  return '!(' + e + ')';
};
//注意此时是在构建函数 注意操作符之间的空格。如下in左右必须有空格，否则就不是in操作符。
ASTCompiler.prototype.getHasOwnProperty = function(object,property){
  return object + '&&(' + this.escape(property) + ' in ' + object + ')';
};



function Parser(lexer) {
  this.lexer = lexer;
  this.ast = new AST(this.lexer);
  this.astCompiler = new ASTCompiler(this.ast);
}

Parser.prototype.parse = function(text) {
  return this.astCompiler.compile(text);
};


function parse(expr) {
  var lexer = new Lexer();
  var parser = new Parser(lexer);
  return parser.parse(expr);
}

module.exports = parse;
