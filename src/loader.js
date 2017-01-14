'use strict';
function setupModuleLoader(window){
	var ensure = function(obj, name, factory){
		return obj[name] || (obj[name] = factory());
	};
	var angular = ensure(window, 'angular', Object);
	var createModule = function(name, requires, modules, configFn){
		if (name === "hasOwnProperty") {
			throw "hasOwnProperty is not a valid module name";
		}
		var invokeQueue = [];

		//queue method
		var invokeLater = function(service, method, arrayMethod, queue){
			return function(){
				queue = queue || invokeQueue;
				//在需要将item加入数组中，并且并不明确采用何种加入数组的方式时。
				//采用如此代码编写方法会更好
				queue[arrayMethod || 'push']([service, method, arguments]);
				//链式调用
				return moduleInstance;
			}
		};
		var moduleInstance = {
			name: name,
			requires: requires,
			constant: invokeLater('$provide', 'constant', 'unshift'),
			provider: invokeLater('$provide', 'provider'),
			config: invokeLater('$injector', 'invoke', 'push', configBlocks)
			run: function(fn){
				moduleInstance._runBlocks.push(fn);
				return moduleInstance;
			},
			factory: invokeLater('$provide', 'factory'),
			value: invokeLater('$provide', 'value'),
			service: invokeLater('$provide', 'service'),
			decorator: invokeLater('$provide', 'decorator'),
			_invokeQueue: invokeQueue,
			_configBlocks: configBlocks,
			_runBlocks: []
		};
		if (configFn) {
			moduleInstance.config(configFn)
		}
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
		return function(name, requires, configFn){
			if (requires) {
				return createModule(name, requires, modules, configFn);
			} else {
				return getModule(name, modules);
			}
			
		}
	})
}
module.exports = setupModuleLoader;
