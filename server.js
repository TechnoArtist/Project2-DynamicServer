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
	db.all("Select sum(coal) as coal, sum(natural_gas) as natural_gas, sum(nuclear) as nuclear, sum(petroleum) as petroleum, sum(renewable) as renewable From Consumption where year = '2017'", (err, rows) => {
		//console.log(rows);
	});
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
        // modify `response` here
        WriteHtml(res, response);
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/energy-type/*'
app.get('/energy-type/:selected_energy_type', (req, res) => {
    ReadFile(path.join(template_dir, 'energy.html')).then((template) => {
        let response = template;
        // modify `response` here
        WriteHtml(res, response);
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
TestSql();
