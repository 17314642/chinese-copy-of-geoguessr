let map;
let panorama;
let current_location;
let current_marker = null;
let correct_position_marker = null;
let line_between_points = null;
let current_city = document.getElementById("select-city-chooser").value;

document.getElementById("select-city-chooser").addEventListener("change", function (e) {
    current_city = e.target.value;
    set_random_coords();
});

let isDragging = false;
let previous_y = 0;
let currentHeight = "200px";

document.getElementById("resize-slider").addEventListener("mousedown", function (e) {
    isDragging = true;
    e.preventDefault();
});

document.addEventListener("mousemove", function (e) {
    if (isDragging) {
        let map_el = document.getElementById("map");
        let map_y = map_el.getBoundingClientRect().top.toFixed(0);
        let y_diff = map_y - e.pageY;

        if (previous_y > e.pageY) { // going up
            currentHeight = (parseInt(currentHeight.slice(0, -2)) + y_diff) + "px";
            map_el.style.minHeight = currentHeight;
        }
        else if (previous_y < e.pageY) { // going down
            currentHeight = (parseInt(currentHeight.slice(0, -2)) + y_diff) + "px";
            map_el.style.minHeight = currentHeight;
        }

        previous_y = e.pageY;
    }
});

document.addEventListener("mouseup", function (e) {
    isDragging = false;
    window.dispatchEvent(new Event('resize'));
});

document.addEventListener("mouseleave", function (e) {
    isDragging = false;
});

document.getElementById("guess-btn").addEventListener("click", function () {
    if (current_marker === null) {
        alert("Вы не поставили метку.");
        return;
    }

    correct_position_marker = new google.maps.Marker({
        position: current_location,
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        map: map,
    });

    line_between_points = new google.maps.Polyline({
        path: [ current_location, current_marker.position ],
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map,
    });

    let distance = haversine_distance(current_marker, correct_position_marker).toFixed(2);
    let zoom_distance = 0;

    if (distance < 5)
        zoom_distance = 15;
    else if (distance < 25)
        zoom_distance = 13;
    else if (distance < 100)
        zoom_distance = 9;
    else if (distance < 300)
        zoom_distance = 8;
    else if (distance < 600)
        zoom_distance = 7;
    else if (distance < 1200)
        zoom_distance = 6;

    document.getElementById("results-flex-container").style.display = "";
    document.getElementById("distance-from-point").innerHTML = distance;

    map.setCenter(current_location);
    map.setZoom(zoom_distance);

    document.getElementById("guess-btn").style.display = "none";
    document.getElementById("next-btn").style.display = "";
});

document.getElementById("next-btn").addEventListener("click", function () {
    set_random_coords();
});

function clear_map() {
    document.getElementById("results-flex-container").style.display = "none";
    document.getElementById("guess-btn").style.display = "";
    document.getElementById("next-btn").style.display = "none";

    if (current_marker !== null)
        current_marker.setMap(null);

    if (correct_position_marker !== null)
        correct_position_marker.setMap(null);

    if (line_between_points !== null)
        line_between_points.setMap(null);

    current_marker = null;
    correct_position_marker = null;
    line_between_points = null;
}

let number_of_calls = 0;
let random_test_markers = [];

//document.getElementById("random-test-btn").addEventListener("click", function () {
//    generate_random_markers();
//});

function generate_random_markers()
{
    if (number_of_calls == 0) {
        random_test_markers.forEach(el => {
            el.setMap(null);
        });
        random_test_markers = [];
    }

    number_of_calls += 1;

    if (number_of_calls > document.getElementById("random-test-number-of-calls").value) {
        number_of_calls = 0;
        return;
    }

    fetch("api/get_random_coordinates/" + current_city)
        .then(result => result.json())
        .then(coords => {
            let marker = new google.maps.Marker({
                position: coords,
                icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                map: map,
            });

            random_test_markers.push(marker);
            generate_random_markers();
        });
}

function set_random_coords() {
    clear_map();

    document.getElementById("guess-btn").style.backgroundColor = "gray";
    document.getElementById("guess-btn").disabled = true;

    fetch("api/get_random_coordinates/" + current_city)
        .then(result => result.json())
        .then(coords => {
            let streetview = new google.maps.StreetViewService();
            let panorama_request = {
                location: coords,
                preference: google.maps.StreetViewPreference.NEAREST,
                radius: 1000,
                source: google.maps.StreetViewSource.OUTDOOR
            };

            let find_panorama = function() {
                streetview.getPanorama(panorama_request, function(response, status) {
                    if (status == google.maps.StreetViewStatus.OK) {
                        current_location = response.location.latLng;
                        panorama.setPosition(current_location);
                    } else {
                        if (panorama_request.radius > 5000) {
                            set_random_coords(); // If radius is more than 5km, choose new location.
                        } else {
                            panorama_request.radius += 1000; // If not, just increase radius and repeat search.
                            find_panorama();
                        }
                    }
                });
            };
            find_panorama();
        });
}

function initMap() {
    let coords = { lat: 55.75, lng: 37.62 };
    map = new google.maps.Map(document.getElementById("map"), { center: coords, zoom: 8, disableDefaultUI: true });
    panorama = new google.maps.StreetViewPanorama(document.getElementById("panorama"), { disableDefaultUI: true, showRoadLabels: false });
    set_random_coords();

    google.maps.event.addListener(map, "click", (event) => {
        if (current_marker === null) {
            current_marker = new google.maps.Marker({
                position: event.latLng,
                map: map,
            });

            document.getElementById("guess-btn").style.backgroundColor = "";
            document.getElementById("guess-btn").disabled = false;

        } else if (line_between_points === null) {
            current_marker.setPosition(event.latLng);
        }
    });
}

// https://cloud.google.com/blog/products/maps-platform/how-calculate-distances-map-maps-javascript-api
function haversine_distance(mk1, mk2) {
    var R = 6371.0710; // Radius of the Earth in miles
    var rlat1 = mk1.position.lat() * (Math.PI/180); // Convert degrees to radians
    var rlat2 = mk2.position.lat() * (Math.PI/180); // Convert degrees to radians
    var difflat = rlat2-rlat1; // Radian difference (latitudes)
    var difflon = (mk2.position.lng()-mk1.position.lng()) * (Math.PI/180); // Radian difference (longitudes)

    var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat/2)*Math.sin(difflat/2)+Math.cos(rlat1)*Math.cos(rlat2)*Math.sin(difflon/2)*Math.sin(difflon/2)));
    return d;
}

window.initMap = initMap;
