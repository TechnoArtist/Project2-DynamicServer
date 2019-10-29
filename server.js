// Built-in Node.js modules
var fs = require('fs')
var path = require('path')

// NPM modules
var express = require('express')
var sqlite3 = require('sqlite3')


var public_dir = path.join(__dirname, 'public');
var template_dir = path.join(__dirname, 'templates');
var db_filename = path.join(__dirname, 'db', 'usenergy.sqlite3');

var app = express();
var port = 8000;

var state_full = {};
var state_order = {};
var ordered_states = Array(51);

var energy_order = {};
var ordered_energy = Array(5);
var name_nice = {};

energy_order = {"coal": "0", "natural_gas": "1", "nuclear": "2", "petroleum": "3", "renewable": "4"};
ordered_energy = ["coal", "natural_gas", "nuclear", "petroleum", "renewable"];
name_nice = {"coal": "Coal", "natural_gas": "Natural Gas", "nuclear": "Nuclear", "petroleum": "Petroleum", "renewable": "Renewable"};



// open usenergy.sqlite3 database
var db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

db.all("select state_abbreviation, state_name from States order by state_abbreviation", (err, rows) => {
	for(var i in rows) {
		let state_abbreviation = rows[i].state_abbreviation;
		let state_name = rows[i].state_name;
		state_full[state_abbreviation] = state_name;
		ordered_states[i] = state_abbreviation;
		state_order[state_abbreviation] = i;
	}
	state_full["MA"]="Massachusetts";
});

/*
States:
state_abbreviation (TEXT) - two character abbreviation for a state
state_name (TEXT) - full name of the state
Consumption:
year (INTEGER) - year for consumption measurements in YYYY format
state_abbreviation (TEXT) - two character abbreviation for a state
coal (INTEGER) - amount of energy produced by coal (in billion Btu)
natural_gas (INTEGER) - amount of energy produced by natural gas (in billion Btu)
nuclear (INTEGER) - amount of energy produced by nuclear energy (in billion Btu)
petroleum (INTEGER) - amount of energy produced by petroleum (in billion Btu)
renewable (INTEGER) - amount of energy produced by renewable energy (in billion Btu)
*/

function TestSql() {
	/*var year_counts = {};
	db.each("select year from consumption order by year", (err, row) => {
		year_counts.year = row[0];
		db.each("select state_abbreviation from consumption order by state_abbreviation", (err, rows) => {
			year_counts.year.state_abbreviation = rows[0];
		})
	});
	console.log(year_counts);
	var selected_energy_type = "coal";
        db.each("Select year, state_abbreviation, " + selected_energy_type + " from Consumption order by year", (err,row) => {
        	if(err) {console.log("SQL error");}
        	let year = row[0];
        	let state_abbreviation = row[1];
        	let amount = row[3];
        	year_counts[year[state_abbreviation]] = amount;
        });
        console.log(year_counts);*/
}

app.use(express.static(public_dir));


// GET request handler for '/'
app.get('/', (req, res) => {
    ReadFile(path.join(template_dir, 'index.html')).then((template) => {
        let response = template;
        // modify `response` here
		db.all(
		"Select sum(coal) as coal, sum(natural_gas) as natural_gas, sum(nuclear) as nuclear, sum(petroleum) as petroleum, sum(renewable) as renewable From Consumption where year = '2017'", (err, rows) => {
			response = response.toString().replace(/!coal!/g, rows[0].coal);
			response = response.toString().replace(/!natural_gas!/g, rows[0].natural_gas);
			response = response.toString().replace(/!nuclear!/g, rows[0].nuclear);
			response = response.toString().replace(/!petroleum!/g, rows[0].petroleum);
			response = response.toString().replace(/!renewable!/g, rows[0].renewable);
			var table = "";
			db.each("Select [state_abbreviation], [coal], [natural_gas], [nuclear], [petroleum], [renewable] from Consumption Where [year] = '2017' Order by [state_abbreviation]", (err, row) => {
				table += "<TR>";
				for(var i in row) {
					table += "<TD>" + row[i] + "</TD>";
				}
				table += "</TR>";
			}, (err, num) => {
				if(err) {
					console.log("Error in db.each");
				}
				response = response.toString().replace(/!tbody!/g, table);
				WriteHtml(res, response);
			});
		});
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    ReadFile(path.join(template_dir, 'year.html')).then((template) => {
		var year = req.params.selected_year;
        let response = template;
        // modify `response` here
		db.all(
		"Select sum(coal) as coal, sum(natural_gas) as natural_gas, sum(nuclear) as nuclear, sum(petroleum) as petroleum, sum(renewable) as renewable, year From Consumption where year = '" + year + "'", (err, rows) => {
			if(err) {
				
			}
			else {
				response = response.toString().replace(/!year!/g, year);
				response = response.toString().replace(/!coal!/g, rows[0].coal);
				response = response.toString().replace(/!natural_gas!/g, rows[0].natural_gas);
				response = response.toString().replace(/!nuclear!/g, rows[0].nuclear);
				response = response.toString().replace(/!petroleum!/g, rows[0].petroleum);
				response = response.toString().replace(/!renewable!/g, rows[0].renewable);
				if(year === "1960") response = response.toString().replace(/!prev_year_link!/g, "/year/1960");
				else response = response.toString().replace(/!prev_year_link!/g, "/year/"+(parseInt(year)-1));
				if(year === "2016") response = response.toString().replace(/!next_year_link!/g, "/year/2016");
				else response = response.toString().replace(/!next_year_link!/g, "/year/"+(parseInt(year)+1));
				var table = "";
				db.each("Select [state_abbreviation], [coal], [natural_gas], [nuclear], [petroleum], [renewable], coal + natural_gas + nuclear + petroleum + renewable as [Total] from Consumption Where [year] = '" + year + "' Order by [state_abbreviation]", (err, row) => {
					table += "<TR>";
					for(var i in row) {
						table += "<TD>" + row[i] + "</TD>";
					}
					table += "</TR>";
				}, (err, num) => {
					if(err || num == 0) {
						Write404Error(res, "Error no data for year: " + req.params.selected_year);
					}
					else {
						response = response.toString().replace(/!tbody!/g, table);
						WriteHtml(res, response);
					}
				});
			}
		});
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    ReadFile(path.join(template_dir, 'state.html')).then((template) => {
        let response = template;
        // modify `response` here
        var coal_counts = new Array(58);
        var natural_gas_counts = new Array(58);
        var nuclear_counts = new Array(58);
        var petroleum_counts = new Array(58);
        var renewable_counts = new Array(58);
        var i = 0;
		var state = req.params.selected_state;
		var nextstate;
		var prevstate;
		if(state_order[req.params.selected_state] == "50") {
			nextstate = ordered_states[0];
			prevstate = ordered_states[49];
		} else {
			if(state_order[req.params.selected_state] == "0") {
				nextstate = ordered_states[1];
				prevstate = ordered_states[50];
			} else {
				nextstate = ordered_states[parseInt(state_order[state])+1];
				prevstate = ordered_states[parseInt(state_order[state])-1];
			}
		}
        db.each("select year, coal, natural_gas, nuclear, petroleum, renewable from consumption where state_abbreviation = '"+ req.params.selected_state+ "'order by year", (err, rows) => {
                if(err){}
                else {
            		coal_counts[i] = rows.coal;
            		natural_gas_counts[i] = rows.natural_gas;
            		nuclear_counts[i] = rows.nuclear;
            		petroleum_counts[i] = rows.petroleum;
            		renewable_counts[i] = rows.renewable;
            		i++;
                }
        }, (err,num) => {
			if(err || num == 0) {Write404Error(res, "Error no data for State: " + req.params.selected_state);} else {
				response = response.toString().replace(/ !state! /g,req.params.selected_state);
				response = response.toString().replace(/!state!/g,state_full[req.params.selected_state]);
				response = response.toString().replace(/!state_abbreviation!/g,req.params.selected_state);
				response = response.toString().replace(/ !coal! /g,coal_counts);
				response = response.toString().replace(/ !natural_gas! /g,natural_gas_counts);
				response = response.toString().replace(/ !nuclear! /g,nuclear_counts);
				response = response.toString().replace(/ !petroleum! /g,petroleum_counts);
				response = response.toString().replace(/ !renewable! /g, renewable_counts);
				response = response.toString().replace(/ !renewable! /g, renewable_counts);
				response = response.toString().replace(/!next_state!/g, nextstate);
				response = response.toString().replace(/!prev_state!/g, prevstate);
				response = response.toString().replace(/!next_state_link!/g, "/state/" + nextstate);
				response = response.toString().replace(/!prev_state_link!/g, "/state/" + prevstate);
				var table = "";
				db.each("Select [year], [coal], [natural_gas], [nuclear], [petroleum], [renewable], coal + natural_gas + nuclear + petroleum + renewable as [Total] from Consumption Where [state_abbreviation] = '" + req.params.selected_state + "' Order by [year]", (err, row) => {
					table += "<TR>";
					for(var i in row) {
						table += "<TD>" + row[i] + "</TD>";
					}
					table += "</TR>";
				}, (err, num) => {
					response = response.toString().replace(/!table!/g, table);
					WriteHtml(res, response);
				})
			}
        });
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/energy-type/*'
app.get('/energy-type/:selected_energy_type', (req, res) => {
    ReadFile(path.join(template_dir, 'energy.html')).then((template) => {
        let response = template;
        // modify `response` here
        var year_counts = {};
        var state_counts = {};
        var amount_counts = [];
        var total_counts = {};
		var nextenergy;
		var prevenergy;
		if(energy_order[req.params.selected_energy_type] == "0") {
			nextenergy = "natural_gas";
			prevenergy = "renewable";
		} else {
			if(energy_order[req.params.selected_energy_type] == "4") {
				nextenergy = "coal";
				prevenergy = "petroleum";
			} else {
				nextenergy = ordered_energy[parseInt(energy_order[req.params.selected_energy_type])+1];
				prevenergy = ordered_energy[parseInt(energy_order[req.params.selected_energy_type])-1];
			}
		}
        db.all("Select state_abbreviation, year, [" + req.params.selected_energy_type + "] as amount from Consumption order by state_abbreviation, year", (err,row) => {
        	if(err) {Write404Error(res, "Error: No data for energy type: " + req.params.selected_energy_type);}
			else {
				for(var i=0; i<row.length; i++) {
					let state_abbreviation = row[i].state_abbreviation;
					state_counts[state_abbreviation] = {};
				}
				for(var i=0; i<row.length; i++)
				{
					let year = row[i].year;
					let state_abbreviation = row[i].state_abbreviation;
					let amount = row[i].amount;
					state_counts[state_abbreviation][year] = amount;
				}
				for(let i in state_counts) {
					state_counts[i] = Object.values(state_counts[i]);
				}
				response = response.toString().replace(/ !type! /g,req.params.selected_energy_type);
				response = response.toString().replace(/!type_nice!/g,name_nice[req.params.selected_energy_type]);
				response = response.toString().replace(/!counts!/g,JSON.stringify(state_counts));
				response = response.toString().replace(/!nextenergy!/g, nextenergy);
				response = response.toString().replace(/!prevenergy!/g, prevenergy);
				response = response.toString().replace(/!nextenergy_nice!/g, name_nice[nextenergy]);
				response = response.toString().replace(/!prevenergy_nice!/g, name_nice[prevenergy]);
				var table = "";
				db.all("SELECT year, state_abbreviation, ["+req.params.selected_energy_type+"] as amount from Consumption order by year, state_abbreviation", (err,row) => {
					if(err) {
						Write404Error(res, "Error: No data for energy type: " + req.params.selected_energy_type);
					}
					else {
						var year_counts = {};
						for(var i=0; i<row.length; i++) {
							let year = row[i].year;
							year_counts[year] = {};
						}
						for(var i=0; i<row.length; i++) {
							let year = row[i].year;
							let state_abbreviation = row[i].state_abbreviation;
							let amount = row[i].amount;
							year_counts[year][state_abbreviation] = amount;
						}
						for(var i in year_counts) {
							table += "<TR>";
							table += "<TD>" + i + "</TD>";
							let state_counts = year_counts[i];
							let total = 0;
							for(var j in state_counts) {
								table += "<TD> " + state_counts[j] + " </TD>";
								total += state_counts[j];
							}
							table += "<TD>" + total + "</TD>";
							table += "</TD>";
						}
						response = response.toString().replace(/!table!/g, table);
						WriteHtml(res, response);
					}
				});
			}
        });
    }).catch((err) => {
        Write404Error(res);
    });
});

function ReadFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data.toString());
            }
        });
    });
}

function Write404Error(res, error_text) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
	if(error_text) {res.write(error_text);}
    else {res.write(res);}
    res.end();
}

function WriteHtml(res, html) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(html);
    res.end();
}


var server = app.listen(port);
