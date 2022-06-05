// LOADER SPIN

$(window).on("load", function () {
  if ($("#preloader").length) {
    $("#preloader")
      .delay(1000)
      .fadeOut("slow", function () {
        $(this).remove();
      });
  }
});

// GLOBAL VARIABLES

let map;
let borders;
let nearCities;
let wikipedia;
let countryCode = "";

let borderStyle = {
  fillColor: "#eeedde",
  weight: 1,
  opacity: 0.8,
  color: "green",
  fillOpacity: 0.2,
};

let customMarker = L.ExtraMarkers.icon({
  icon: "fa-building",
  markerColor: "green",
  shape: "circle",
  prefix: "fa",
});

// MAP

$(document).ready(function () {
  map = L.map("map", {
    zoomControl: false,
  }).setView([0, 0], 1);
  new L.control.zoom({
    position: "bottomright",
  }).addTo(map);

  L.tileLayer.provider("CartoDB.Voyager").addTo(map);

  map.setMaxBounds(map.getBounds());

  borders = new L.geoJson().addTo(map);

  nearCities = L.markerClusterGroup();
  map.addLayer(nearCities);

  wikipedia = new L.featureGroup();
  map.addLayer(wikipedia);

  // EASY BUTTON SETTINGS

  function easyButtonSettings(iconColor, iconType, iconModal) {
    L.easyButton(
      `<i class="material-icons" style="color: ${iconColor}";>${iconType}</i>`,
      function () {
        $(`#${iconModal}`).modal("show");
      }, {
        position: "topleft",
      }
    ).addTo(map);
  }

  L.easyButton(
    '<i class="material-icons">refresh</i>',
    function () {
      window.location.reload();
    }, {
      position: "bottomright",
    }
  ).addTo(map);

  easyButtonSettings("blue", "info", "information");
  easyButtonSettings("green", "coronavirus", "coronavirus");
  easyButtonSettings("grey", "wb_cloudy", "forecast");
  easyButtonSettings("black", "newspaper", "news");
  easyButtonSettings("brown", "photo_camera", "images");

  getCodes();
  getLocation();
});

// ADDING COUNTRY NAME TO SELECT ELEMENT

function getCodes() {
  $.ajax({
    method: "GET",
    url: "php/getCountry.php",
    dataType: "json",
    success: function (result) {
      let items = result;
      for (let item of items) {
        $("#countries").append(
          $("<option>", {
            value: item[1],
            text: item[0],
          })
        );
      }
    },
    error: function () {
      console.log("There was a problem getting the codes.");
    }
  });
}

// GET USER LOCATION

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition);
  } else {
    alert("Position unavailable!");
  }
}

function showPosition(position) {
  const currentLatitude = position.coords.latitude;
  const currentLongitude = position.coords.longitude;

  $.ajax({
    url: "php/getCountryCode.php",
    type: "GET",
    dataType: "json",
    data: {
      lat: currentLatitude,
      lng: currentLongitude,
    },
    success: function (result) {
      const isoCode = result.data.countryCode;
      $("#countries").val(isoCode);
      focus(isoCode);
    },
    error: function () {
      console.log("There was a problem getting the positions.");
    }
  });
}

// CLICK EVENT ON SELECT ELEMENT

$("#countries").on("change", function () {
  const value = this.value;
  focus(value);
});

// FOCUS ON COUNTRY

function focus(isoCode) {
  if (isoCode == "") return;
  countryCode = isoCode;
  getBorders(isoCode);
  getCountryInfo(isoCode);
}

// CONVERT A NUMBER LIKE 66488991 INTO 66.488.991

function numberWithPoint(num) {
  return num.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ".");
}

// GET COUNTRY INFORMATION

function getCountryInfo(isoCode) {
  $.ajax({
    url: "php/getCountryInfo.php",
    type: "GET",
    dataType: "json",
    data: {
      country: isoCode,
    },
    success: function (result) {
      const info = result.data[0];
      const name = info.countryName;
      $("#countryName").html(name);
      $("#capitalName").html(info.capital);
      $("#currency").html(info.currencyCode);
      $("#population").html(numberWithPoint(info.population));
      $("#countryForecast").html(name + " Weather Forecast");
      $("#covidStats").html(name + " Covid Statistics");
      $("#newsTitle").html(name + " News");
      $("#imageTitle").html(name + " Images");
      getNews(name);
      getImages(name);
    },
    error: function () {
      console.log("There was a problem getting the country info.");
    }
  });
}

// GET BORDERS

function getBorders(isoCode) {
  $.ajax({
    url: "php/getBorders.php",
    type: "GET",
    dataType: "json",
    data: {
      countryCode: isoCode,
    },
    success: function (result) {
      borders.clearLayers();
      borders.addData(result).setStyle(borderStyle);
      const bounds = borders.getBounds();
      map.fitBounds(bounds);

      const code = isoCode;
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const west = bounds.getWest();
      const east = bounds.getEast();

      let lat;
      let lng;

      if ((north > 0 && south > 0) || (north < 0 && south < 0)) {
        lat = (north + south) / 2;
      } else if ((north > 0 && south < 0) || (north < 0 && south > 0)) {
        lat = (north - south) / 2;
      }

      if ((west > 0 && east > 0) || (west < 0 && east < 0)) {
        lng = (west + east) / 2;
      } else if ((west > 0 && east < 0) || (west < 0 && east > 0)) {
        lng = (west - east) / 2;
      }

      getCities(north, south, west, east, code);
      getWeather(lat, lng);
      getLinks(north, south, west, east, code);
      getCovidStats(code);
    },
    error: function () {
      console.log("There was a problem getting the country borders.");
    }
  });
}

// GET COUNTRY CITIES

function getCities(north, south, west, east, code) {
  nearCities.clearLayers();
  $.ajax({
    url: "php/getCities.php",
    type: "GET",
    dataType: "json",
    data: {
      north: north,
      south: south,
      west: west,
      east: east,
    },
    success: function (result) {
      const location = result.data.geonames;
      if (!location) {
        alert(
          "No locations available at the moment! Use buttons for more information"
        );
        return;
      } else {
        for (let i = 0; i < location.length; i++) {
          if (location[i].countrycode !== code) {
            continue;
          }
          const marker = L.marker([location[i].lat, location[i].lng], {
            icon: customMarker,
          }).bindPopup(
            "<b>" +
            location[i].name +
            "</b><br>Population: " +
            parseInt(location[i].population).toLocaleString("en")
          );
          nearCities.addLayer(marker);
        }
      }
    },
    error: function () {
      console.log("There was a problem getting the cities.");
    }
  });
}

// GET WEATHER

function getWeather(lat, lng) {
  $("#dailyForecast").html("");
  $.ajax({
    url: "php/getWeather.php",
    type: "GET",
    dataType: "json",
    data: {
      lat: lat,
      lng: lng,
    },
    success: function (result) {
      let iconUrl = "https://openweathermap.org/img/w/";
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      if (result.data.daily.length == 0) {
        $("#modalForecast").html(
          "<h5>No Weather Forecast Available!, Sorry for the trouble.</h5>"
        );
        return;
      } else {
        for (let i = 0; i < 5; i++) {
          const d = result.data.daily[i];
          const day = days[new Date(d.dt * 1000).getDay()];
          $("#dailyForecast").append(
            "<tr><td>" +
            day +
            "</td><td>" +
            parseInt(d["temp"]["max"]) +
            "°" +
            "/ " +
            parseInt(d["temp"]["min"]) +
            "°" +
            "</td><td>" +
            d.weather[0].description +
            "</td><td><img src='" +
            iconUrl +
            d.weather[0].icon +
            ".png" +
            "'></td></tr>"
          );
        }
      }
    },
    error: function () {
      console.log("There was a problem getting the weather.");
    }
  });
}

// GET WIKIPEDIA LINKS

function getLinks(north, south, west, east, code) {
  $.ajax({
    url: "php/getLinks.php",
    type: "GET",
    dataType: "json",
    data: {
      north: north,
      south: south,
      west: west,
      east: east,
    },
    success: function (result) {
      const location = result.data.geonames;
      let wiki;
      if (location.length == 0) {
        wiki = "No links available!";
        return;
      } else {
        for (let i = 0; i < location.length; i++) {
          if (location[i].countryCode !== code) {
            continue;
          } else if (!location[i].countryCode) {
            wiki = "http://" + location[i].wikipediaUrl;
          } else {
            wiki = "http://" + location[i].wikipediaUrl;
          }
        }
        $("#link").attr("href", wiki);
      }
    },
    error: function () {
      console.log("There was a problem getting the links.");
    }
  });
}

// GET COVID STATS

function getCovidStats(countryCode) {
  $.ajax({
    url: "php/getCovidInfo.php",
    type: "GET",
    dataType: "json",
    data: {
      countryCode: countryCode,
    },
    success: function (result) {
      const data = result.data;
      $("#newCases").html(numberWithPoint(data.todayCases));
      $("#newDeath").html(numberWithPoint(data.todayDeaths));
      $("#newRecovered").html(numberWithPoint(data.todayRecovered));
      $("#totalCases").html(numberWithPoint(data.cases));
      $("#totalDeaths").html(numberWithPoint(data.deaths));
      $("#totalRecovered").html(numberWithPoint(data.recovered));
    },
    error: function () {
      console.log("There was a problem getting the covid stats.");
    }
  });
}

// GET NEWS

function getNews(country) {
  $("#newsBody").html("");
  $.ajax({
    url: "php/getNews.php",
    type: "GET",
    dataType: "json",
    data: {
      countryName: country,
    },
    success: function (result) {
      const data = result.data.articles;
      if (data.length == 0) {
        $("#newsBody").html("<h5>No News Found! Sorry for the trouble.</h5>");
        return;
      } else {
        for (let i = 0; i < 4; i++) {
          $("#newsBody").append(addNews(data[i]));
        }
      }
    },
    error: function () {
      console.log("There was a problem getting the news.");
    }
  });
}

// CREATE CARD FOR HOLDING THE NEWS

function addNews(data) {
  const author = data.author == null ? "Author Unknown" : data.author;
  const card =
    '<div class="card" style="width: 18rem;"> <img class="card-img-top" src="' +
    data.urlToImage +
    '" alt="News Image"> <div class="card-body"> <h5 class="card-title">' +
    author +
    '</h5> <p class="card-text">' +
    data.title +
    '</p> <a href="' +
    data.url +
    '" target="_blank" class="btn btn-dark">Details</a> </div> </div>';
  return card;
}

// GET IMAGES

function getImages(country) {
  $("#imagesBody").html("");
  $.ajax({
    url: "php/getImages.php",
    type: "GET",
    dataType: "json",
    data: {
      countryName: country,
    },
    success: function (result) {
      const images = result.data.hits;
      if (images.length == 0) {
        $("#imagesBody").html(
          "<h5>No Images Found! Sorry for the trouble.</h5>"
        );
        return;
      } else {
        for (let i = 0; i < 5; i++) {
          $("#imagesBody").append(
            "<img class='countryImage' src=" +
            images[i].webformatURL +
            " alt='Country Image'>"
          );
        }
      }
    },
    error: function () {
      console.log("There was a problem getting the images.");
    }
  });
}