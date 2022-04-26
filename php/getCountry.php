<?php
    
    $str = file_get_contents("countryBorders.geo.json");
    $json = json_decode($str, true);
    $countries = $json["features"];
    
    $allCountries = array();
    for($i = 0; $i < sizeof($countries); $i++) {
        $country = $countries[$i];
        $countryName = $country["properties"]["name"];
        $countryCode = $country["properties"]["iso_a2"];
        $array = [$countryName, $countryCode];
        array_push($allCountries, $array);
    }

    usort($allCountries, function($a, $b) {
        return strcasecmp($a[0], $b[0]);
    });

    echo json_encode($allCountries);
    
?>