'use strict';
function setupModuleLoader(window){
	var ensure = function(obj, name, factory){
		return obj[name] || (obj[name] = factory());
	};
	var angular = ensure(window, 'angular', Object);
	var createModule = function(name, requires, modules){
		if (name === "hasOwnProperty") {
			throw "hasOwnProperty is not a valid module name";
		}
		var invokeQueue = [];
		var invokeLater = function(method){
			return function(){
				invokeQueue.push([method, arguments]);
				//链式调用
				return moduleInstance;
			}
		}
		var moduleInstance = {
			name: name,
			requires: requires,
			constant: invokeLater('constant'),
			provider: invokeLater('provider'),
			_invokeQueue: invokeQueue
		};
		modules[name] = moduleInstance;
		return moduleInstance;
	};
	var getModule = function(name, modules){
		//因为用到了hasOwnProperty方法，所以不能定义这个名称的属性。
		if (modules.hasOwnProperty(name)) {
			return modules[name];
		} else {
			throw 'modules' + name + 'is not available!'
		}
		
	}
	ensure(angular, 'module', function(){
		var modules = {};
		return function(name, requires){
			if (requires) {
				return createModule(name, requires, modules);
			} else {
				return getModule(name, modules);
			}
			
		}
	})
}
module.exports = setupModuleLoader;
