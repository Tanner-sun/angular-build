'ust strict';
function hashkey(value) {
	var type = typeof value;
	return type + ':' + value;
};
module.exports = {hashkey, hashkey}