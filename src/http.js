'use strict';
var _ = require('lodash');
function $HttpProvider() {
	this.$get = ['$httpBackend', '$q', '$rootScope',
		function($httpBackend, $q, $rootScope) {
			return function $http(requestConfig) {
				var deferred = $q.defer();
				var defaults = {
					headers: {
						common: {
							Accept: 'application/json, text/plain, */*'
						},
						post: {
							'Content-Type': 'application/json;charset=utf-8'
						},
						put: {
							'Content-Type': 'application/json;charset=utf-8'
						},
						patch: {
							'Content-Type': 'application/json;charset=utf-8'
						}
					}
				}
				//配置默认对象
				var config = _.extend({
					method: 'GET'
				}, requestConfig);
				config.headers = mergeHeaders(requestConfig);
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
				//处理请求头
				function mergeHeaders(requestConfig){
					return _.extend(
							{},
							defaults.headers.common,
							defaults.headers[(config.method || 'get').toLowerCase()],
							config.headers
						);
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