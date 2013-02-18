// Points to Istanbul.
var DEFAULT_LATLNG = new google.maps.LatLng(41.00527, 28.97696);

// Points to existing InfoWindow.
var infoWindow = null;

// The map.
var map = null;

// Click timer
var click_timer = null;

// Before displaying the info-window for adding a new marker after a click,
// we wait for this many milliseconds, just in case the user intended to
// double-click.
DBL_CLICK_DELAY_MS = 300;

function getURLParameter(name) {
  var val = RegExp(name + '=' + '(.+?)(&|$)').exec(location.search);
	if (val) {
		return decodeURI(val[1]);
	} else {
		return null;
	}
}

function initialize() {
	var lat = getURLParameter('lat');
	var lng = getURLParameter('lng');
	var zoom = getURLParameter('zoom');
	if (lat && lng) {
		// User has most likely been redirected from the sign-up flow.
		// Replay the click that prompted the sign-up link.
		latlng = new google.maps.LatLng(lat, lng);
		showMap(latlng);
		if (zoom) {
			map.setZoom(parseInt(zoom));
		}
		showForm(latlng);
		return;
	}
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			// On success, center the map on user's location.
			function(p) {
				var c = new google.maps.LatLng(p.coords.latitude, p.coords.longitude);
				showMap(c);
			},
			// On error, use the default position.
			function() {
				showMap(DEFAULT_LATLNG);
			});
	} else {
	  showMap(DEFAULT_LATLNG);
	}
}

function addMarker(latLng, marker_id) {
	var marker = new google.maps.Marker({
			position: latLng,
			map: map,
			title: "Yuruyemiyorum!"
	});
	google.maps.event.addListener(marker, "click", function(event) {
		if (infoWindow) {
			infoWindow.close();
		}
		infoWindow = new google.maps.InfoWindow({
			content: "<p>...</p>",
			position: event.latLng
		});
		infoWindow.open(map);
		loadMarker(marker_id);
	});
}

function loadMarker(marker_id) {
	$.get("/marker", { id: marker_id }, function(data) {
		infoWindow.setContent(data);
	});	
}

function showForm(latLng) {
	if (infoWindow) {
		infoWindow.close();
	}
	infoWindow = new google.maps.InfoWindow({
		content: "<p>...</p>",
		position: latLng
	});
	$.get("/xform", {
		lat: latLng.lat(),
		lng: latLng.lng(),
		zoom: map.getZoom()
	}, function(data) {
	  // Set up the target iframe to expect the response from POST.
		$("#frame").off("load");
		$("#frame").on("load", function() {
		  if (window.frame.error) {
		    infoWindow.setContent('<p>Hata: ' + window.frame.error + '</p>');
		    return;
		  }
			addMarker(latLng, window.frame.marker_id);
			loadMarker(window.frame.marker_id);
		});
		infoWindow.setContent(data);
	});
	infoWindow.open(map);
}

function showMap(position) {
	var mapOptions = {
		center: position,
		zoom: 12,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
	
	// Add click handlers for adding new points.
	google.maps.event.addListener(map, "click", function(event) {
		// Set a timer to display the form after we are almost sure that the
		// user did not actually intend to double click.
		window.clearTimeout(click_timer);
		click_timer = setTimeout(function() {
			showForm(event.latLng);
		}, DBL_CLICK_DELAY_MS);
	});
	google.maps.event.addListener(map, "dblclick", function(event) {
		// Disable the click handler which was scheduled in "click".
		window.clearTimeout(click_timer);
	});
	
	// Load the markers.
	$.get("/list", function(data) {
		for (var i = 0; i < data.length; ++i) {
			marker = data[i];
			addMarker(new google.maps.LatLng(marker.lat, marker.lng), marker.key);
		}
	});
}