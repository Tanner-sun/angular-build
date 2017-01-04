'use strict'

var _ = require('lodash')

function filterFilter(){
	var com
	return function(array, filterExp){
		var predicateFn;
		if (_.isFunction(filterExp)) {
			predicateFn = filterExp;
		} else if (_.isString(filterExp)){
			predicateFn = createPredicateFn(filterExp);
		} else {
			return array;
		}
		return _.filter(array, predicateFn(item))
	}
}

function createPredicateFn(filterExp){
	return function(item){
		var item = item.toLowerCase();
		var filterExp = item.toLowerCase();
		return item.indexOf(filterExp) > -1;
	}
}

module.exports = filterFilter;