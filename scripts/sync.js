// sync.js


//
// following functions are called by async to be executed in series
// main calling function is at file bottom
//

// create tables if they do not exists

ej.create_tables_if_not_exist = function(asyncCallback) {
	console.log('start create_tables_if_not_exist') ;

	ej.db.transaction(function (tx) {
		var tables = [	'interventions', 'clients', 'questionnaire_intervention', 'questionnaires', 
						'questions', 'reponses_questionnaire',
						'stock_intervention', 'devis_intervention', 'lignes_devis', 'materiel_client'] ; 
		var tasks = [] ;
		for (var i in tables) { 
			(function(i) {
				tasks.push(function(callback) {			
					var sql = 'CREATE TABLE IF NOT EXISTS ' + tables[i] + ' ' + model.field_list_create(tables[i])  ;
					tx.executeSql(sql,[], function(tx) {
						callback(null) ;
					})
				})
			})(i)
		}
		async.series(tasks, function(err, result) {
			asyncCallback(null);	
		}) ;
	})
}

// create unique index (probably useless)

ej.create_unique_index = function(asyncCallback) {
	console.log('start create_unique_index') ;

	ej.db.transaction(function (tx) {
		var sql = "CREATE UNIQUE INDEX IF NOT EXISTS rq1 ON reponses_questionnaire(id_questionnaire_intervention, id_question, reponse)" ;
		tx.executeSql(sql, [], function(tx) { 
			asyncCallback(null);
		}, function(tx,err) {
			// on browser ignore the error
			if (ej.global.userAgent == "mobile") {
				alert(err.message) ;
			}
			asyncCallback(null);
			
		})
	})	
}	


// write interventions

ej.write_interventions = function(asyncCallback) {
	console.log('start write_interventions') ;

	ej.db.transaction(function (tx) {
		tx.executeSql('SELECT * FROM interventions WHERE statut != ? AND statut != ?', [model.EN_ATTENTE, model.EN_PAUSE], function (tx, results) {
			var tasks = [] ;
			for (var i = 0; i < results.rows.length; i++) {
				(function(i) {
					tasks.push(function(callback) {
						$.ajax({
							type: "POST",
							url: ej.SERVER_URL + "sync_intervention",
							data: results.rows.item(i) ,
							dataType: "json"
						}).done( function(res) {
							callback(null) ;
						})
					})
				})(i) ;	
			}
			async.series(tasks, function(err, result) {
				asyncCallback(null);	
			}) ;
		})
	})
}
		



// write devis_intervention

ej.write_devis_intervention = function(asyncCallback) {
	console.log('start write_devis_interventions') ;

	ej.db.transaction(function (tx) {			
		tx.executeSql('SELECT * FROM devis_intervention d, lignes_devis l WHERE d.id_intervention = l.id_intervention', [], function (tx, results) {	
			var tasks = [] ;
			for (var i = 0; i < results.rows.length; i++) {
				(function(i) {
					tasks.push(function(callback) {
						$.ajax({
							type: "POST",
							url: ej.SERVER_URL + "sync_devis",
							data: results.rows.item(i) ,
							dataType: "json"
						}).done( function(res) {
							callback(null) ;
						})
					})
				})(i) ;
			}
			async.series(tasks, function(err, result) {
				asyncCallback(null);	
			}) ;
		})
	})
}


// write reponses

ej.write_reponses = function(asyncCallback) {
	console.log('start write_reponses') ;

	ej.db.transaction(function (tx) {
		var sql = 	"SELECT DISTINCT r.id_question, r.id_questionnaire_intervention, r.question, r.reponse" +
					" FROM reponses_questionnaire r , interventions i WHERE r.id_intervention=i.id_intervention " +
					" AND  i.statut != ? AND i.statut != ?" ;
		tx.executeSql(sql, [model.EN_ATTENTE, model.EN_PAUSE], function (tx, results) {	
			var tasks = [] ;
			for (var i = 0; i < results.rows.length; i++) {
				(function(i) {
					tasks.push(function(callback) {
						$.ajax({
							type: "POST",
							url: ej.SERVER_URL + "sync_reponse",
							data: results.rows.item(i) ,
							dataType: "json"
						}).done( function(res) {
							callback(null) ;
						})
					})
				})(i)
			}
			// run tasks
			async.series(tasks, function(err, result) {
				asyncCallback(null);
			})
		})						
	})
}


// empty tables
 
ej.empty_tables = function(asyncCallback) {
	console.log('start empty_tables') ;

	console.log('start load tables - delete first') ;
	ej.db.transaction(function (tx) {
		tx.executeSql('DELETE FROM interventions', [], function (tx) {
			tx.executeSql('DELETE FROM clients', [], function (tx) {
				tx.executeSql('DELETE FROM questionnaire_intervention', [], function (tx) {
					tx.executeSql('DELETE FROM questionnaires', [], function (tx) {
						tx.executeSql('DELETE FROM questions', [], function (tx) {
							tx.executeSql('DELETE FROM reponses_questionnaire', [], function (tx) {
								tx.executeSql('DELETE FROM devis_intervention', [], function (tx) {
									tx.executeSql('DELETE FROM lignes_devis', [], function (tx) {
										tx.executeSql('DELETE FROM materiel_client', [], function (tx) {
											asyncCallback(null);	
										})	
									})
								})				
							})	
						})	
					})	
				})	
			})	
		})
	})		
}


// read interventions
	
ej.read_interventions = function(asyncCallback) {
	console.log('start read intervention') ;
	
	$.ajax({
		type: "POST",
		url: ej.SERVER_URL + "send_interventions",
		data: {id_technicien: ej.global.id_technicien} ,
		dataType: "json"
	}).done( function(data) {
		if (data.length == 0) {
			asyncCallback(null);	
		} else {
			var tasks = [] ;
			for (var i in data) {
				// noter l'astuce pour "fixer" la valeur de i du callback 
				(function(i) {
					tasks.push(function(callback) {
						ej.db.transaction(function (tx) {
							var sql = 'INSERT INTO interventions ' + model.field_list('interventions') + ' VALUES ' + model.field_values('interventions', data[i]) ;
							tx.executeSql(sql,[], function() {
								callback(null) ;
							}, function(tx, err) {
								console.log(err);
								callback(null) ;
							});
						}) ;
					})
				})(i) ;
			}
			async.series(tasks, function(err, result) {
				asyncCallback(null);	
			}) ;
		}
	})
}


// read clients

ej.read_clients = function(asyncCallback) {

	console.log('start read client') ;
	
	$.ajax({
		type: "POST",
		url: ej.SERVER_URL + "send_clients",
		data: {id_technicien: ej.global.id_technicien} ,
		dataType: "json"
	}).done( function(data) {
		if (data.length == 0) {
			asyncCallback(null);	
		} else {
			var tasks = [] ;
			for (var i in data) {
				// noter l'astuce pour "fixer" la valeur de i du callback 
				(function(i) {
					tasks.push(function(callback) {
						ej.db.transaction(function (tx) {
							var sql = 'INSERT INTO clients ' + model.field_list('clients') + ' VALUES ' + model.field_values('clients', data[i]) ;
							tx.executeSql(sql,[], function() {
								callback(null) ;
							});
						}) ;
					})
				})(i) ;
			}
			async.series(tasks, function(err, result) {
				asyncCallback(null);	
			}) ;			
		}
	})
}				

// read questionnaire_intervention

ej.read_questionnaire_intervention = function(asyncCallback) {

	console.log('start read questionnaire intervention') ;
	
	$.ajax({
		type: "POST",
		url: ej.SERVER_URL + "send_questionnaire_intervention",
		data: {id_technicien: ej.global.id_technicien} ,
		dataType: "json"
	}).done( function(data) {
		if (data.length == 0) {
			asyncCallback(null);	
		} else {
			var tasks = [] ;
			for (var i in data) {
				// noter l'astuce pour "fixer" la valeur de i du callback 
				(function(i) {
					tasks.push(function(callback) {
						ej.db.transaction(function (tx) {
							var sql = 'INSERT INTO questionnaire_intervention ' + model.field_list('questionnaire_intervention') + 
										' VALUES ' + model.field_values('questionnaire_intervention', data[i]) ;
							tx.executeSql(sql,[], function() {
								callback(null) ;
							}, function(tx, err) {
								console.log(err) ;
								callback(null) ;
							});
						}) ;
					})
				})(i) ;
			}
			async.series(tasks, function(err, result) {
				asyncCallback(null);	
			}) ;				
		}			
	})
}				


// read questionnaires

ej.read_questionnaires =  function(asyncCallback) {
	
	console.log('start read questionnaire') ;
	
	$.ajax({
		type: "POST",
		url: ej.SERVER_URL + "send_questionnaires",
		data: {id_technicien: ej.global.id_technicien} ,
		dataType: "json"
	}).done( function(data) {
		if (data.length == 0) {
			asyncCallback(null);	
		} else {
			var tasks = [] ;
			for (var i in data) {
				// noter l'astuce pour "fixer" la valeur de i du callback 
				(function(i) {
					tasks.push(function(callback) {
						ej.db.transaction(function (tx) {
							var sql = 'INSERT INTO questionnaires ' + model.field_list('questionnaires') + 
										' VALUES ' + model.field_values('questionnaires', data[i]) ;
							tx.executeSql(sql,[], function() {
								callback(null);
							}, function(tx, err) {
								console.log(err);
								callback(null) ;
							});
						})
					}) ;
				})(i) ;
			}
			async.series(tasks, function(err, result) {
				asyncCallback(null);	
			}) ;							
		}
	})
}				
				
// read questions				

ej.read_questions =  function(asyncCallback) {
	console.log('start read questions') ;

	$.ajax({
		type: "POST",
		url: ej.SERVER_URL + "send_questions",
		data: {id_technicien: ej.global.id_technicien} ,
		dataType: "json"
	}).done( function(data) {
		if (data.length == 0) {
			asyncCallback(null);	
		} else {	
			var tasks = [] ;
			for (var i in data) {
				// noter l'astuce pour "fixer" la valeur de i du callback 
				(function(i) {
					tasks.push(function(callback) {
						ej.db.transaction(function (tx) {
							var sql = 'INSERT INTO questions ' + model.field_list('questions') + 
										' VALUES ' + model.field_values('questions', data[i]) ;
							tx.executeSql(sql,[], function() {
								callback(null);
							}, function(tx, err) {
								alert(err);
								callback(null);
							});
						}) ;
					})
				})(i) ;
			}
			async.series(tasks, function(err, result) {
				asyncCallback(null);	
			}) ;					
		}
	})
}				


// read materiel client

ej.read_materiel_client = function(asyncCallback) {
	console.log('start read materiel') ;

	$.ajax({
		type: "POST",
		url: ej.SERVER_URL + "send_materiel_client",
		data: {id_technicien: ej.global.id_technicien} ,
		dataType: "json"
	}).done( function(data) {
		if (data.length == 0) {
			asyncCallback(null);	
		} else {
			var tasks = [] ;
			for (var i in data) {
				// noter l'astuce pour "fixer" la valeur de i du callback 
				(function(i) {
					tasks.push(function(callback) {
						ej.db.transaction(function (tx) {
							var sql = 'INSERT INTO materiel_client ' + model.field_list('materiel_client') + 
										' VALUES ' + model.field_values('materiel_client', data[i]) ;
							tx.executeSql(sql,[], function() {
								callback(null);
							}, function(tx, err) {
								alert(sql + ' : ' + err);
								callback(null);
							});
						}) ;
					})
				})(i) ;
			}
			async.series(tasks, function(err, result) {
				asyncCallback(null);	
			}) ;
		}
	})
}				


	
//////////////////////////////////////
// sync of stock is made independantly 

ej.read_stock = function(id_technicien, mainCallback) {
	console.log('start read stock') ;
	// delete first then read
	ej.db.transaction(function (tx) {
		tx.executeSql('DELETE FROM stock_intervention', [], function (tx) {

			$.ajax({
				type: "POST",
				url: ej.SERVER_URL + "send_stock",
				data: {id_technicien: id_technicien} ,
				dataType: "json"
			}).done( function(data) {
				if (data.length == 0) {
					// if no stock scramble out
					mainCallback('all OK')
				} else {
					var tasks = [] ;	
					for (var i in data) {
						// noter l'astuce pour "fixer" la valeur de i du callback 
						(function(i) {
							tasks.push(function(callback) {
								ej.db.transaction(function (tx) {
									var sql = 'INSERT INTO stock_intervention ' + model.field_list('stock_intervention') + 
												' VALUES ' + model.field_values('stock_intervention', data[i]) ;
									tx.executeSql(sql,[], function() {
										callback(null);
									}, function(tx, err) {
										alert(sql + ' : ' + err) ;
										callback(null);
									});
								})
							}) ;
						})(i) ;
					}
					async.parallel(tasks, function(err, result) {
						mainCallback(null);	
					}) ;
				}				
			})
		})
	})	
}				


// main routine
// mode is 'read' when login or 'noread' when logout 


ej.synchronize = function(id_technicien, mode, callback) {
	console.log('start synchronize ' + mode) ;
	// experimental
	ej.global.SYNC_ON_GOING = true ;
	ej.global.id_technicien = id_technicien ;
	
	var tasks = [
		ej.create_tables_if_not_exist,
		ej.create_unique_index,
		ej.write_interventions,
		ej.write_devis_intervention,
		ej.write_reponses,
		ej.empty_tables
		];
	if (mode == 'read') {			
		tasks.push(		
			ej.read_interventions,
			ej.read_clients,
			ej.read_questionnaire_intervention,
			ej.read_questionnaires,
			ej.read_questions,
			ej.read_materiel_client
		)
	}
	
	async.series(tasks,	function(err, results){
		callback('All OK') ;
	}) 
}	
