'ust strict';
var _ = require('lodash');

function hashkey(value) {
	var type = typeof value;
	var uid;
	if (type === 'function' || 
		(type === 'object' && value != nul)) {
		uid = value.$$hashkey;
		if (typeof uid === 'function') {
			uid = value.$$hashkey();
		} else if (uid === undefined) {
			uid = value.$$hashkey = _.uniqueId();
		}
	} else {
		uid = value;
	}
	return type + ':' + uid;
};

function HashMap(){

};
HashMap.prototype = {
	put: function(key, value){
		this[hashkey(key)] = value;
	},
	get: function(key){
		return this[hashkey(key)];
	},
	remove: function(key){
		key = hashkey(key);
		var value = this[key];
		delete this[key];
		return value;
	}
}
module.exports = {
	hashkey: hashkey,
	HashMap: HashMap
}