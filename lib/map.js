'use strict';

class ByondMap { // I was originally going to call it just Map but then I realized that there was already a builtin js class called Map.
	constructor(env) {
		this.env = env;
		this.key_to_instance = new Map();
		this.coords_to_key = new Map();
		this.key_len = 2;

		this.minx = 1;
		this.miny = 1;
		this.minz = 1;
		this.maxx = 1;
		this.maxy = 1;
		this.maxz = 1;
	}
}

class TileInstance {
	constructor(map, objs) {
		this.map = map;
		this.objs = objs;
	}

	static from_string(map, str) {
		// This regex matches modified types: /blah/blah{a = "b"; c = 23}
		let pattern = /[\w/]+(?:\{(?:"(?:\\"|[^"])*?"|[^}])*?\})?(?=,|$)/ig;
		let objs = [];
		let match;
		while((match = pattern.exec(str))) {
			objs.push(ObjInstance.from_string(map, match[0]));
		}
		return new TileInstance(map, objs);
	}
}

class ObjInstance {
	constructor(map, type) {
		this.map = map;
		this.type = map.env.items[type];
		if(!this.type)
			throw new Error(`Unrecognized type ${type}`);
		this.vars = Object.create(this.type.vars);
	}
	static from_string(map, str) {
		if(!str.includes("{")) {
			return new ObjInstance(map, str);
		}
		let inst_match = str.match(/([\w/]+)\{(.*)\}/i);
		if(inst_match) {
			let inst = new ObjInstance(map, inst_match[1].trim());
			let vm = /([\w]+) ?= ?((?:"(?:\\"|[^"])*"|[^;])*)(?:$|;)/ig;
			let match;
			while((match = vm.exec(inst_match[2]))) {
				inst.vars[match[1]] = match[2];
			}
			return inst;
		}
	}
}

ByondMap.TileInstance = TileInstance;
ByondMap.ObjInstance = ObjInstance;

module.exports = ByondMap;
