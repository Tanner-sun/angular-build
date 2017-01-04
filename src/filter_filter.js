'use strict'

var _ = require('lodash')

function filterFilter(){
	return function(array, filterExp){
		return _.filter(array, filterExp)
	}
}

module.exports = filterFilter;