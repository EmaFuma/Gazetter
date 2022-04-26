<?php
    
    $str = file_get_contents("countryBorders.geo.json");
    $json = json_decode($str, true);
    $countries = $json["features"];
    
    $countryCode = $_REQUEST["countryCode"];

    $borders = "";
    for($i = 0; $i < sizeof($countries); $i++) {
        $country = $countries[$i];
        if($country["properties"]["iso_a2"] == $countryCode) {
            $borders = $country["geometry"];
        }
    }

    echo json_encode($borders);
    
?>