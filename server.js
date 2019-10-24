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

// open usenergy.sqlite3 database
var db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
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
			//console.log(rows[0].coal);
			response = response.toString().replace(/!coal!/g, rows[0].coal);
			response = response.toString().replace(/!natural_gas!/g, rows[0].natural_gas);
			response = response.toString().replace(/!nuclear!/g, rows[0].nuclear);
			response = response.toString().replace(/!petroleum!/g, rows[0].petroleum);
			response = response.toString().replace(/!renewable!/g, rows[0].renewable);
			var table = "";
			//console.log(response);
			db.each("Select [state_abbreviation], [coal], [natural_gas], [nuclear], [petroleum], [renewable] from Consumption Where [year] = '2017' Order by [state_abbreviation]", (err, row) => {
				//console.log(row);
				table += "<TR>";
				for(var i in row) {
					table += "<TD>" + row[i] + "</TD>";
				}
				table += "</TR>";
			}, (err, num) => {
				if(err) {
					console.log("Error in db.each");
				}
				console.log("Table has " + num + " rows");
				response = response.toString().replace(/!tbody!/g, table);
				//console.log(response);
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
		"Select sum(coal) as coal, sum(natural_gas) as natural_gas, sum(nuclear) as nuclear, sum(petroleum) as petroleum, sum(renewable) as renewable From Consumption where year = '" + year + "'", (err, rows) => {
			//console.log(rows[0].coal);
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
			//console.log(response);
			db.each("Select [state_abbreviation], [coal], [natural_gas], [nuclear], [petroleum], [renewable], coal + natural_gas + nuclear + petroleum + renewable as [Total] from Consumption Where [year] = '" + year + "' Order by [state_abbreviation]", (err, row) => {
				//console.log(row);
				table += "<TR>";
				for(var i in row) {
					table += "<TD>" + row[i] + "</TD>";
				}
				table += "</TR>";
			}, (err, num) => {
				if(err) {
					console.log("Error in db.each");
				}
				console.log("Table has " + num + " rows");
				response = response.toString().replace(/!tbody!/g, table);
				console.log(response);
				WriteHtml(res, response);
			});
		});
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    ReadFile(path.join(template_dir, 'state.html')).then((template) => {
        let response = template;
        console.log(req.params.selected_state);
        // modify `response` here
        var coal_counts = new Array(58);
        var natural_gas_counts = new Array(58);
        var nuclear_counts = new Array(58);
        var petroleum_counts = new Array(58);
        var renewable_counts = new Array(58);
        var i = 0;
        db.each("select year, coal, natural_gas, nuclear, petroleum, renewable from consumption where state_abbreviation = '"+ req.params.selected_state+ "'order by year", (err, rows) => {
                if(err){console.log("SQL err");}
                else {
                    //console.log(rows);
            		coal_counts[i] = rows.coal;
            		natural_gas_counts[i] = rows.natural_gas;
            		nuclear_counts[i] = rows.nuclear;
            		petroleum_counts[i] = rows.petroleum;
            		renewable_counts[i] = rows.renewable;
            		i++;
                }
        }, (err,num) => {
            response = response.toString().replace(/ !state! /g,req.params.selected_state);
            response = response.toString().replace(/ !coal! /g,coal_counts);
            response = response.toString().replace(/ !natural_gas! /g,natural_gas_counts);
            response = response.toString().replace(/ !nuclear! /g,nuclear_counts);
            response = response.toString().replace(/ !petroleum! /g,petroleum_counts);
            response = response.toString().replace(/ !renewable! /g, renewable_counts);
            var table = "";
            db.each("Select [year], [coal], [natural_gas], [nuclear], [petroleum], [renewable], coal + natural_gas + nuclear + petroleum + renewable as [Total] from Consumption Where [state_abbreviation] = '" + req.params.selected_state + "' Order by [year]", (err, row) => {
                table += "<TR>";
                for(var i in row) {
                    table += "<TD>" + row[i] + "</TD>";
                }
                table += "</TR>";
            }, (err, num) => {
                response = response.toString().replace(/!table!/g, table);
                console.log("res: " + response);
                WriteHtml(res, response);
            })
        });
    }).catch((err) => {
        console.log(err);
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
        console.log(req.params.selected_energy_type);
        db.all("Select state_abbreviation, year, [" + req.params.selected_energy_type + "] as amount from Consumption order by state_abbreviation, year", (err,row) => {
        	if(err) {console.log("SQL error");}
            console.log(row);
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
            //console.log(state_counts);
            //console.log(year_counts);
            console.log(state_counts);
            for(let i in state_counts) {
                state_counts[i] = Object.values(state_counts[i]);
            }
            //console.log(Object.values(year_counts));
            //console.log(state_counts);
            response = response.toString().replace(/ !type! /g,req.params.selected_energy_type);
            response = response.toString().replace(/!counts!/g,JSON.stringify(state_counts));
            var table = "";
            /*db.each("SELECT year, state_abbreviation, "+req.params.selected_energy_type+" from Consumption, order by year, state_abbreviation", (err,row) => {
                let year = row.year;
                let state_abbreviation = row.state_abbreviation;
                let amount = row.amount;
                state_counts[state_abbreviation] = amount;
                year_counts[year] = state_counts;
            }, (err,num) => {
                console.log(year_counts);
                for(var i in year_counts) {
                    table += "<TR>";
                    var state_counts = year_counts[i];
                    for(var j in state_counts) {
                        //table += "<TD> +" state_counts[j] + " </TD>";
                    }
                    table += "</TD>";
                }
            });
            response = response.toString().replace(/!table!/g, table);*/
            console.log(response);
            WriteHtml(res, response);
        });
    }).catch((err) => {
        Write404Error(res);
    });
});

function ReadFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
            	console.log("Here");
                reject(err);
            }
            else {
            	console.log("There");
                resolve(data.toString());
            }
        });
    });
}

function Write404Error(res) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('Error: file not found');
    res.end();
}

function WriteHtml(res, html) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(html);
    res.end();
}


var server = app.listen(port);
//TestSql();
