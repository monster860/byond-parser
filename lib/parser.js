'use strict';

const ByondEnv = require('./environment.js');
const path = require('path');
const pre_parse = require('./pre_parser.js');

module.exports = async function parse(reader, dme) {
	let env = new ByondEnv();
	let macros = new Map();
	let preprocess_stack = [];
	let preprocess_blocked = 0;

	async function parse_file(file) {
		let text = await reader(file);
		let lines = pre_parse(text, file);
		let path_tree = [];
		for(let l of lines) {
			if(l.indent_level == null)
				continue;
			if(l.text.startsWith("#")) {
				let match = l.text.match(/^#endif/);
				if(match) {
					if(!preprocess_stack.pop())
						preprocess_blocked--;
				}
				match = l.text.match(/^#(ifdef|ifndef|undef|if)[ \t]+(.+)/i);
				if(match) {
					if(match[1] == "undef") {
						macros.delete(match[2]);
					} else if(match[1] == "ifdef") {
						let valid = macros.has(match[2]);
						preprocess_stack.push(valid);
						if(!valid)
							preprocess_blocked++;
					} else if(match[1] == "ifndef") {
						let valid = !macros.has(match[2]);
						preprocess_stack.push(valid);
						if(!valid)
							preprocess_blocked++;
					} else if(match[1] == "if") {
						preprocess_stack.push(true); // not gonna bother
					}
				}
				if(preprocess_blocked > 0) {
					continue;
				}
				match = l.text.match(/^#include[ \t]+"(.*)"/i);
				if(match && (match[1].endsWith(".dm") || match[1].endsWith(".dme"))) {
					await parse_file(path.posix.join(path.dirname(file), match[1]));
				}
				match = l.text.match(/^#define[ \t]+([a-z0-9_]+)(\([^)]*\))?(?:[ \t]+(.+))?/i);
				if(match) {
					macros.set(match[1], match[3]);
				}
				continue;
			}
			if(preprocess_blocked > 0)
				continue;
			path_tree.length = l.indent_level + 1;
			if(l.text.endsWith("/"))
				l.text = l.text.substring(0, l.text.length - 1);
			path_tree[l.indent_level] = l.text;
			let fullpath = "";
			for(let item of path_tree) {
				if(!item)
					continue;
				if(item.startsWith("/")) {
					fullpath = item;
					continue;
				}
				fullpath += `/${item}`;
			}
			let typename = "";
			for(let item of fullpath.split("/")) {
				if(item.length == 0)
					continue;
				if(item.match(/([(=])/) || item == "var" || item == "proc" || item == "global" || item == "static" || item == "tmp" || item == "verb")
					break;
				typename += `/${item}`;
			}
			let type = env.get_or_create_node(typename, {line:l.line, col:l.col, file});
			let match;
			// yes, one =
			if((match = fullpath.match(/^(?:[/a-z0-9_]+)\/([a-z0-9_]+)(?:[ \t]*=[ \t]*)(.+)/i)) && match[2]) {
				type.vars[match[1]] = match[2];
			} else if((match = fullpath.match(/^(?:[/a-z0-9_]+var(?:\/[a-z0-9_/]+)?)\/([a-z0-9_]+)(?:[ \t]*=[ \t]*)(.+)/i)) && match[2]) {
				type.vars[match[1]] = match[2];
			}
		}

	}

	await parse_file(dme);

	// reprocess the env

	for(let item of Object.values(env.items)) {
		item.subtypes.clear();
	}
	for(let item of Object.values(env.items)) {
		if(item.vars.parentType) {
			item.parent = env.get_or_create_node(item.vars.parentType, item.definition);
		}
	}
	let roots = [];
	for(let item of Object.values(env.items)) {
		if(item.parent) {
			item.parent.subtypes.add(item);
		} else {
			roots.push(item);
		}
	}
	while(roots.length) {
		let item = roots.pop();
		for(let subtype of item.subtypes)
			roots.push(subtype);
		item.vars = Object.assign(Object.create(item.parent && item.parent.vars), item.vars);
	}
	return env;
};
