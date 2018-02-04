'use strict';

const ByondEnv = require('./environment.js');
const path = require('path');

module.exports = async function parse(reader, dme) {
	let env = new ByondEnv();
	let macros = new Map();
	let preprocess_stack = [];
	let preprocess_blocked = 0;

	async function parse_file(file) {
		let text = await reader(file);
		text = text.replace(/\r\n/g, '\n'); // LF line endings only you sick fucks
		text = text.replace(/\r/g, '\n');
		if(!text)
			return;
		if(!text.endsWith("\n"))
			text += "\n";
		let syntax_stack = [];
		let lines = [];
		let line = {text: ""};
		let indent_level = 0;
		let has_nonwhitespace = false;
		let linenum = 1;
		let colnum = 0;
		for(let i = 0; i < text.length; i++) {
			colnum++;
			let c = text[i];
			let nc = text[i+1];
			let curr_syntax = syntax_stack[syntax_stack.length-1];
			let instring = (curr_syntax == '""' || curr_syntax == '{""}');
			let incomment = (curr_syntax == '//' || curr_syntax == '/**/');
			if(c == '\\' && nc != '\n' && instring) {
				line.text += c;
				line.text += nc;
				i++;
				continue;
			} else if(c == '\n' || (c == '\\' && nc == '\n')) {
				linenum++;
				colnum = 0;
				indent_level = 0;
				has_nonwhitespace = false;
				if(incomment) {
					if(curr_syntax == '//')
						syntax_stack.pop();
				}
				line.text = line.text.trimRight();
				if(!incomment && c == '\\') {
					line.text += " ";
					i++;
				} else if(!syntax_stack.length) {
					lines.push(line);
					line = {text: ""};
				} else {
					line.text += " ";
					if(syntax_stack.includes('""'))
						throw new Error(`${file}:${linenum}:${colnum} - Line break inside string`);
				}
				continue;
			} else if(incomment) {
				if(c == '*' && nc == '/' && curr_syntax == '/**/') {
					syntax_stack.pop();
					i++;
				}
				continue;
			} else if(!instring && !incomment && c == '/' && nc == '/') {
				syntax_stack.push('//');
				i++;
				continue;
			} else if(!instring && !incomment && c == '/' && nc == '*') {
				syntax_stack.push('/**/');
				i++;
				continue;
			} else if(c == '[')
				syntax_stack.push('[]');
			else if(curr_syntax == '[]' && c == ']')
				syntax_stack.pop();
			else if(!instring && c == '"')
				syntax_stack.push('""');
			else if(curr_syntax == '""' && c == '"')
				syntax_stack.pop();
			else if(!instring && c == '(')
				syntax_stack.push('()');
			else if(curr_syntax == '()' && c == ')')
				syntax_stack.pop();
			else if(c == '{' && nc == '"' && !instring) {
				syntax_stack.push('{""}');
				i++;
				line.text += '"';
				continue;
			} else if(c == '"' && nc == '}' && curr_syntax == '{""}') {
				syntax_stack.pop();
				i++;
				line.text += '"';
				continue;
			} else if(c == '"' && curr_syntax == '{""}') {
				line.text += '\\"';
				continue;
			}
			if((c != ' ' && c != '\t') || has_nonwhitespace)
				line.text += c;
			if(c != ' ' && c != '\t' && !has_nonwhitespace) {
				has_nonwhitespace = true;
				if(line.indent_level == null) {
					line.line = linenum;
					line.col = colnum;
					line.file = file;
					line.indent_level = indent_level;
				}

			} else if(!has_nonwhitespace) {
				indent_level++;
			}
		}
		lines.push(line);
		if(syntax_stack.length) {
			throw new Error(`Syntax stack not empty in file ${file}! ${JSON.stringify(syntax_stack)}. Remaining text in buffer: "${line.text}"`);
		}
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
