'use strict';

//三种依赖注入方法：1）fn.$inject 2)['a','b',fn] 3)fn(a,b)
var _ = require('lodash');
var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var FN_ARG = /^\s*(_?)(\S+)\1\s*$/;
//注意//后的内容都会被注释掉，所以用$结尾，并且添加m属性
var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg;

function createInjector(modulesToLoad, strictDi){
	var cache = {};
	var loadModules = {};
	strictDi = (strictDi === true);
	var $provide = {
		constant: function(key, value){
			if (key === 'hasOwnProperty') {
				throw 'hasOwnProperty is not a valid constant name!'
			}
			cache[key] = value;
		},
		provider: function(key, provider){
			cache[key] = invoke(provider.$get, provider);
		}
	};
	function annotate(fn){
		if (_.isArray(fn)) {
			return fn.slice(0, fn.length -1);
		} else if (fn.$inject) {
			return fn.$inject;
		//函数的length属性指的是函数形参的数目
		} else if (!fn.length) {
			return [];
		} else {
			if (strictDi) {
				throw '“fn is not using explicit annotation and ' + 'cannot be invoked in strict mode';
			}
			var source = fn.toString().replace(STRIP_COMMENTS,'');
			var argDeclaration = source.match(FN_ARGS);
			return _.map(argDeclaration[1].split(','), function(argName){
				return argName.replace(FN_ARG, '$2');
			});
		}
	};
	function invoke(fn, self, locals){
		var args = _.map(annotate(fn), function(token){
			if (_.isString(token)) {
				return locals && locals.hasOwnProperty(token) ?
				 locals[token] : cache[token];
			} else {
				throw 'Incorrect injection token! Expected a string, got' + token;
			}
		});
		if (_.isArray(fn)) {
			fn = _.last(fn);
		}
		return fn.apply(self, args);
	};
	function instantiate (Type, locals) {

		var UnwrappedType = _.isArray(Type) ? _.last(Type) : Type;
		//Object.create(构造函数的原型对象)用于创建一个对象，并且该对象的__proto__指向传入传入的对象
		var instance = Object.create(UnwrappedType.prototype);

		invoke(Type, instance, locals);
		return instance;
	};
	_.forEach(modulesToLoad, function loadModule(moduleName){
		if (!loadModules.hasOwnProperty(moduleName)){
			loadModules[moduleName] = true;
			var module = window.angular.module(moduleName);
			_.forEach(module.requires, loadModule);
			_.forEach(module._invokeQueue, function(invokeArgs){
				var method = invokeArgs[0];
				var args = invokeArgs[1];
				$provide[method].apply($provide, args);
			})
		}

	})
	return {
		has: function(key){
			return cache.hasOwnProperty(key);
		},
		get: function(key){
			return cache[key];
		},
		invoke: invoke,
		annotate: annotate,
		instantiate: instantiate
	};
}
module.exports = createInjector;
