'use strict';
module.exports = function pre_parse(text, file) {
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
			} else if(curr_syntax == '{""}') {
				line.text += "\\n";
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
	return lines;
};
