'use strict';
var _ = require('lodash')

function $QProvider() {
	this.$get = ['$rootScope', function($rootScope) {
		//Promise部分
		function Promise() {
			this.$$state = {};
		}
		Promise.prototype.then = function(onFullfilled, onRejected){
			//新建一个Deferred
			var result = new Deferred();
			this.$$state.pending = this.$$state.pending || [];
			this.$$state.pending.push([result, onFullfilled, onRejected]);
			if (this.$$state.status > 0) {
				scheduleProcessQueue(this.$$state);
			}
			return result.promise;
		}
		Promise.prototype.catch = function(onRejected){
			return this.then(null, onRejected);
		}
		Promise.prototype.finally = function(callback){
			return this.then(function() {
				callback();
			}, function() {
				callback();
			});
		}

		//Deferred部分
		function Deferred() {
			this.promise = new Promise();
		}
		Deferred.prototype.reslove = function(value){
			if (this.promise.$$state.status) {
				return;
			}
			if (value && _.isFunction(value.then)){
				//this指向当前的Defered，非value
				value.then(
					_.bind(this.reslove, this),
					_.bind(this.reject, this))
			} else {
				this.promise.$$state.value = value;
				this.promise.$$state.status = 1;
				scheduleProcessQueue(this.promise.$$state);
			}

		}
		Deferred.prototype.reject = function(reason){
			if (this.promise.$$state.status) {
				return;
			}
			this.promise.$$state.value = reason;
			this.promise.$$state.status = 2;
			scheduleProcessQueue(this.promise.$$state);
		}

		//辅助函数
		//
		function scheduleProcessQueue(state) {
			$rootScope.$evalAsync(function(){
				processQueue(state);
			})
		}
		//执行队列中放置的函数
		function processQueue(state){
			var pending = state.pending;
			state.pending = undefined;
			_.forEach(pending, function(handlers){
				var deferred = handlers[0];
				var fn = handlers[state.status];
				try {
					if (_.isFunction(fn)) {
						//链式调用的核心，调用新deferred的resolve方法，并且其参数是原callback执行的结果
						deferred.resolve(fn(state.value));
					} else if (state.status == 1) {
						deferred.resolve(state.value);
					} else {
						deferred.reject(state.value);
					}
				} catch (e) {
					deferred.reject(e);
				}

			});
		}

		//入口函数
		function defer() {
			return new Deferred();
		}
		return {
			defer: defer
		}
	}];
}
module.exports = $QProvider;