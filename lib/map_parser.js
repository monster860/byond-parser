'use strict';
const pre_parse = require('./pre_parser.js');
const ByondMap = require('./map');

module.exports = function parse_map(text, file) {
	let lines = pre_parse(text, file);
	let map = new ByondMap(this);
	map.key_len = 0;
	let map_matches = [];
	let reverse_map = new Map();
	for(let line of lines) {
		let match;
		if((match = line.text.match(/\((\d*) ?, ?(\d*) ?, ?(\d*) ?\) ?= ?\{?("[^"]+")\}?/i))) {
			map_matches.push(match);
			continue;
		}
		if((match = line.text.match(/"([a-zA-Z]*)" ?= ?\((.+)\)/i)) != null) {
			//console.log(match);
			let inst = ByondMap.TileInstance.from_string(map, match[2]);
			map.key_to_instance.set(match[1], inst);
			if(map.key_len == 0) {
				map.key_len = match[1].length;
			}
		}
		//console.log(line.text);
	}
	for(let match of map_matches) {
		let part_x = +match[1];
		let part_y = +match[2];
		let part_z = +match[3];
		let cursor_x = 0;
		let cursor_y = 0;
		for(let line of JSON.parse(match[4]).split("\n")) {
			line = line.trim();
			if(!line)
				continue;
			for(let i = 0; i < line.length; i += map.key_len) {
				let key = line.substr(i, map.key_len);
				let x = part_x + cursor_x;
				let y = part_y + cursor_y;
				reverse_map.set(`[${x},${y},${part_z}]`, key);

				map.maxx = Math.max(x, map.maxx);
				map.maxy = Math.max(y, map.maxy);
				map.maxz = Math.max(part_z, map.maxz);
				map.minx = Math.min(x, map.minx);
				map.miny = Math.min(y, map.miny);
				map.minz = Math.min(part_z, map.minz);

				cursor_x++;
			}
			cursor_y++;
			cursor_x = 0;
		}
	}
	for(let [coords, key] of reverse_map) {
		let [x,y,z] = JSON.parse(coords);
		map.coords_to_key.set(`[${x},${map.maxy+map.miny-y},${z}]`, key);
	}
	return map;
};
