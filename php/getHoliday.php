<?php

    ini_set('display_errors', "On");
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    $country = $_REQUEST["country"];

    $url = "https://holidays.abstractapi.com/v1/?api_key=829e8e26426c40ce83e36606d1318dac&country=" . $country . "&year=2022";


    $ch = curl_init();
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_URL, $url);

    $result = curl_exec($ch);

    curl_close($ch);

    $decode = json_decode($result, true);

    $output["status"]["code"] = "200";
    $output["status"]["name"] = "ok";
    $output["status"]["description"] = "success";
    $output["status"]["returnedIn"] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
    $output["data"] = $decode;

    header("Content-Type: application/json; charset=UTF-8");

    echo json_encode($output);
?>