'use strict';
module.exports = {
	split_by_quotes(str) {
		let split = [];
		let curr_str = '';
		let escaping = false;
		for(let i = 0; i < str.length; i++) {
			let c = str[i];
			if(escaping || c == '\\') {
				curr_str += c;
				escaping = !escaping;
				continue;
			}
			if(c == '"') {
				split.push(curr_str);
				curr_str = '';
				continue;
			}
			curr_str += c;
		}
		split.push(curr_str);
		return split;
	}
};
