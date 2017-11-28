
// The main navigation logic is here


ej.checkConnection = function () {

    var networkState = navigator.connection.type;
	alert('Connection type: ' + networkState);
	if (networkState == Connection.NONE) {
		$("#page-home #indic-online").css('display', 'none') ;
		$("#page-home #logout").attr("disabled", "disabled"); 
		$("#page-home #synchronize").attr("disabled", "disabled"); 
	} else {
		$("#page-home #indic-online").css('display', '') ;
		$("#page-home #logout").removeAttr("disabled"); 
		$("#page-home #synchronize").removeAttr("disabled"); 
	}	

}



// patch against multiple event triggering
// PROBABLY USELESS
ej.lastEventTime = 0 ;  
ej.lastEventPage ='' ;

ej.repeated_event = function(page) {
	var mydate = new Date() ;
	var ok = false ;
	if ( (ej.lastEventPage === page) &&  (mydate.valueOf() - ej.lastEventTime) < 100) {
		ok = true ;
	}	
	ej.lastEventTime = mydate.valueOf() ;
	ej.lastEventPage = page ;
	if (ok) {
		console.log("Repeated Event Page : " + page + ' '  + ej.lastEventTime) ;
	} else {
		console.log("OK Page : " + page + ' '  + ej.lastEventTime) ;
	}	
	return ok ;
}
			

ej.info_interventions = function() {
	if (ej.db == null) {
		return ;
	}	
	var attente, total ;
	ej.db.transaction(function (tx) {
		tx.executeSql('SELECT * FROM interventions WHERE statut in ( ? , ?) ', [model.EN_ATTENTE, model.EN_PAUSE], function (tx, results) {
			attente = results.rows.length ;
			tx.executeSql('SELECT * FROM interventions', [], function (tx, results) {
				total = results.rows.length ;
				$("#page-home #cnt-interventions").html( attente + '/' + total) ;
				//TODO add this in production only:
				// ej.checkConnection() ;
			})	
		})
	})	
}


ej.info_stock_materiel = function() {
	if (ej.db == null) {
		return ;
	}	
	var total = 0 ;
	ej.db.transaction(function (tx) {
		tx.executeSql('SELECT count(*) as cnt FROM stock_intervention', [], function (tx, results) {
			total = results.rows.item(0).cnt ;
			$("#page-home #cnt-stock-materiel").html(total) ;
		})
	})	
}


ej.load_home_page = function() {

	// identified ?
	if (localStorage['utilisateur'] == null) {
		$( ":mobile-pagecontainer" ).pagecontainer( "change", "#page-login");
	} else {
	
		var utilisateur = JSON.parse(localStorage['utilisateur']) ;
		$("#page-home #utilisateur").html(utilisateur.prenom + ' ' + utilisateur.nom) ;

		ej.info_interventions() ;
		ej.info_stock_materiel() ;
	}
}	



$( document ).on( "pagecreate", "#page-home", function() {

	ej.load_home_page() ;

	$("#page-home #logout").click(function() {
		// syncronize
		var utilisateur = JSON.parse(localStorage['utilisateur']) ;
		if (!ej.global.SYNC_ON_GOING) {
			ej.synchronize(utilisateur.id_utilisateur, 'noread', function(msg) { 
				ej.global.SYNC_ON_GOING = false ;
				console.log(msg) ;
				localStorage.removeItem('utilisateur') ;
				$( ":mobile-pagecontainer" ).pagecontainer( "change", "#page-login");
			})	
		}
	})
	
		
	$("#page-home #synchronize").click(function() {
		if (!ej.global.SYNC_ON_GOING) {
			$.mobile.loading( "show") ;
			// syncronize		
			var utilisateur = JSON.parse(localStorage['utilisateur']) ;
			ej.synchronize(utilisateur.id_utilisateur, 'read', function(msg) { 
				$.mobile.loading( "hide") ;
				alert("Synchronisation terminée") ;
				ej.global.SYNC_ON_GOING = false ;	
				$( ":mobile-pagecontainer" ).pagecontainer( "change", "#page-home");
			})	
		}
	})


	$("#page-home #reload").click(function() {
		$.mobile.loading( "show") ;
		// reload article and materiel		
		var utilisateur = JSON.parse(localStorage['utilisateur']) ;
		ej.read_stock(utilisateur.id_utilisateur, function(msg) { 
			$.mobile.loading( "hide") ;
			alert("Chargement terminé") ;
			$( ":mobile-pagecontainer" ).pagecontainer( "change", "#page-home");
		})	
	})


	// this is OK !
	$("#page-home #btn-test").click(function() {	
		ej.checkConnection() ;
		$('#page-home').trigger('create');
	})
	
	// in case of database lock
	$("#page-home #btn-zap").click(function() {	
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
												ej.info_interventions() ;
												$('#page-home').trigger('create');	
												$.mobile.loading( "hide") ;
												ej.global.SYNC_ON_GOING = false ;
												alert("Réinitialisation terminé") ;
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
	})
	
	// Main navigation loop
		
	$( ":mobile-pagecontainer" ).on( "pagecontainerchange", function( event, ui ) {
		var toPage = ui.toPage[0].id ; 

		// TODO to be commented
		if (ej.repeated_event(toPage)) {
			return ;
		}	

			switch (toPage) {
				case 'page-interventions' :
					ej.load_page_interventions() ;
					break ;
				case 'page-intervention' :
					ej.load_page_one_intervention() ;
					break ;
				case 'page-home' :
					ej.load_home_page() ;
					// refresh dynamically created html 
					$('#page-home').trigger('create');
					break ;
			}	
	});
	
}) ;	
	
	






