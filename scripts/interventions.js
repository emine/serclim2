
ej.load_page_interventions = function(search) {

	var mydate = new Date() ;
	console.log('INTERVENTIONS date ' + mydate.valueOf()) ;

	// first remove the whole list		
	$("#list-interventions li").remove() ;

	var sql = 'SELECT DISTINCT i.id_intervention, i.type, i.statut, i.date_planning, i.heure_debut_planning, i.heure_fin_planning, i.note, i.id_analytique, ' ; 
	sql += ' c.nom, c.prenom, c.phone, c.rue, c.lieu_dit, c.residence, c.ville, c.email ' ;
	sql += 	' FROM interventions i, clients c WHERE i.id_client=c.id_client ' ;
	if (search != undefined && search != "") {
		sql += " AND (c.nom like '%" + search + "%' OR c.rue like '%" + search + "%' OR c.lieu_dit like '%" + search + "%' OR c.residence like '%" + search + 
				"%' OR c.ville like '%" + search + "%' OR c.phone like '%" + search + "%')" ;
	}	   
	sql += ' ORDER BY i.date_planning, i.heure_debut_planning ' ;
	
	// get from db
	ej.db.transaction(function (tx) {
		tx.executeSql(sql, [], function (tx, results) {
			for (var i = 0; i < results.rows.length; i++) {
				var data = results.rows.item(i) ;
				var header = '<strong class="ej-alter">Intervention ' + data.id_intervention + '</strong><br>' ; 
				header += '<span class="ej-alter">' + model.types_intervention[data.type] + '</span><br>' ;
				header += '<strong>' + data.nom + ' ' + data.prenom +'</strong>&nbsp;&nbsp;' + '<span class="ej-alter">' + data.phone + '</span>'  ; 
				header += '<span class="ej-statut">' + model.statuts[data.statut] +' </span>' ;
				var body = data.rue + ' ' + data.lieu_dit + ' ' + data.residence + '<br>' + data.ville + '&nbsp;<span class="ej-alter">' + data.email + '</span>'  ; 
				body += '<br><br>Date planifiée : <strong>' + data.date_planning + ' de ' + data.heure_debut_planning + 'H à ' + data.heure_fin_planning + 'H</strong>';
				body += "<br> Note: " + data.note ;

				var btn_start = '<button ej-attr="' + data.id_intervention+'"  class="ej-start ui-btn ui-btn-inline ui-corner-all ui-shadow ui-btn-active">Commencer intervention</a>' ;
				var btn_continue = '<button ej-attr="' + data.id_intervention+'"  class="ej-start ui-btn ui-btn-inline ui-corner-all ui-shadow ui-btn-active">Continuer intervention</a>' ;
				
				var btn_fail = '<button ej-attr="' + data.id_intervention+'"  class="ej-fail ui-btn ui-btn-inline ui-corner-all ui-shadow ui-btn-active">Avis de passage</button>'
	
				// pas d'avis de passage pour les interventions spntanees	
				if (data.id_analytique == model.ID_ANALYTIQUE_INTERV_SPON) {
					btn_fail = '' ;
				}
					
				$("#list-interventions").append(
					'<li>'  + 
					header + '<br>' + body + '<br>' + 
					(data.statut == model.EN_ATTENTE ? btn_start + btn_fail : (data.statut == model.EN_PAUSE ? btn_continue + btn_fail : '')) +
				//	btn_start + btn_fail +
					'</li>') ;
			}
			$('#list-interventions').listview('refresh');
		})
	})		
}			




$( document ).on( "pagecreate", "#page-interventions", function() {

	// ej.load_page_interventions() ;

	// use delegation
	$("#page-interventions").on( "click", ".ej-start", function() {
		id_intervention = $(this).attr('ej-attr') ;
		var datetime = model.datetime() ;
		ej.db.transaction(function (tx) {
			tx.executeSql('UPDATE interventions SET date_heure_debut = ? WHERE id_intervention = ? AND statut = ?', [datetime, id_intervention,model.EN_ATTENTE], function (tx, results) {
				localStorage['id_intervention'] = id_intervention ;
				$( ":mobile-pagecontainer" ).pagecontainer( "change", "#page-intervention");
			})
		})		
	})	

	
	
	$("#page-interventions").on( "click", ".ej-fail", function() {
		id_intervention = $(this).attr('ej-attr') ;
		var datetime = model.datetime() ;
		ej.db.transaction(function (tx) {
			tx.executeSql('UPDATE interventions SET statut = ?, date_heure_debut = ?, date_heure_fin = ? WHERE id_intervention = ?', 
				[model.AVIS_PASSAGE, datetime, datetime, id_intervention], function (tx, results) {
				// reload page - TODO a better way ?
				//$( ":mobile-pagecontainer" ).pagecontainer( "change", "#page-interventions");
				// TODO test that
				//$('#page-interventions').trigger('create');
				ej.load_page_interventions() ;
			})
		})
	})
	
	$("#page-interventions").on("keyup", "#search", function() {
 		var search = $(this).val() ; 
//		if (search.length > 2 || search.length == 0 ) {
			ej.load_page_interventions(search) ;
//		}
	})		 
			
		
	

})
