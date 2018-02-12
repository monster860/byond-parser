'use strict';

class ByondEnv {
	constructor() {
		this.items = Object.create(null);
		var datum = new Node(null, "/datum");
		datum.vars.tag = "null";
		this.items[datum.path] = datum;

		var atom = new Node(datum, "/atom");
		atom.vars.alpha = '255';
		atom.vars.appearance_flags = '0';
		atom.vars.blend_mode = '0';
		atom.vars.color = 'null';
		atom.vars.density = '0';
		atom.vars.desc = 'null';
		atom.vars.dir = '2';
		atom.vars.gender = 'neuter';
		atom.vars.icon = 'null';
		atom.vars.icon_state = 'null';
		atom.vars.infra_luminosity = '0';
		atom.vars.invisibility = '0';
		atom.vars.layer = '1';
		atom.vars.luminosity = '0';
		atom.vars.maptext = 'null';
		atom.vars.maptext_width = '32';
		atom.vars.maptext_height = '32';
		atom.vars.maptext_x = '0';
		atom.vars.maptext_y = '0';
		atom.vars.mouse_drag_pointer = '0';
		atom.vars.mouse_drop_pointer = '1';
		atom.vars.mouse_drop_zone = '0';
		atom.vars.mouse_opacity = '1';
		atom.vars.mouse_over_pointer = '0';
		atom.vars.name = 'null';
		atom.vars.opacity = '0';
		atom.vars.overlays = 'list()';
		atom.vars.override = '0';
		atom.vars.pixel_x = '0';
		atom.vars.pixel_y = '0';
		atom.vars.pixel_z = '0';
		atom.vars.plane = '0';
		atom.vars.suffix = 'null';
		atom.vars.transform = 'null';
		atom.vars.underlays = 'list()';
		atom.vars.verbs = 'list()';
		this.items[atom.path] = atom;

		var movable = new Node(atom, "/atom/movable");
		movable.vars.animate_movement = '1';
		movable.vars.bound_x = '0';
		movable.vars.bound_y = '0';
		movable.vars.bound_width = '32';
		movable.vars.bound_height = '32';
		movable.vars.glide_size = '0';
		movable.vars.screen_loc = 'null';
		movable.vars.step_size = '32';
		movable.vars.step_x = '0';
		movable.vars.step_y = '0';
		this.items[movable.path] = movable;

		var area = new Node(atom, "/area");
		area.vars.layer = '1';
		area.vars.luminosity = '1';
		this.items[area.path] = area;

		var turf = new Node(atom, "/turf");
		turf.vars.layer = '2';
		this.items[turf.path] = turf;

		var obj = new Node(movable, "/obj");
		obj.vars.layer = '3';
		this.items[obj.path] = obj;

		var mob = new Node(movable, "/mob");
		mob.vars.ckey = 'null';
		mob.vars.density = '1';
		mob.vars.key = 'null';
		mob.vars.layer = '4';
		mob.vars.see_in_dark = '2';
		mob.vars.see_infrared = '0';
		mob.vars.see_invisible = '0';
		mob.vars.sight = '0';
		this.items[mob.path] = mob;

		var world = new Node(datum, "/world");
		world.vars.turf = '/turf';
		world.vars.mob = '/mob';
		world.vars.area = '/area';
	}

	get_or_create_node(path, definition) {
		if(this.items[path])
			return this.items[path];
		let parent_path;
		if(path.indexOf("/") != path.lastIndexOf("/"))
			parent_path = path.substring(0, path.lastIndexOf("/"));
		else
			parent_path = "/datum";
		let parent_item = this.get_or_create_node(parent_path);
		let item = new Node(parent_item, path, definition);
		this.items[path] = item;
		return item;
	}
}

ByondEnv.prototype.parse_map = require('./map_parser.js');

class Node {
	constructor(parent, path, definition) {
		this.vars = Object.create(null);
		this.var_definitions = Object.create(null);
		Object.defineProperty(this, "subtypes", {enumerable: false, configurable: false, writable: false, value: new Set()});
		path = path.trim();
		this.vars.type = path;
		Object.defineProperty(this, "path", {enumerable: true, configurable: false, writable: false, value: path});
		Object.defineProperty(this, "parent", {enumerable: false, configurable: false, writable: true, value: parent});
		Object.defineProperty(this, "definition", {enumerable: true, configurable: false, writable: false, value: definition});
		if(parent) {
			parent.subtypes.add(this);
			this.vars.parentType = parent.path;
		}
	}
}

ByondEnv.Node = Node;

module.exports = ByondEnv;
