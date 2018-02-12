'use strict';

const fs = require('fs');
const ByondEnv = require('./index.js');

function loader(path) {
	return new Promise((resolve, reject) => {
		fs.readFile(path, 'utf8', (err, data) => {
			if(err)
				reject(err);
			resolve(data);
		});
	});
}

function inst_dir(inst) {
	let dir = +inst.vars.dir || 2;
	if(inst.vars.dir == "NORTH") dir = 1;
	if(inst.vars.dir == "WEST") dir = 8;
	if(inst.vars.dir == "EAST") dir = 4;
	return dir;
}

// Careful! There's a difference between returning null and undefined.
let rules = [
	["/turf/open/floor", (inst) => {
		let templates = {
			floor: ["floor", "white", "dark", "bar", "floorgrime", "delivery", "bot", "barber", "whitebot", "whitedelivery", "cmo", "grimy", "freezerfloor"],
			floor_ss13: ["L1", "L3", "L5", "L7", "L2", "L4", "L6", "L8", "L9", "L11", "L13", "L7", "L10", "L12", "L14", "L8"],
			floor_edge: ["red", "whitered", "blue", "whiteblue", "green", "whitegreen", "yellow", "whiteyellow", "orange", "whitehall", "arrival", "escape", "purple", "whitepurple", "brownold", "brown", "redyellow", "redblue", "bluered", "redgreen", "greenyellow", "greenblue", "blueyellow", "darkpurple", "darkred", "darkblue", "darkgreen", "darkyellow", "darkbrown"],
			floor_corner: ["redcorner", "whiteredcorner", "bluecorner", "whitebluecorner", "greencorner", "whitegreencorner", "yellowcorner", "whiteyellowcorner", "orangecorner", "arrivalcorner", "escapecorner", "purplecorner", "whitepurplecorner", "browncorner"]
		};
		for(let [tname, states] of Object.entries(templates)) {
			if(states.includes(JSON.parse(inst.vars.icon_state))) {
				let variants = [JSON.parse(inst.vars.icon_state)];
				if(tname != "floor") {
					let dir = inst_dir(inst);
					variants.push(dir);
				}
				return {template_name: tname, variant_leaf_path: variants};
			}
		}
		return {template_name: "floor"};
	}],
	["/turf/open/floor/wood", (inst) => {
		return {template_name: "floor_wood"}
	}],
	["/turf/open/floor/carpet", (inst) => {
		return {template_name: "floor_carpet"}
	}],
	["/turf/closed/wall", (inst) => {
		return {template_name: "wall"}
	}],
	["/turf/closed/wall/r_wall", (inst) => {
		return {template_name: "r_wall"}
	}],
	["/turf/open/floor/plating", (inst) => {
		return {template_name: "plating"};
	}],
	["/obj/structure/grille", (inst) => {
		return {template_name: "grille"};
	}],
	["/obj/effect/spawner/structure/window/reinforced", (inst) => {
		return {template_name: "r_window"};
	}],
	["/obj/effect/spawner/structure/window", (inst) => {
		return {template_name: "window"};
	}],
	["/obj/machinery/door/airlock", (inst) => {
		let valid = ["airlock_command","airlock_security","airlock_engineering","airlock_medical","airlock_maintenance","airlock_mining","airlock_atmos","airlock_research","airlock_freezer","airlock_science","airlock_virology","airlock_command_glass","airlock_engineering_glass","airlock_security_glass","airlock_medical_glass","airlock_research_glass","airlock_mining_glass","airlock_atmos_glass","airlock_science_glass","airlock_virology_glass","airlock_maintenance_glass","airlock_glass","airlock"];
		let path = inst.type.path;
		let path_type = path.substr(28);
		let tname = "airlock";
		if(path_type == "glass")
			tname = "airlock_glass";
		else if(path_type.startsWith("glass"))
			tname = `airlock_${path_type.substr(6)}_glass`;
		else
			tname = `airlock_${path_type}`;
		if(!valid.includes(tname))
			tname = "airlock";
		return {template_name: tname};
	}],
	["/obj/machinery/light", (inst) => {
		if(inst.type.path == "/obj/machinery/light_switch")
			return;
		return {template_name: inst.type.path == "/obj/machinery/light/small" ? "light_small" : "light", variant_leaf_path: [inst_dir(inst)]}
	}]
];

rules.sort((a, b) => {
	return b[0].length - a[0].length;
});

(async function() {
	let env = await ByondEnv.parse(loader, 'D:\\dev\\repos\\tgstation\\tgstation.dme');
	let maptext = await loader('D:\\dev\\repos\\tgstation\\_maps\\map_files\\BoxStation\\BoxStation.dmm');
	let map = env.parse_map(maptext, 'map file');
	let bsmap = {};
	bsmap.locs = {};
	for(let [loc, key] of map.coords_to_key) {
		let [x,y,z] = JSON.parse(loc);
		x -= 113;
		y -= 135;
		if(z != 1)
			continue;
		let bloc = bsmap.locs[`${x},${y},0`] || (bsmap.locs[`${x},${y},0`] = []);
		let ti = map.key_to_instance.get(key);
		for(let oi of ti.objs) {
			for(let [rulekey, rule, props] of rules) {
				if(!props) props = {};
				if(!oi.type.path.startsWith(rulekey))
					continue;
				let result = rule(oi);
				if(result == undefined)
					continue;
				else if(result == null)
					break;
				let tx = x;
				let ty = y;
				if(result.y) ty += result.y;
				if(result.x) tx += result.x;
				result.x = tx; result.y = ty;
				bloc.push(result);
				break;
			}
		}
	}
	fs.writeFile('D:\\dev\\repos\\tgstation-remake\\convert_test.bsmap', JSON.stringify(bsmap), "utf8", ()=>{console.log("File write success!")});
})().then(()=>{}, (err) => {
	console.error(err);
});
