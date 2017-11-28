// script for login page
// this is where the sync logic happens !!!
// upload interventions
// download stock files (TODO)


$( document ).on( "pagecreate", "#page-login", function() {

	$("#page-login #btn-login").click(function(e) {
		e.preventDefault() ;
		
		$.ajax({
			type: "POST",
			url: ej.SERVER_URL + "login",
			data: $("#form-login").serialize() ,
			dataType: "json"
		}).done( function(data) {
			if (!data.success) {
				alert("Echec de l'authentification") ;
			} else {
				if (data.utilisateur.role != ej.global.allowed_role) {
					alert("Accès réservé aux " + (ej.global.allowed_role == '10' ? "techniciens" : "superviseurs")) ;
				} else {
					localStorage['utilisateur'] = JSON.stringify(data.utilisateur) ;
					if (!ej.global.SYNC_ON_GOING) {
						$.mobile.loading( "show") ;
						ej.synchronize(data.utilisateur.id_utilisateur, 'read', function(msg) {
								// OK goto home page (menu)
								ej.global.SYNC_ON_GOING = false ;
								$.mobile.loading( "hide") ;
								console.log(msg) ;
								$( ":mobile-pagecontainer" ).pagecontainer( "change", "#page-home");
						}) ;
					}
				}	
			}	
		});
	})	
	
	
})
