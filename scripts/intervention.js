
ej.load_page_one_intervention = function() {

	var mydate = new Date() ;
	console.log('ONE INTERV date ' + mydate.valueOf()) ;
	
	var id_intervention = localStorage['id_intervention'] ;

	const CHECKBOX = "0" ;
	const TEXTE = "1" ;
	ej.data = {} ; // global
	ej.global.is_signed = false ;
	ej.global.is_P3 = true ;
	ej.dataLoadedCount = 0 ; // security 
	
	var dataLoaded = false ;  // indicates that data load from websql tables is completed

	var panels = ['questionnaire', 'devis', 'signature', 'materiel', 'observation'] ;  // global
	
	$("#page-intervention #designation").val('') ;
	
	display_panel = function(panel) {
		for (var i in panels) {
			$("#page-intervention #panel-" + panels[i]).css('display', 'none') ;
		}
		$("#page-intervention #panel-" + panel).css('display', '') ;
	}	

	initialize = function() {
		console.log('initialize executed with dataLoaded = ' + dataLoaded) ; 
		if (dataLoaded) {
			ej.global.is_signed = false ;
			$("#btn-end").css('display', 'none') ;
			
			// first remove generated info	
			$("#page-intervention #panel-client").html('') ;
			$("#page-intervention #panel-materiel").html('') ;
			$("#page-intervention #panel-questionnaire").html('') ;
			$("#page-intervention #grid-devis").html('') ;
			
			// email client 
			$("#page-intervention #email_client").val(ej.data.client.email) ;
			// NOTE: AARRGH input MUST BE REFRESHED AND INSIDE A <FORM> !!! 
			$("#page-intervention #email_client").textinput() ;
			// observation panel
			$("#page-intervention #observation").val(ej.data.intervention.observation) ;
			// toujours false : pas concerne par le statut POURSUIVRE qui DOIT etre etabli avant de terminer
			// NOTE: AARRGH radio buttons MUST BE REFRESHED !!! 
			$("#page-intervention #followUp").prop('checked', false).checkboxradio("refresh") ;

			// client panel 
			generate_display_client() ;

			// materiel panel 
			generate_display_materiel() ;
			
			// questionnaires panel 
			$("#page-intervention #panel-questionnaire").html(generate_questionnaires(ej.data.questionnaire_intervention)) ;

			// devis panel 
			$("#is_P3") .val(ej.global.is_P3 ? "1" : "0").slider("refresh");
			generate_devis(ej.data.devis) ;

			// init canvas
			var canvas = document.getElementById('ej-canvas');
			var ctx = canvas.getContext('2d');

			// update signature works now			
			if (ej.data.intervention.signature != "") { 
				var img = new Image();
				img.onload = function() {
					ctx.drawImage(this, 0, 0);
				};
				img.src = ej.data.intervention.signature ;
				ej.global.is_signed = true ;
				$("#btn-end").css('display', '') ;
			} else {
				// for some reason clearRect is bugged on android so we paint a rectangle on top to clear
				ctx.fillStyle="#FFFFFF";
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				// ctx.clearRect(0, 0, canvas.width, canvas.height);
			}

			// set default active tag 
			$("#page-intervention #btn-questionnaire").addClass("ui-btn-active") ;
			
			display_panel('questionnaire') ;

			// refresh dynamically created html 
			$('#page-intervention').trigger('create');

			clearInterval(myTimer);
		} else {
			// security
			ej.dataLoadedCount++ ; 
			if (ej.dataLoadedCount > 100) {
				alert("Impossible de charger les données") ;
			}	
		}
	} 

	// execute initialize only after data load is completed
	// TODO if not enough increase time
	var myTimer = setInterval(initialize, 10) ;		

	
	
	// get intervention info db

	ej.db.transaction(function (tx) {
		tx.executeSql('SELECT * FROM interventions WHERE id_intervention = ?', [id_intervention], function (tx, results) {
			ej.data.intervention = results.rows.item(0) ;
			tx.executeSql('SELECT * FROM clients WHERE id_client = ?', [ej.data.intervention.id_client], function (tx, results) {
				ej.data.client = results.rows.item(0) ;
				tx.executeSql('SELECT * FROM materiel_client WHERE id_client = ?', [ej.data.intervention.id_client], function (tx, results) {
					ej.data.materiel = []
					for (var i = 0; i < results.rows.length; i++) {
						ej.data.materiel.push(results.rows.item(i)) ;
					}		
					var sql = 'SELECT * FROM questionnaire_intervention qi , questionnaires q WHERE q.id_questionnaire = qi.id_questionnaire AND id_intervention = ?'
					tx.executeSql(sql, [id_intervention], function (tx, results) {
						ej.data.questionnaire_intervention = []
						var nquest = results.rows.length ;
						if (nquest == 0) {
							init_devis() ;
						}			
						for (var i = 0; i < nquest; i++) {
							(function(i) {
								ej.data.questionnaire_intervention[i] = results.rows.item(i) ;
								var sql = 	'SELECT DISTINCT q.id_question, q.id_questionnaire, q.type, q.question, q.options, q.reponse_standard, r.reponse ' + 
											' FROM questions q LEFT JOIN reponses_questionnaire r ON r.id_question = q.id_question AND r.id_questionnaire_intervention = ? ' +
											' WHERE id_questionnaire = ? ORDER BY q.id_question' ;
								tx.executeSql(sql, [ej.data.questionnaire_intervention[i].id, ej.data.questionnaire_intervention[i].id_questionnaire], function (tx, results) {
									//ej.data.questionnaire_intervention.questionnaires[i].questions = [] ;
									ej.data.questionnaire_intervention[i].questions = [] ;
									for (var k = 0; k < results.rows.length; k++) {
										ej.data.questionnaire_intervention[i].questions[k] = results.rows.item(k) ;
									}
									if (i == nquest - 1) {
										init_devis() ;
									}
								}, function(tx, err) {
									console.log(err)
								})
							})(i)	
						}
					})
				})
			})
		})								
	})
	

	init_devis = function() {
		ej.global.is_P3 = true ;

		ej.data.devis = [] ;
		ej.db.transaction(function (tx) {
			tx.executeSql("SELECT * FROM devis_intervention WHERE id_intervention=?" , [id_intervention], function (tx, results) {
				if (results.rows.length > 0) {
					ej.global.is_P3 = results.rows.item(0).is_P3 == "1" ? true : false ;
				}
				var sql = 'SELECT s.id_stock, s.designation, s.unite, s.prix, s.code, s.heures FROM lignes_devis l, stock_intervention s ' ;
				sql += " WHERE l.id_stock = s.id_stock AND l.id_intervention = ?" ;
				tx.executeSql(sql, [id_intervention], function (tx, results) {
					for (var i = 0; i < results.rows.length; i++) {
						ej.data.devis.push(results.rows.item(i)) ;
					}
					dataLoaded = true ;	
				})
			})		
		})
	}


	generate_display_client = function() {
		var html = '<strong class="ej-alter">Intervention ' + ej.data.intervention.id_intervention + '</strong><br><br>' ; 
		html += '<span class="ej-alter">' + model.types_intervention[ej.data.intervention.type] + '</span><br>' ;
		html += '<strong>' + ej.data.client.nom + ' ' + ej.data.client.prenom +'</strong>&nbsp;&nbsp;' + '<span class="ej-alter">' + ej.data.client.phone + '</span>'  ; 
		html += '<span class="ej-statut">' + model.statuts[ej.data.intervention.statut] + '</span>' ;
		html += '<br>' +  ej.data.client.rue + ' ' + ej.data.client.lieu_dit + ' ' + ej.data.client.residence + '<br>' + ej.data.client.ville + ' ' ; 
		html += '<br>Email <form><input id="email_client" value="' + ej.data.client.email +'"></form>' ;  
		html += "<br><br> Début de l'intervention: " + '<span class="ej-alter">' + ej.data.intervention.date_heure_debut + '</span>' ;
		html += "<br> Note: " + ej.data.intervention.note ;
		 
		$("#page-intervention #panel-client").html(html) ;
	
	}


	generate_display_materiel = function() {
		var html = '<ul data-role="listview" data-inset="true" id="list-interventions">' ;	
		for (var i in ej.data.materiel) {
			html += '<li>' ; 
			html += '<strong>Marque :' + ej.data.materiel[i].marque +  '</strong><br><br>' ;
			html += '<strong>Type :' + ej.data.materiel[i].type +  '</strong><br><br>' ;
			html += '<strong>Année :' + ej.data.materiel[i].annee +  '</strong><br><br>' ;
			html += '</li>' ;
		}	 
		html += '</ul>' ;
		$("#page-intervention #panel-materiel").html(html) ;
	}



	generate_questionnaires = function(data) {
		html = '<form>' ;
		for (var i in data) {
			html += '<div><h4>' + data[i].nom + '</h4>' ;
			for (var j in data[i].questions) {
				var name = 'reponse-' + i + '-' + j  ;  

				switch (data[i].questions[j].type) {
					case TEXTE :
						var value = data[i].questions[j].reponse_standard ;
						if (data[i].questions[j].reponse != undefined  && data[i].questions[j].reponse != '') {
							value = data[i].questions[j].reponse ;
						}	
						html += '<div class="ui-grid-b">' ;
						html += '<div  class="ui-block-a"><div class="ui-bar ui-bar-a"><span>' + data[i].questions[j].question + '</span></div></div>' ;
						html += '<div  class="ui-block-b"><div class="ui-bar ui-bar-a">' +
								'<input name="' + name + '" id="' + name + '" type="text" value="' + value +'"></div></div>' ;
						html += '</div>' ;
						break ;
					case CHECKBOX :
						var checked = '' ;
						if (data[i].questions[j].reponse != undefined && data[i].questions[j].reponse == "1") {
							checked = ' checked ' ;
						}	
						html += '<input type="checkbox" name="' + name + '" id="' + name + '"' +  checked + '>'  ;
						html += '<label for="' + name + '">' + data[i].questions[j].question + '</label>'   ;
						break ;
				}
			}
			html += '</div>';
		}
		html += '</form>' ; 
		return html ;
	} 
	
	
	generate_devis = function(data) {
		for (var i=0; i<data.length ; i++) {
			var obj = data[i] ;
			append_devis_line(obj) ;
		}	
		display_total_devis() ;

	}



}





$( document ).on( "pagecreate", "#page-intervention", function() {

	const CHECKBOX = "0" ;
	const TEXTE = "1" ;

	var panels = ['questionnaire', 'devis', 'signature', 'materiel', 'observation'] ;  // global
	

	$("#btn-end").css('display', 'none') ;

	display_panel = function(panel) {
		for (var i in panels) {
			$("#page-intervention #panel-" + panels[i]).css('display', 'none') ;
		}
		$("#page-intervention #panel-" + panel).css('display', '') ;
	}	


	$("#page-intervention #btn-signature").click(function() {
		display_panel('signature') ;
	}) 	
	
	
	$("#page-intervention #btn-materiel").click(function() {
		display_panel('materiel') ;
	}) 	
	
	

	// P3 and devis use same panel
	$("#page-intervention #btn-devis").click(function() {
		display_panel('devis') ;
	}) 	

	
	
	$("#page-intervention #btn-questionnaire").click(function() {
		display_panel('questionnaire') ;
	}) 	
	
	
	$("#page-intervention #btn-observation").click(function() {
		display_panel('observation') ;
	}) 	
	
	
	// signature drawing
	// global vars	
	var canvas = document.getElementById('ej-canvas');
	var ctx = canvas.getContext('2d');
	ctx.lineWidth=2 ;

	var isDrawing = false;


    getMousePos = function(evt) {
        var rect = canvas.getBoundingClientRect();
        return {
			x: (evt.clientX-rect.left)/(rect.right-rect.left)*canvas.width,
			y: (evt.clientY-rect.top)/(rect.bottom-rect.top)*canvas.height
        };
      }


//	canvas.onmousedown = function(e) {
	$("#ej-canvas").bind("vmousedown", function(e) {
		e.preventDefault() ;
		isDrawing = true;
		ej.global.is_signed = true ;
		$("#btn-end").css('display', '') ;
		
		var mousePos = getMousePos(e);
		ctx.moveTo(mousePos.x, mousePos.y);
		ctx.beginPath() ;
	})
	
	
//	canvas.onmousemove = function(e) {
	$("#ej-canvas").bind("vmousemove", function(e) {
		e.preventDefault() ;	
		if (isDrawing) {
			//console.log('drawing ' + e.clientX + ':' + e.clientY) ;
			var mousePos = getMousePos(e);
			ctx.lineTo(mousePos.x, mousePos.y);
			ctx.stroke();
		}
	})
	
	
	
//	canvas.onmouseup = function() {
	$("#ej-canvas").bind("vmouseup", function(e) {
		isDrawing = false;
	})


	
	$("#page-intervention #btn-effacer").click(function() {
		isDrawing = false ;
		// for some reason clearRect is bugged on android so we paint a rectangle on top to clear
		ctx.fillStyle="#FFFFFF";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
        // ctx.clearRect(0, 0, canvas.width, canvas.height);
       	ej.global.is_signed = false ;
		$("#btn-end").css('display', 'none') ;

	})



	
	
	// -------------------------------- Devis / P3 -------------------------------


	prix_article = function(obj) {
		if ($("#is_P3").val() == "1") {
			return obj.prix ;
		}
		// devis
		return	parseFloat((parseFloat(obj.prix) + parseFloat(obj.heures * ej.data.intervention.taux_horaire)) * 
					ej.data.intervention.coeff_vente).toFixed(2) ;
	}
	
	append_devis_line = function(obj) {
		$("#grid-devis").append(
		'<div  style="width:60%" class="stock-item' + obj.id_stock + ' ui-block-a"><div class="ui-bar ui-bar-a">' + obj.code + '---' + obj.designation + '</div></div>' +
		'<div style="width:10%" class="stock-item' + obj.id_stock + ' ui-block-b"><div class="ui-bar ui-bar-a">' + obj.unite + '</div></div>' +
		'<div style="width:25%;text-align:right" class="stock-item' + obj.id_stock + ' ui-block-c"><div class="ui-bar ui-bar-a ej-price">' + prix_article(obj) + '</div></div>' +
		'<div style="width:5%" class="stock-item' + obj.id_stock + ' ui-block-c"><div class="ui-bar ui-bar-a"><span stock-item="' + obj.id_stock + '" class="ui-icon-delete ui-btn-icon-right">X<span></div></div>') ;
	}			

	
	display_total_devis = function() {
		var tot = 0 ;
		$("#grid-devis .ej-price").each(function() {
			tot += parseFloat($(this).html()) ;
		})
		$("#total-devis").html("Total : " + tot.toFixed(2)) ;
	}
	
	
	// autocomplete on designation
	$("#designation").autocomplete({
		source: function( request, response ) {
					ej.db.transaction(function (tx) {
						var sql = "SELECT * FROM stock_intervention WHERE designation like '%" + request.term + "%'" ;
						sql += " OR code like '%" + request.term + "%'" ;
						tx.executeSql(sql, [], function (tx, results) {
							var data = [] ;
							for (var i = 0; i < results.rows.length; i++) {
								var obj = results.rows.item(i) ;
								data.push({	label: obj.designation,
											id : obj.id_stock,
											code: obj.code,
											unite: obj.unite,
											prix: prix_article(obj),
											}) ;
							}	
							response(data) ;
						})	
					})		
				},
		minLength: 2,
		focus: function( event, ui ) {
		},
		select: function(event, ui) { 
			ej.db.transaction(function (tx) {
				var sql = "SELECT * FROM stock_intervention WHERE id_stock = ?" ;
				tx.executeSql(sql, [ui.item.id], function (tx, results) {
					var obj = results.rows.item(0) ;
					$("#page-intervention #designation").val('') ;
					append_devis_line(obj) ;
					display_total_devis() ;
				})
			})
		}
	})
	.data( "uiAutocomplete" )._renderItem = function( ul, item ) {
		return $( "<li>" )
			.append( "<a>" + item.code + ' - ' + item.label + ' - ' + item.unite + ' - ' + item.prix + "</a>" )
			.appendTo( ul );
	};

	

	// delete devis line : use delegation
	$("#page-intervention").on( "click", "#grid-devis .ui-icon-delete", function() {
		var id = $(this).attr('stock-item') ;
		$("#grid-devis div.stock-item" + id).html('') ;
		display_total_devis() ;
	})
	

	// zap lignes devis si modif de l'indic P3 
	$("#is_P3").change(function() {
		$("#grid-devis").html('') ;
	})





	// -------------------------------- SAVE -------------------------------


	$("#page-intervention #btn-cancel").click(function() {
		save_intervention('pause') ;
	})


	$("#page-intervention #btn-end").click(function() {
		save_intervention('terminate') ;
	})



	// save intervention, mode is 'pause', 'terminate' 

	save_intervention = function(mode) {
		var datetime = model.datetime() ;
		if (mode == 'terminate') {
			// intervention a suivre 
			var statut = model.TERMINE ; 
			if ($("#page-intervention #followUp").prop('checked')) {
				statut = model.POURSUIVRE ;
			}	
		} else {
			statut = model.EN_PAUSE ;
		}	
		var canvas = document.getElementById('ej-canvas');
		var canvasData = canvas.toDataURL("image/png");		
		// try this again 	
		if (!ej.global.is_signed) {
		 	canvasData = '' ;
		}	
		var observation = $("#page-intervention #observation").val() ;
		var email_client = $("#page-intervention #email_client").val() ;
		ej.db.transaction(function (tx) {
			var sql = 'UPDATE interventions SET date_heure_fin = ?, statut = ?, signature = ?, observation = ?, email_client = ? WHERE id_intervention = ?' ;
			var replace = [datetime, statut, canvasData, observation, email_client, ej.data.intervention.id_intervention] ;
			tx.executeSql(sql, replace, function (tx, results) { 
				var content = ej.data.questionnaire_intervention ;
				// compute question count and set questionnaire_intervention ids list
				var cnt_questions = 0;
				for (var i in content) {
					cnt_questions += content[i].questions.length ;
				}	
				// if no questions scramble out
				if (cnt_questions == 0) {
					save_devis() ;		
				}
				// delete reponses questionnaire first
				sql = "DELETE FROM reponses_questionnaire WHERE id_intervention = ?" ; 
				tx.executeSql(sql, [ej.data.intervention.id_intervention], function (tx, results) { 		
					var cnt = 0 ; 
					for (var i in content) {
						for (var j in content[i].questions) {
							var reponse ;
							switch (content[i].questions[j].type) {
								case TEXTE :
									reponse = $("#reponse-" + i + "-" + j).val()  ;
									break ;
								case CHECKBOX :
									reponse = $("#reponse-" + i + "-" + j).attr("checked") ? "1" : "0"  ;
									break ;
							}
							var values = { 	id_question : content[i].questions[j].id_question,
											id_questionnaire_intervention : content[i].id,
											question : content[i].questions[j].question,
											id_intervention : ej.data.intervention.id_intervention,
											reponse : reponse} 
							 
							var sql = 'INSERT INTO reponses_questionnaire ' + model.field_list('reponses_questionnaire') + 
										' VALUES ' + model.field_values('reponses_questionnaire', values) ;
							(function(sql) {			
								tx.executeSql(sql,[], function() {
									cnt++ ;
									if (cnt >= cnt_questions) {
										save_devis() ;		
									}
								})	
							})(sql) 		
						}
					}
				})	
			})
		})
	}
		




	save_devis = function() {
		// delete devis et devis_lignes first
		ej.db.transaction(function (tx) {		
			tx.executeSql("DELETE FROM devis_intervention WHERE id_intervention = ?",[id_intervention], function() {
				tx.executeSql("DELETE FROM lignes_devis WHERE id_intervention = ?",[id_intervention], function() {
					// if there is no devis , scramble out
					if ($("#grid-devis .ui-icon-delete").length == 0) {
						$( ":mobile-pagecontainer" ).pagecontainer( "change", "#page-interventions");										
					}
					
					// table devis_intervention
					var utilisateur = JSON.parse(localStorage['utilisateur']) ;
					var values = { 	id_intervention : id_intervention,
									id_client : ej.data.client.id_client,
									id_technicien : utilisateur.id_utilisateur,
									is_P3 : $("#is_P3").val(),
									date_create : model.datetime()} 
					var sql = 'INSERT INTO devis_intervention ' + model.field_list('devis_intervention') + 
												' VALUES ' + model.field_values('devis_intervention', values) ;
					ej.db.transaction(function (tx) {			
						tx.executeSql(sql,[], function() {							
							// table devis_lignes							
							var lst = [] ;
							var cnt = 0 ;
							$("#grid-devis .ui-icon-delete").each(function () {
								var id = $(this).attr('stock-item') ;
								// NOTICE multiple selector
								var values = {	id_intervention : id_intervention,
												designation : $("#grid-devis div.stock-item" + id + ".ui-block-a div").html() ,
												unite : $("#grid-devis div.stock-item" + id + ".ui-block-b div").html(),
												prix : $("#grid-devis div.stock-item" + id + ".ui-block-c div").html(),
												id_stock : id } ;					
								var sql = 'INSERT INTO lignes_devis ' + model.field_list('lignes_devis') + 
											' VALUES ' + model.field_values('lignes_devis', values) ;
								(function(sql) {
									tx.executeSql(sql,[], function() {
										cnt++ ;
										if (cnt >= $("#grid-devis .ui-icon-delete").length) {
											$( ":mobile-pagecontainer" ).pagecontainer( "change", "#page-interventions");										
										}	
									})
								})(sql)	
							})
						})
					})
				})	
			})							
		})
	}
	
	// fire !
	display_panel('questionnaire') ;

})
