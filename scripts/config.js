// config and model


var ej ; // global var 
if (!ej) ej = {} ;

//ej.SERVER_URL = "http://192.168.0.110/serclim/index.php/mobile/";
 ej.SERVER_URL = "https://centrale.serclim.fr/index.php/mobile/";
//ej.SERVER_URL = "http://localhost/serclim/index.php/mobile/";




// global var
var model = {
	statuts : {
		0 : 'En attente',
		1 : 'Avis de passage',
		2 : 'Terminé',
		3 : 'Poursuivre',
		4 : 'En pause' 
	}, 
	
	EN_ATTENTE : "0", 
	AVIS_PASSAGE : "1",
	TERMINE : "2",
	POURSUIVRE : "3",
	EN_PAUSE : "4" ,

	ID_ANALYTIQUE_INTERV_SPON : "557",

	types_intervention : {	'0' : "Visite d'entretien",
							'1' : "Dépannage",
							'2' : "Mise en service"
						}, 	

	datetime : function() {
		var da = new Date() ;
		return  da.getFullYear() + 
				'-' + (da.getMonth()+1 < 10 ? '0'+(da.getMonth()+1) : da.getMonth()+1) +
				'-' + (da.getDate() < 10 ? '0'+(da.getDate()) : da.getDate()) + 
				' ' + (da.getHours() < 10 ? '0'+(da.getHours()) : da.getHours()) +
				':' + (da.getMinutes() < 10 ? '0'+(da.getMinutes()) : da.getMinutes()) + 
				':00' ;
		},

	interventions: [
			'id_intervention', 
			'id_createur', 
			'id_analytique', 
			'id_technicien',
			'id_client',
			'date_create',
			'date_planning',
			'date_heure_debut',
			'date_heure_fin',
			'type',
			'statut',
			'observation BLOB',
			'note BLOB',
			'heure_debut_planning',
			'heure_fin_planning',
			'signature BLOB',
			'taux_horaire',
			'coeff_vente',
			'email_client'
			],
	clients: [
			'id_client',
			'id_upload',
			'id_analytique',
			'categorie',
			'nom',
			'prenom',
			'email',
			'lieu_dit',
			'rue',
			'ville',
			'phone',
			'residence'
			],
	questionnaire_intervention: [
			'id',
			'id_questionnaire',
			'id_intervention'
			],
	questionnaires: [
			'id_questionnaire',
			'nom'
			],
	questions: [
		'id_question',
		'id_questionnaire',
		'type',
		'question',
		'options',
		'reponse_standard'
		],
	reponses_questionnaire: [
		'id_question',
		'id_questionnaire_intervention',
		'question',
		'reponse',
		'id_intervention'
	],
	stock_intervention: [
		'id_stock',
		'code',
		'designation',
		'unite',
		'prix',
		'heures'
	],	
	devis_intervention: [
		'id_intervention',
		'id_client',
		'id_technicien',
		'date_create',
		'is_P3'
	],	
	lignes_devis: [
		'id_intervention',
		'designation',
		'unite',
		'prix',
		'id_stock'
	],	
	materiel_client: [
		'id_client',
		'marque',
		'type',
		'annee'
	],	

	// utilities to build SQL create 
	field_list_create : function(table) {
		var flds = this[table] ;
		return '(' + flds.join(',')  + ')' ;
	},

	// takeout eventual field types such as BLOB etc... 
	field_list : function(table) {
		var lst = [] ;
		var flds = this[table] ;
		for (var i in flds) {
			var value=flds[i] ;
			var li = value.split(' ') ;
			lst.push(li[0]) ;
		}		
		return '(' + lst.join(',')  + ')' ;
	},

	field_values : function(table, data) {
		var lst = [] ;
		var flds = this[table] ;
		for (var i in flds) {
			//  takeout eventual field types such as BLOB etc...
			var li = flds[i].split(' ') ;
			var fld = li[0] ; 
			// escape double quotes
			var v = data[fld] ;
			v =  v.replace(/"/g, '""');
			lst.push('"' + v + '"') ;
		}
		return '(' + lst.join(',')  + ')' ;
	}
	
}
