// Points to Istanbul.
var DEFAULT_LATLNG = new google.maps.LatLng(41.00527, 28.97696);

// Points to existing InfoWindow.
var infoWindow = null;

// The map.
var map = null;

function initialize() {
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

function showMap(position) {
	var mapOptions = {
		center: position,
		zoom: 12,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
	
	// Add click handlers for adding new points.
	google.maps.event.addListener(map, "click", function(event) {
		if (infoWindow) {
			infoWindow.close();
		}
		infoWindow = new google.maps.InfoWindow({
			content: "<p>...</p>",
			position: event.latLng
		});
		$.get("/xform", { lat: event.latLng.lat(), lng: event.latLng.lng() },
		      function(data) {
			$("#frame").off("load");
			$("#frame").on("load", function() {
				addMarker(event.latLng, window.frame.marker_id);
				loadMarker(window.frame.marker_id);
			});
			infoWindow.setContent(data);
		});
		infoWindow.open(map);
	});
	
	// Load the markers.
	$.get("/list", function(data) {
		for (var i = 0; i < data.length; ++i) {
			marker = data[i];
			addMarker(new google.maps.LatLng(marker.lat, marker.lng), marker.key);
		}
	});
}