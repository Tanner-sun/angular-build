'use strict';
var _ = require('lodash');
function $HttpProvider() {
	this.$get = ['$httpBackend', '$q', '$rootScope',
		function($httpBackend, $q, $rootScope) {
			return function $http(requestConfig) {
				var deferred = $q.defer();
				//配置默认对象
				var config = _.extend({
					method: 'GET'
				}, requestConfig)
				//新增辅助函数
				function done(status, response, statusText){
					status = Max.max(status, 0);
					deferred[isSuccess(status) ? 'resolve' : 'reject']({
						status: status,
						data: response,
						statusText: statusText,
						config: config
					});
					if (!$rootScope.$$phase) {
						$rootScope.$apply();
					}
				}
				//检测状态
				function isSuccess(status) {
					return status >= 200 && status < 300
				}

				$httpBackend(config.method, config.url, config.data, done, config.headers);
				return deferred.promise;
			}
	}];
}

module.exports = $HttpProvider;