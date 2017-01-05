'use strict'

var _ = require('lodash')

function filterFilter(){
	return function(array, filterExpr){
		var predicateFn;
		if (_.isFunction(filterExpr)) {
			predicateFn = filterExpr;
		} else if (_.isString(filterExpr) || 
					_.isNumber(filterExpr) || 
					_.isBoolean(filterExpr) || 
					_.isNull(filterExpr) ||
					_.isObject(filterExpr)){
			predicateFn = createPredicateFn(filterExpr);
		} else {
			return array;
		}
		return _.filter(array, predicateFn)
	}
}

function createPredicateFn(expression){
	
	//具体比较	
	function comparator(actual, expected) {
		if (_.isNull(actual) || _.isNull(expected)) {
			return actual === expected;
		} else if (_.isUndefined(actual)) {
			return false;
		} else {
			actual = ('' + actual).toLowerCase();
			expected = ('' + expected).toLowerCase();
			return actual.indexOf(expected) !== -1;	
		}

	}

	//入口
	return function predicateFn(item){
		return deepCompare(item, expression, comparator);
	}
}

//分配比较
function deepCompare(item, expression, comparator){
	if (_.isString(expression) && _.startsWith(expression, '!')){
		return !deepCompare(item, expression.substring(1), comparator)
	} else if (_.isObject(item)){
		 if (_.isObject(expression)){
		 	return _.every(expression,function(actualVal, actualName){
		 		if (_.isUndefined(actualVal)) {
		 			return true;
		 		}
		 		return deepCompare(item[actualName], actualVal, comparator)
		 	})
		} else {
			return _.some(item, function(i){
				return deepCompare(i, expression, comparator)
			});	
		}
	} else if (_.isArray(item)){
		return _.some(item, function(itemItem){
			return deepCompare(itemItem, expression, comparator)
		})
	} else {
		return comparator(item, expression);
	}
}




module.exports = filterFilter;