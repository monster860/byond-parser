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

ByondEnv.parse(loader, 'D:\\dev\\repos\\tgstation\\tgstation.dme').then(env => {
	global.env = env;
	let classnames = {
		"/datum/reagent/blob": "BlobReagent",
		"/datum/reagent/plantnutriment": "PlantNutriment",
		"/datum/reagent/glitter": "Glitter",
		"/datum/reagent": "Reagent"
	};
	let files = {};
	let idtoitem = {};
	for(let [path, item] of Object.entries(env.items)) {
		if(!path.startsWith("/datum/reagent/"))
			continue;
		idtoitem[JSON.parse(item.vars.id)] = item;
		let classname = classnames[path];
		if(!classname) {
			let spaced = true;
			classname = "";
			for(let char of JSON.parse(item.vars.name)) {
				if(char == " " || char == "-") spaced = true;
				if(char.match(/[a-z]/i)) {
					classname += spaced ? char.toUpperCase() : char.toLowerCase();
					spaced = false;
				}
			}
		}
		console.log(path + ": " + classname);
		let file = "other.js";
		let match = item.definition && item.definition.file && item.definition.file.match(/\\chemistry\\reagents\\(.+)_reagents.dm/i);
		if(match) {
			file = match[1] + ".js";
		}
		console.log(file);
		if(!files[file]) {
			files[file] = `'use strict';

const {Reagent} = require('../reagent.js');
module.exports.reagents = {};

`;
		}
		files[file] += `class ${classname} extends ${classnames[item.parent.path]} {}
`;
	}
	console.log(files);
});
